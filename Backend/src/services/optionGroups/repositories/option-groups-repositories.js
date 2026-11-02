import pool from "../../../config/database.js";

class OptionGroupRepository {
  async createOptionGroup({
    name,
    selection = "SINGLE",
    isRequired = false,
    minSelect = 0,
    maxSelect = 1,
    sortOrder = 0,
    values = [],
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const insertGroupQuery = `
        INSERT INTO option_groups (name, selection, is_required, min_select, max_select, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const groupValues = [
        name,
        selection,
        isRequired,
        minSelect,
        maxSelect,
        sortOrder,
      ];
      const { rows: groupRows } = await client.query(
        insertGroupQuery,
        groupValues,
      );
      const group = groupRows[0];

      const createdValues = [];
      if (Array.isArray(values) && values.length > 0) {
        for (const val of values) {
          const insertValQuery = `
            INSERT INTO option_values (group_id, name, price_delta, is_default, is_available, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          const valParams = [
            group.id,
            val.name,
            val.priceDelta !== undefined ? val.priceDelta : 0,
            val.isDefault !== undefined ? val.isDefault : false,
            val.isAvailable !== undefined ? val.isAvailable : true,
            val.sortOrder !== undefined ? val.sortOrder : 0,
          ];
          const { rows: valRows } = await client.query(
            insertValQuery,
            valParams,
          );
          createdValues.push(valRows[0]);
        }
      }

      await client.query("COMMIT");
      return { ...group, values: createdValues };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllOptionGroups({ includeInactive = false } = {}) {
    let filterCondition = "";
    if (!includeInactive) {
      filterCondition = "WHERE og.is_active = true";
    }

    const query = `
      SELECT og.*,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ov.id,
                   'name', ov.name,
                   'price_delta', ov.price_delta,
                   'is_default', ov.is_default,
                   'is_available', ov.is_available,
                   'sort_order', ov.sort_order
                 ) ORDER BY ov.sort_order ASC, ov.created_at ASC
               ) FILTER (WHERE ov.id IS NOT NULL),
               '[]'
             ) AS values
      FROM option_groups og
      LEFT JOIN option_values ov ON og.id = ov.group_id
      ${filterCondition}
      GROUP BY og.id
      ORDER BY og.sort_order ASC, og.created_at DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  async getOptionGroupById(id) {
    const query = `
      SELECT og.*,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ov.id,
                   'name', ov.name,
                   'price_delta', ov.price_delta,
                   'is_default', ov.is_default,
                   'is_available', ov.is_available,
                   'sort_order', ov.sort_order
                 ) ORDER BY ov.sort_order ASC, ov.created_at ASC
               ) FILTER (WHERE ov.id IS NOT NULL),
               '[]'
             ) AS values
      FROM option_groups og
      LEFT JOIN option_values ov ON og.id = ov.group_id
      WHERE og.id = $1
      GROUP BY og.id
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  async updateOptionGroup(
    id,
    { name, selection, isRequired, minSelect, maxSelect, sortOrder, isActive },
  ) {
    const query = `
      UPDATE option_groups
      SET name = COALESCE($1, name),
          selection = COALESCE($2, selection),
          is_required = COALESCE($3, is_required),
          min_select = COALESCE($4, min_select),
          max_select = COALESCE($5, max_select),
          sort_order = COALESCE($6, sort_order),
          is_active = COALESCE($7, is_active),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;
    const values = [
      name || null,
      selection || null,
      isRequired !== undefined ? isRequired : null,
      minSelect !== undefined ? minSelect : null,
      maxSelect !== undefined ? maxSelect : null,
      sortOrder !== undefined ? sortOrder : null,
      isActive !== undefined ? isActive : null,
      id,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async softDeleteOptionGroup(id) {
    const query = `
      UPDATE option_groups
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  async verifyGroupExists(id) {
    const query = "SELECT id FROM option_groups WHERE id = $1";
    const { rows } = await pool.query(query, [id]);
    return rows.length > 0;
  }

  // ================= OPTION VALUES =================
  async createOptionValue(
    groupId,
    {
      name,
      priceDelta = 0,
      isDefault = false,
      isAvailable = true,
      sortOrder = 0,
    },
  ) {
    const query = `
      INSERT INTO option_values (group_id, name, price_delta, is_default, is_available, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      groupId,
      name,
      priceDelta,
      isDefault,
      isAvailable,
      sortOrder,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async getOptionValueById(id) {
    const query = "SELECT * FROM option_values WHERE id = $1";
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  async updateOptionValue(
    id,
    { name, priceDelta, isDefault, isAvailable, sortOrder },
  ) {
    const query = `
      UPDATE option_values
      SET name = COALESCE($1, name),
          price_delta = COALESCE($2, price_delta),
          is_default = COALESCE($3, is_default),
          is_available = COALESCE($4, is_available),
          sort_order = COALESCE($5, sort_order),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;
    const values = [
      name || null,
      priceDelta !== undefined ? priceDelta : null,
      isDefault !== undefined ? isDefault : null,
      isAvailable !== undefined ? isAvailable : null,
      sortOrder !== undefined ? sortOrder : null,
      id,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async deleteOptionValue(id) {
    const query = "DELETE FROM option_values WHERE id = $1 RETURNING *";
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  // ================= PRODUCT OPTION GROUPS =================
  async assignOptionGroupToProduct(productId, groupId, sortOrder = 0) {
    const query = `
      INSERT INTO product_option_groups (product_id, group_id, sort_order)
      VALUES ($1, $2, $3)
      ON CONFLICT (product_id, group_id)
      DO UPDATE SET sort_order = EXCLUDED.sort_order
      RETURNING *
    `;
    const { rows } = await pool.query(query, [productId, groupId, sortOrder]);
    return rows[0];
  }

  async removeOptionGroupFromProduct(productId, groupId) {
    const query = `
      DELETE FROM product_option_groups
      WHERE product_id = $1 AND group_id = $2
      RETURNING *
    `;
    const { rows } = await pool.query(query, [productId, groupId]);
    return rows[0];
  }

  async getProductOptionGroups(productId) {
    const query = `
      SELECT pog.sort_order AS product_group_sort_order,
             og.*,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ov.id,
                   'name', ov.name,
                   'price_delta', ov.price_delta,
                   'is_default', ov.is_default,
                   'is_available', ov.is_available,
                   'sort_order', ov.sort_order
                 ) ORDER BY ov.sort_order ASC, ov.created_at ASC
               ) FILTER (WHERE ov.id IS NOT NULL),
               '[]'
             ) AS values
      FROM product_option_groups pog
      JOIN option_groups og ON pog.group_id = og.id
      LEFT JOIN option_values ov ON og.id = ov.group_id
      WHERE pog.product_id = $1 AND og.is_active = true
      GROUP BY pog.sort_order, og.id
      ORDER BY pog.sort_order ASC, og.sort_order ASC
    `;
    const { rows } = await pool.query(query, [productId]);
    return rows;
  }

  async verifyProductExists(productId) {
    const query = "SELECT id FROM products WHERE id = $1";
    const { rows } = await pool.query(query, [productId]);
    return rows.length > 0;
  }
}

export default new OptionGroupRepository();
