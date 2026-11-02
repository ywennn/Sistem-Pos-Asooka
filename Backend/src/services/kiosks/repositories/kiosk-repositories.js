import pool from "../../../config/database.js";

class KioskRepository {
  // ================= KIOSK DEVICES =================
  async registerDevice({ deviceName, deviceCode, deviceTokenHash, deviceType }) {
    const query = `
      INSERT INTO kiosk_devices (device_name, device_code, device_token_hash, device_type, last_seen_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    const values = [deviceName, deviceCode, deviceTokenHash || null, deviceType];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async getAllDevices({ type, isActive } = {}) {
    let query = "SELECT * FROM kiosk_devices WHERE 1=1";
    const values = [];

    if (type) {
      values.push(type);
      query += ` AND device_type = $${values.length}`;
    }

    if (isActive !== undefined) {
      values.push(isActive);
      query += ` AND is_active = $${values.length}`;
    }

    query += " ORDER BY created_at DESC";
    const { rows } = await pool.query(query, values);
    return rows;
  }

  async getDeviceById(id) {
    const query = "SELECT * FROM kiosk_devices WHERE id = $1";
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  async getDeviceByCode(deviceCode) {
    const query = "SELECT * FROM kiosk_devices WHERE device_code = $1";
    const { rows } = await pool.query(query, [deviceCode]);
    return rows[0];
  }

  async updateDeviceLastSeen(id) {
    const query = `
      UPDATE kiosk_devices
      SET last_seen_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  async updateDevice(id, { deviceName, deviceType, isActive }) {
    const query = `
      UPDATE kiosk_devices
      SET device_name = COALESCE($1, device_name),
          device_type = COALESCE($2, device_type),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    const values = [
      deviceName || null,
      deviceType || null,
      isActive !== undefined ? isActive : null,
      id,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async deleteDevice(id) {
    const query = "UPDATE kiosk_devices SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *";
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  // ================= KIOSK SESSIONS =================
  async startSession({ cashierDeviceId, customerDeviceId, cashierId }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Akhiri sesi lama yang masih aktif pada tablet pelanggan ini
      await client.query(
        `UPDATE kiosk_sessions
         SET status = 'ENDED', ended_at = NOW()
         WHERE (customer_device_id = $1 OR cashier_device_id = $2) AND status = 'ACTIVE'`,
        [customerDeviceId, cashierDeviceId]
      );

      // Buat sesi baru
      const insertSessionQuery = `
        INSERT INTO kiosk_sessions (cashier_device_id, customer_device_id, cashier_id, status, started_at)
        VALUES ($1, $2, $3, 'ACTIVE', NOW())
        RETURNING *
      `;
      const { rows: sessionRows } = await client.query(insertSessionQuery, [
        cashierDeviceId,
        customerDeviceId,
        cashierId,
      ]);
      const session = sessionRows[0];

      // Inisialisasi kiosk_states default
      const defaultState = {
        currentPage: "/catalog",
        scrollPosition: { x: 0, y: 0 },
        selectedCategoryId: null,
        cart: [],
        checkoutStep: "CATALOG",
        customerInfo: {},
        updatedAt: new Date().toISOString(),
      };

      const insertStateQuery = `
        INSERT INTO kiosk_states (session_id, state_data, version, updated_at)
        VALUES ($1, $2, 1, NOW())
        RETURNING *
      `;
      const { rows: stateRows } = await client.query(insertStateQuery, [
        session.id,
        JSON.stringify(defaultState),
      ]);

      await client.query("COMMIT");
      return {
        ...session,
        state: stateRows[0],
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getActiveSessionById(id) {
    const query = `
      SELECT ks.*,
             cd.device_name AS cashier_device_name,
             cud.device_name AS customer_device_name,
             u.name AS cashier_name
      FROM kiosk_sessions ks
      JOIN kiosk_devices cd ON ks.cashier_device_id = cd.id
      JOIN kiosk_devices cud ON ks.customer_device_id = cud.id
      JOIN users u ON ks.cashier_id = u.id
      WHERE ks.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  async getActiveSessionForCustomer(customerDeviceId) {
    const query = `
      SELECT ks.*,
             cd.device_name AS cashier_device_name,
             cud.device_name AS customer_device_name,
             u.name AS cashier_name
      FROM kiosk_sessions ks
      JOIN kiosk_devices cd ON ks.cashier_device_id = cd.id
      JOIN kiosk_devices cud ON ks.customer_device_id = cud.id
      JOIN users u ON ks.cashier_id = u.id
      WHERE ks.customer_device_id = $1 AND ks.status = 'ACTIVE'
      ORDER BY ks.started_at DESC
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [customerDeviceId]);
    return rows[0];
  }

  async getActiveSessionForCashier(cashierDeviceId) {
    const query = `
      SELECT ks.*,
             cd.device_name AS cashier_device_name,
             cud.device_name AS customer_device_name,
             u.name AS cashier_name
      FROM kiosk_sessions ks
      JOIN kiosk_devices cd ON ks.cashier_device_id = cd.id
      JOIN kiosk_devices cud ON ks.customer_device_id = cud.id
      JOIN users u ON ks.cashier_id = u.id
      WHERE ks.cashier_device_id = $1 AND ks.status = 'ACTIVE'
      ORDER BY ks.started_at DESC
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [cashierDeviceId]);
    return rows[0];
  }

  async endSession(id) {
    const query = `
      UPDATE kiosk_sessions
      SET status = 'ENDED', ended_at = NOW()
      WHERE id = $1 AND status = 'ACTIVE'
      RETURNING *
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  // ================= KIOSK STATES =================
  async getStateBySessionId(sessionId) {
    const query = "SELECT * FROM kiosk_states WHERE session_id = $1";
    const { rows } = await pool.query(query, [sessionId]);
    return rows[0];
  }

  async saveState(sessionId, stateData) {
    const query = `
      INSERT INTO kiosk_states (session_id, state_data, version, updated_at)
      VALUES ($1, $2, 1, NOW())
      ON CONFLICT (session_id)
      DO UPDATE SET
        state_data = $2,
        version = kiosk_states.version + 1,
        updated_at = NOW()
      RETURNING *
    `;
    const { rows } = await pool.query(query, [sessionId, JSON.stringify(stateData)]);
    return rows[0];
  }
}

export default new KioskRepository();
