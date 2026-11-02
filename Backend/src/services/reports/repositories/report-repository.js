import pool from "../../../config/database.js";

class ReportRepository {
  buildDateConditions(startDate, endDate, startIndex = 1, column = "o.paid_at") {
    let condition = "";
    const params = [];
    let idx = startIndex;

    if (startDate) {
      condition += ` AND ${column} >= $${idx}`;
      params.push(startDate);
      idx++;
    }
    if (endDate) {
      condition += ` AND ${column} <= $${idx}`;
      params.push(endDate);
      idx++;
    }

    return { condition, params, nextIndex: idx };
  }

  async getDashboardSummary({ startDate, endDate }) {
    const { condition, params } = this.buildDateConditions(startDate, endDate, 1, "o.paid_at");

    const query = `
      SELECT
        COALESCE(SUM(o.total_amount), 0)::numeric(12,2) AS total_revenue,
        COUNT(DISTINCT o.id)::int AS total_transactions,
        COALESCE(SUM(oi.quantity), 0)::int AS total_items_sold,
        COALESCE(ROUND(AVG(o.total_amount), 2), 0)::numeric(12,2) AS average_order_value
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status = 'PAID'
      ${condition}
    `;

    const { rows } = await pool.query(query, params);
    return rows[0];
  }

  async getSalesReport({ startDate, endDate }) {
    const { condition, params } = this.buildDateConditions(startDate, endDate, 1, "o.paid_at");

    const query = `
      SELECT
        TO_CHAR(o.paid_at, 'YYYY-MM-DD') AS date,
        COUNT(DISTINCT o.id)::int AS total_transactions,
        COALESCE(SUM(oi.quantity), 0)::int AS total_items_sold,
        COALESCE(SUM(o.total_amount), 0)::numeric(12,2) AS total_revenue
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status = 'PAID'
      ${condition}
      GROUP BY TO_CHAR(o.paid_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async getBestSellingProducts({ startDate, endDate, limit = 10 }) {
    const { condition, params, nextIndex } = this.buildDateConditions(startDate, endDate, 1, "o.paid_at");
    params.push(limit);

    const query = `
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        c.name AS category_name,
        p.price::numeric(12,2) AS product_price,
        COALESCE(SUM(oi.quantity), 0)::int AS total_sold,
        COALESCE(SUM(oi.subtotal), 0)::numeric(12,2) AS total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE o.status = 'PAID'
      ${condition}
      GROUP BY p.id, p.name, c.name, p.price
      ORDER BY total_sold DESC
      LIMIT $${nextIndex}
    `;

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async getPaymentMethodStats({ startDate, endDate }) {
    const { condition, params } = this.buildDateConditions(startDate, endDate, 1, "p.paid_at");

    const query = `
      SELECT
        p.payment_method,
        COUNT(p.id)::int AS transaction_count,
        COALESCE(SUM(p.amount), 0)::numeric(12,2) AS total_amount,
        COALESCE(ROUND((SUM(p.amount) * 100.0 / NULLIF(SUM(SUM(p.amount)) OVER(), 0)), 2), 0)::numeric(5,2) AS percentage
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.payment_status = 'PAID'
      ${condition}
      GROUP BY p.payment_method
      ORDER BY total_amount DESC
    `;

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async getTransactionHistory({ startDate, endDate, limit = 50, offset = 0 }) {
    const { condition, params, nextIndex } = this.buildDateConditions(startDate, endDate, 1, "o.paid_at");
    params.push(limit, offset);

    const query = `
      SELECT
        o.id AS order_id,
        o.order_number,
        o.customer_name,
        o.source,
        o.status AS order_status,
        o.total_amount,
        o.paid_at,
        p.payment_method,
        p.payment_status,
        u.name AS cashier_name,
        COALESCE(SUM(oi.quantity), 0)::int AS total_items
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id AND p.payment_status = 'PAID'
      LEFT JOIN users u ON o.cashier_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status = 'PAID'
      ${condition}
      GROUP BY o.id, o.order_number, o.customer_name, o.source, o.status, o.total_amount, o.paid_at, p.payment_method, p.payment_status, u.name
      ORDER BY o.paid_at DESC
      LIMIT $${nextIndex} OFFSET $${nextIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT o.id)::int AS total_count
      FROM orders o
      WHERE o.status = 'PAID'
      ${condition}
    `;

    const { rows } = await pool.query(query, params);
    const { rows: countRows } = await pool.query(countQuery, params.slice(0, nextIndex - 1));

    return {
      transactions: rows,
      totalCount: countRows[0]?.total_count || 0,
    };
  }
}

export default new ReportRepository();
