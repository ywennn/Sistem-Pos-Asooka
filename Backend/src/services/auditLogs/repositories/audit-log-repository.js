import pool from "../../../config/database.js";

class AuditLogRepository {
  async createLog({
    userId = null,
    action,
    module,
    entityType = null,
    entityId = null,
    description = null,
    oldData = null,
    newData = null,
    ipAddress = null,
    userAgent = null,
  }) {
    const query = `
      INSERT INTO audit_logs (
        user_id, action, module, entity_type, entity_id,
        description, old_data, new_data, ip_address, user_agent, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `;

    // Pastikan valid IP atau null untuk PostgreSQL inet type
    let validIp = null;
    if (ipAddress && ipAddress !== "::1" && ipAddress !== "127.0.0.1") {
      validIp = ipAddress.replace(/^.*:/, ""); // Sanitasi IPv4-mapped IPv6 jika ada
    } else if (ipAddress === "127.0.0.1" || ipAddress === "::1") {
      validIp = "127.0.0.1";
    }

    const values = [
      userId || null,
      action,
      module,
      entityType || null,
      entityId || null,
      description || null,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      validIp,
      userAgent || null,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async getLogs({
    userId,
    action,
    module,
    entityType,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = {}) {
    let query = `
      SELECT al.*,
             u.name AS user_name,
             u.email AS user_email,
             u.role AS user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const values = [];

    if (userId) {
      values.push(userId);
      query += ` AND al.user_id = $${values.length}`;
    }
    if (action) {
      values.push(action);
      query += ` AND al.action = $${values.length}`;
    }
    if (module) {
      values.push(module);
      query += ` AND al.module = $${values.length}`;
    }
    if (entityType) {
      values.push(entityType);
      query += ` AND al.entity_type = $${values.length}`;
    }
    if (startDate) {
      values.push(startDate);
      query += ` AND al.created_at >= $${values.length}`;
    }
    if (endDate) {
      values.push(endDate);
      query += ` AND al.created_at <= $${values.length}`;
    }

    const countQuery = `
      SELECT COUNT(al.id)::int AS total
      FROM audit_logs al
      WHERE 1=1
      ${query.substring(query.indexOf("WHERE 1=1") + 9)}
    `;

    query += ` ORDER BY al.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const queryValues = [...values, limit, offset];

    const { rows } = await pool.query(query, queryValues);
    const { rows: countRows } = await pool.query(countQuery, values);

    return {
      logs: rows,
      total: countRows[0]?.total || 0,
    };
  }

  async getLogById(id) {
    const query = `
      SELECT al.*,
             u.name AS user_name,
             u.email AS user_email,
             u.role AS user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  async getDistinctFilters() {
    const modulesQuery = `SELECT DISTINCT module FROM audit_logs ORDER BY module ASC`;
    const actionsQuery = `SELECT DISTINCT action FROM audit_logs ORDER BY action ASC`;

    const { rows: moduleRows } = await pool.query(modulesQuery);
    const { rows: actionRows } = await pool.query(actionsQuery);

    return {
      modules: moduleRows.map((r) => r.module),
      actions: actionRows.map((r) => r.action),
    };
  }
}

export default new AuditLogRepository();
