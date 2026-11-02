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
  // 1. orders
  pgm.createTable("orders", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    order_number: {
      type: "varchar(30)",
      notNull: true,
      unique: true,
    },
    customer_name: {
      type: "varchar(100)",
      notNull: false,
      default: "Pelanggan",
    },
    source: {
      type: "varchar(30)",
      notNull: true,
      default: "CASHIER",
    },
    status: {
      type: "varchar(30)",
      notNull: true,
      default: "PENDING", // PENDING, PAID, PROCESSING, COMPLETED, CANCELLED
    },
    subtotal: {
      type: "numeric(12, 2)",
      notNull: true,
      default: 0,
    },
    discount_amount: {
      type: "numeric(12, 2)",
      notNull: true,
      default: 0,
    },
    tax_amount: {
      type: "numeric(12, 2)",
      notNull: true,
      default: 0,
    },
    total_amount: {
      type: "numeric(12, 2)",
      notNull: true,
      default: 0,
    },
    notes: {
      type: "text",
      notNull: false,
    },
    cashier_id: {
      type: "uuid",
      notNull: false,
      references: '"users"',
      onDelete: "SET NULL",
    },
    kiosk_session_id: {
      type: "uuid",
      notNull: false,
      references: '"kiosk_sessions"',
      onDelete: "SET NULL",
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
    paid_at: {
      type: "timestamptz",
      notNull: false,
    },
    completed_at: {
      type: "timestamptz",
      notNull: false,
    },
    cancelled_at: {
      type: "timestamptz",
      notNull: false,
    },
  });

  // 2. order_items
  pgm.createTable("order_items", {
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
    product_id: {
      type: "uuid",
      notNull: true,
      references: '"products"',
      onDelete: "RESTRICT",
    },
    product_name: {
      type: "varchar(150)",
      notNull: true,
    },
    product_price: {
      type: "numeric(12, 2)",
      notNull: true,
    },
    options_total: {
      type: "numeric(12, 2)",
      notNull: true,
      default: 0,
    },
    quantity: {
      type: "integer",
      notNull: true,
      default: 1,
      check: "quantity > 0",
    },
    subtotal: {
      type: "numeric(12, 2)",
      notNull: true,
    },
    notes: {
      type: "text",
      notNull: false,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // 3. order_item_options
  pgm.createTable("order_item_options", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    order_item_id: {
      type: "uuid",
      notNull: true,
      references: '"order_items"',
      onDelete: "CASCADE",
    },
    option_group_id: {
      type: "uuid",
      notNull: false,
      references: '"option_groups"',
      onDelete: "SET NULL",
    },
    option_value_id: {
      type: "uuid",
      notNull: false,
      references: '"option_values"',
      onDelete: "SET NULL",
    },
    option_name: {
      type: "varchar(100)",
      notNull: true,
    },
    option_value_name: {
      type: "varchar(100)",
      notNull: true,
    },
    additional_price: {
      type: "numeric(12, 2)",
      notNull: true,
      default: 0,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("order_item_options");
  pgm.dropTable("order_items");
  pgm.dropTable("orders");
};
