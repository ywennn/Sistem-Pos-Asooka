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
  pgm.createType("option_selection", ["SINGLE", "MULTIPLE"]);

  pgm.createTable("option_groups", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    name: {
      type: "varchar(60)",
      notNull: true,
    },
    selection: {
      type: "option_selection",
      notNull: true,
      default: "SINGLE",
    },
    is_required: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    min_select: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    max_select: {
      type: "integer",
      notNull: true,
      default: 1,
    },
    sort_order: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    is_active: {
      type: "boolean",
      notNull: true,
      default: true,
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

  pgm.createTable("option_values", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    group_id: {
      type: "uuid",
      notNull: true,
      references: '"option_groups"',
      onDelete: "CASCADE",
    },
    name: {
      type: "varchar(60)",
      notNull: true,
    },
    price_delta: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    is_default: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    is_available: {
      type: "boolean",
      notNull: true,
      default: true,
    },
    sort_order: {
      type: "integer",
      notNull: true,
      default: 0,
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

  pgm.createTable("product_option_groups", {
    product_id: {
      type: "uuid",
      notNull: true,
      references: '"products"',
      onDelete: "CASCADE",
    },
    group_id: {
      type: "uuid",
      notNull: true,
      references: '"option_groups"',
      onDelete: "CASCADE",
    },
    sort_order: {
      type: "integer",
      notNull: true,
      default: 0,
    },
  });

  pgm.addConstraint("product_option_groups", "pk_product_option_groups", {
    primaryKey: ["product_id", "group_id"],
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("product_option_groups");
  pgm.dropTable("option_values");
  pgm.dropTable("option_groups");
  pgm.dropType("option_selection");
};
