import pool from "../../../config/database.js";
import bcrypt from "bcrypt";
class UserRepository {
  async createUser({ name, email, password, role }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const query = `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *`;
    const values = [name, email, passwordHash, role];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }
  async verifyAvailability(email) {
    const query = `SELECT * FROM users WHERE email = $1`;
    const values = [email];
    const { rows } = await pool.query(query, values);
    return rows.length === 0;
  }

  async verifyCredentials(email, password) {
    const query = `SELECT * FROM users WHERE email = $1`;
    const values = [email];
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      return null;
    }
    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return null;
    }
    return user;
  }
}

export default new UserRepository();
