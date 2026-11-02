import pool from "../../../config/database.js";
import { NotFoundError } from "../../../exceptions/index.js";

class SubCategoryRepository {
  async getAllSubCategories() {
    const query = `
      SELECT sc.*, c.name AS category_name 
      FROM subcategories sc 
      JOIN categories c ON sc.category_id = c.id 
      ORDER BY sc.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async createSubCategory(name, categoryId, slug) {
    const query =
      "INSERT INTO subcategories (name, category_id, slug) VALUES ($1, $2, $3) RETURNING *";
    const values = [name, categoryId, slug];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getSubCategoryById(id) {
    const query = `
      SELECT sc.*, c.name AS category_name 
      FROM subcategories sc 
      JOIN categories c ON sc.category_id = c.id 
      WHERE sc.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  async getSubCategoriesByCategoryId(categoryId) {
    const query =
      "SELECT * FROM subcategories WHERE category_id = $1 ORDER BY created_at DESC";
    const result = await pool.query(query, [categoryId]);
    return result.rows;
  }

  async updateSubCategory(id, name, categoryId, slug) {
    const query =
      "UPDATE subcategories SET name = $1, category_id = $2, slug = $3, updated_at = NOW() WHERE id = $4 RETURNING *";
    const values = [name, categoryId, slug, id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async deleteSubCategory(id) {
    const query = "DELETE FROM subcategories WHERE id = $1 RETURNING *";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  async isSlugExists(slug, excludeId = null) {
    let query = "SELECT id FROM subcategories WHERE slug = $1";
    const values = [slug];
    if (excludeId) {
      query += " AND id != $2";
      values.push(excludeId);
    }
    const result = await pool.query(query, values);
    return result.rows.length > 0;
  }

  async verifyCategoryExists(categoryId) {
    const query = "SELECT id FROM categories WHERE id = $1";
    const result = await pool.query(query, [categoryId]);
    return result.rows.length > 0;
  }
}

export default new SubCategoryRepository();
