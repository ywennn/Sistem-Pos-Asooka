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
  // 1. kiosk_devices
  pgm.createTable("kiosk_devices", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    device_name: {
      type: "varchar(100)",
      notNull: true,
    },
    device_code: {
      type: "varchar(50)",
      notNull: true,
      unique: true,
    },
    device_token_hash: {
      type: "text",
      notNull: false,
    },
    device_type: {
      type: "varchar(20)",
      notNull: true, // CASHIER, CUSTOMER
    },
    is_active: {
      type: "boolean",
      notNull: true,
      default: true,
    },
    last_seen_at: {
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

  // 2. kiosk_sessions
  pgm.createTable("kiosk_sessions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    cashier_device_id: {
      type: "uuid",
      notNull: true,
      references: '"kiosk_devices"',
      onDelete: "CASCADE",
    },
    customer_device_id: {
      type: "uuid",
      notNull: true,
      references: '"kiosk_devices"',
      onDelete: "CASCADE",
    },
    cashier_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "ACTIVE", // ACTIVE, ENDED
    },
    started_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    ended_at: {
      type: "timestamptz",
      notNull: false,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // 3. kiosk_states
  pgm.createTable("kiosk_states", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    session_id: {
      type: "uuid",
      notNull: true,
      references: '"kiosk_sessions"',
      onDelete: "CASCADE",
      unique: true,
    },
    state_data: {
      type: "jsonb",
      notNull: true,
      default: "{}",
    },
    version: {
      type: "bigint",
      notNull: true,
      default: 1,
    },
    updated_at: {
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
  pgm.dropTable("kiosk_states");
  pgm.dropTable("kiosk_sessions");
  pgm.dropTable("kiosk_devices");
};
