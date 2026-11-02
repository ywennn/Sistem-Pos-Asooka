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
  pgm.createTable("products", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    category_id: {
      type: "uuid",
      notNull: true,
      references: '"categories"',
      onDelete: "CASCADE",
    },
    subcategory_id: {
      type: "uuid",
      notNull: false,
      references: '"subcategories"',
      onDelete: "SET NULL",
    },
    name: {
      type: "varchar(120)",
      notNull: true,
    },
    description: {
      type: "text",
      notNull: false,
    },
    price: {
      type: "integer",
      notNull: true,
      check: "price >= 0",
    },
    image_url: {
      type: "text",
      notNull: false,
    },
    is_available: {
      type: "boolean",
      notNull: true,
      default: true,
    },
    is_active: {
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
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("products");
};
