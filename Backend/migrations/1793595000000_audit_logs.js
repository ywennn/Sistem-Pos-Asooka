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
  pgm.createTable("audit_logs", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: false,
      references: '"users"',
      onDelete: "SET NULL",
    },
    action: {
      type: "varchar(100)",
      notNull: true,
    },
    module: {
      type: "varchar(50)",
      notNull: true,
    },
    entity_type: {
      type: "varchar(50)",
      notNull: false,
    },
    entity_id: {
      type: "uuid",
      notNull: false,
    },
    description: {
      type: "text",
      notNull: false,
    },
    old_data: {
      type: "jsonb",
      notNull: false,
    },
    new_data: {
      type: "jsonb",
      notNull: false,
    },
    ip_address: {
      type: "inet",
      notNull: false,
    },
    user_agent: {
      type: "text",
      notNull: false,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("audit_logs", ["user_id"]);
  pgm.createIndex("audit_logs", ["action"]);
  pgm.createIndex("audit_logs", ["module"]);
  pgm.createIndex("audit_logs", ["created_at"]);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("audit_logs");
};
