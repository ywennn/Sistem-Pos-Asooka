/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // 1. payments
  pgm.createTable("payments", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    order_id: {
      type: "uuid",
      notNull: true,
      references: '"orders"',
      onDelete: "CASCADE",
    },
    payment_method: {
      type: "varchar(20)",
      notNull: true, // CASH, QRIS
    },
    payment_provider: {
      type: "varchar(30)",
      notNull: true,
      default: "CASH", // CASH, MIDTRANS
    },
    payment_status: {
      type: "varchar(30)",
      notNull: true,
      default: "PENDING", // PENDING, PENDING_CONFIRMATION, PAID, REJECTED, EXPIRED, FAILED
    },
    amount: {
      type: "numeric(12, 2)",
      notNull: true,
    },
    transaction_id: {
      type: "varchar(100)",
      notNull: false,
    },
    payment_reference: {
      type: "varchar(100)",
      notNull: false,
    },
    qr_code_url: {
      type: "text",
      notNull: false,
    },
    qr_code_string: {
      type: "text",
      notNull: false,
    },
    expires_at: {
      type: "timestamptz",
      notNull: false,
    },
    paid_at: {
      type: "timestamptz",
      notNull: false,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // 2. payment_webhook_events
  pgm.createTable("payment_webhook_events", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    payment_id: {
      type: "uuid",
      notNull: false,
      references: '"payments"',
      onDelete: "SET NULL",
    },
    event_type: {
      type: "varchar(50)",
      notNull: true,
    },
    transaction_id: {
      type: "varchar(100)",
      notNull: false,
    },
    payload: {
      type: "jsonb",
      notNull: true,
    },
    is_processed: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    received_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    processed_at: {
      type: "timestamptz",
      notNull: false,
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("payment_webhook_events");
  pgm.dropTable("payments");
};
