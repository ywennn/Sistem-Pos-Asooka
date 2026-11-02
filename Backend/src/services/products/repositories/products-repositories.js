import pool from "../../../config/database.js";

class ProductRepository {
  async createProduct({ name, categoryId, subcategoryId, description, price, imageUrl, sortOrder }) {
    const query = `
      INSERT INTO products (name, category_id, subcategory_id, description, price, image_url, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `;
    const values = [name, categoryId, subcategoryId || null, description || null, price, imageUrl || null, sortOrder || 0];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async getAllProducts({ includeInactive = false } = {}) {
    let query = `
      SELECT p.*, 
             c.name AS category_name, 
             sc.name AS subcategory_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
    `;
    if (!includeInactive) {
      query += " WHERE p.is_active = true";
    }
    query += " ORDER BY p.sort_order ASC, p.created_at DESC";

    const { rows } = await pool.query(query);
    return rows;
  }

  async getProductById(id) {
    const query = `
      SELECT p.*, 
             c.name AS category_name, 
             sc.name AS subcategory_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      WHERE p.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  async getProductsByCategoryId(categoryId, { includeInactive = false } = {}) {
    let query = `
      SELECT p.*, 
             c.name AS category_name, 
             sc.name AS subcategory_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      WHERE p.category_id = $1
    `;
    if (!includeInactive) {
      query += " AND p.is_active = true";
    }
    query += " ORDER BY p.sort_order ASC, p.created_at DESC";

    const { rows } = await pool.query(query, [categoryId]);
    return rows;
  }

  async getProductsBySubcategoryId(subcategoryId, { includeInactive = false } = {}) {
    let query = `
      SELECT p.*, 
             c.name AS category_name, 
             sc.name AS subcategory_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      WHERE p.subcategory_id = $1
    `;
    if (!includeInactive) {
      query += " AND p.is_active = true";
    }
    query += " ORDER BY p.sort_order ASC, p.created_at DESC";

    const { rows } = await pool.query(query, [subcategoryId]);
    return rows;
  }

  async updateProduct(id, { name, categoryId, subcategoryId, description, price, imageUrl, isAvailable, sortOrder }) {
    const query = `
      UPDATE products 
      SET name = COALESCE($1, name),
          category_id = COALESCE($2, category_id),
          subcategory_id = $3,
          description = $4,
          price = COALESCE($5, price),
          image_url = $6,
          is_available = COALESCE($7, is_available),
          sort_order = COALESCE($8, sort_order),
          updated_at = NOW()
      WHERE id = $9 
      RETURNING *
    `;
    const values = [
      name || null,
      categoryId || null,
      subcategoryId !== undefined ? subcategoryId : null,
      description !== undefined ? description : null,
      price !== undefined ? price : null,
      imageUrl !== undefined ? imageUrl : null,
      isAvailable !== undefined ? isAvailable : null,
      sortOrder !== undefined ? sortOrder : null,
      id,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async softDeleteProduct(id) {
    const query = `
      UPDATE products SET is_active = false, updated_at = NOW()
      WHERE id = $1 RETURNING *
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  async restoreProduct(id) {
    const query = `
      UPDATE products SET is_active = true, updated_at = NOW()
      WHERE id = $1 RETURNING *
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  async verifyCategoryExists(categoryId) {
    const query = "SELECT id FROM categories WHERE id = $1";
    const { rows } = await pool.query(query, [categoryId]);
    return rows.length > 0;
  }

  async verifySubcategoryBelongsToCategory(subcategoryId, categoryId) {
    const query = "SELECT id FROM subcategories WHERE id = $1 AND category_id = $2";
    const { rows } = await pool.query(query, [subcategoryId, categoryId]);
    return rows.length > 0;
  }
}

export default new ProductRepository();
