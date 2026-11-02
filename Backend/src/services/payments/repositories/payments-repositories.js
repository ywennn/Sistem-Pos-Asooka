import pool from "../../../config/database.js";

class PaymentRepository {
  async createPayment({
    orderId,
    paymentMethod,
    paymentProvider,
    paymentStatus = "PENDING",
    amount,
    transactionId = null,
    paymentReference = null,
    qrCodeUrl = null,
    qrCodeString = null,
    expiresAt = null,
  }) {
    const query = `
      INSERT INTO payments (
        order_id, payment_method, payment_provider, payment_status,
        amount, transaction_id, payment_reference, qr_code_url,
        qr_code_string, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      orderId,
      paymentMethod,
      paymentProvider,
      paymentStatus,
      amount,
      transactionId,
      paymentReference,
      qrCodeUrl,
      qrCodeString,
      expiresAt,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async getPaymentById(id) {
    const query = `
      SELECT p.*,
             o.order_number,
             o.customer_name,
             o.kiosk_session_id
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  async getPaymentByOrderId(orderId) {
    const query = `
      SELECT p.*,
             o.order_number,
             o.customer_name,
             o.kiosk_session_id
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.order_id = $1
      ORDER BY p.created_at DESC
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [orderId]);
    return rows[0];
  }

  async getPaymentByReference(paymentReference) {
    const query = `
      SELECT p.*,
             o.order_number,
             o.customer_name,
             o.kiosk_session_id
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.payment_reference = $1 OR o.order_number = $1
      ORDER BY p.created_at DESC
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [paymentReference]);
    return rows[0];
  }

  /**
   * Mengubah status pembayaran dan secara atomik menyinkronkan status pesanan
   */
  async updatePaymentStatus(id, { paymentStatus, transactionId = null, paidAt = null }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let extraPaidAt = "";
      if (paymentStatus === "PAID") {
        extraPaidAt = ", paid_at = COALESCE(paid_at, NOW())";
      }

      const updatePaymentQuery = `
        UPDATE payments
        SET payment_status = $1,
            transaction_id = COALESCE($2, transaction_id),
            updated_at = NOW()
            ${extraPaidAt}
        WHERE id = $3
        RETURNING *
      `;
      const { rows: paymentRows } = await client.query(updatePaymentQuery, [
        paymentStatus,
        transactionId,
        id,
      ]);
      const payment = paymentRows[0];

      if (!payment) {
        await client.query("ROLLBACK");
        return null;
      }

      // Sinkronkan status pada tabel orders
      if (paymentStatus === "PAID") {
        await client.query(
          `UPDATE orders
           SET status = 'PAID',
               paid_at = COALESCE(paid_at, NOW()),
               updated_at = NOW()
           WHERE id = $1`,
          [payment.order_id]
        );
      } else if (["REJECTED", "FAILED", "EXPIRED"].includes(paymentStatus)) {
        await client.query(
          `UPDATE orders
           SET status = 'CANCELLED',
               cancelled_at = COALESCE(cancelled_at, NOW()),
               updated_at = NOW()
           WHERE id = $1 AND status = 'PENDING'`,
          [payment.order_id]
        );
      }

      await client.query("COMMIT");
      return this.getPaymentById(id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // ================= WEBHOOK LOGS =================
  async saveWebhookEvent({ paymentId, eventType, transactionId, payload, isProcessed = false }) {
    const query = `
      INSERT INTO payment_webhook_events (
        payment_id, event_type, transaction_id, payload, is_processed, received_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    const values = [paymentId || null, eventType, transactionId || null, JSON.stringify(payload), isProcessed];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async isWebhookProcessed(transactionId, eventType) {
    if (!transactionId) return false;
    const query = `
      SELECT id FROM payment_webhook_events
      WHERE transaction_id = $1 AND event_type = $2 AND is_processed = true
    `;
    const { rows } = await pool.query(query, [transactionId, eventType]);
    return rows.length > 0;
  }

  async markWebhookProcessed(webhookId) {
    const query = `
      UPDATE payment_webhook_events
      SET is_processed = true, processed_at = NOW()
      WHERE id = $1
    `;
    await pool.query(query, [webhookId]);
  }
}

export default new PaymentRepository();
