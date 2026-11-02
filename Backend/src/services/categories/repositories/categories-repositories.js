import pool from "../../../config/database.js";

class CategoryRepository {
  async createCategory(name, description, slug) {
    const query = `INSERT INTO categories (name, description, slug) VALUES ($1, $2, $3) RETURNING *`;
    const values = [name, description, slug];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async getAllCategories() {
    const query = `SELECT * FROM categories`;
    const { rows } = await pool.query(query);
    return rows;
  }

  async getCategoryById(id) {
    const query = `SELECT * FROM categories WHERE id = $1`;
    const values = [id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async updateCategory(id, name, description, slug) {
    const query = `UPDATE categories SET name = $1, description = $2, slug = $3, updated_at = NOW() WHERE id = $4 RETURNING *`;
    const values = [name, description, slug, id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async deleteCategory(id) {
    const query = `DELETE FROM categories WHERE id = $1 RETURNING *`;
    const values = [id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async isCategoryNameExists(name) {
    const query = `SELECT * FROM categories WHERE name = $1`;
    const values = [name];
    const { rows } = await pool.query(query, values);
    return rows.length > 0;
  }
}

export default new CategoryRepository();
