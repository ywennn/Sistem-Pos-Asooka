import pool from "../../../config/database.js";
import crypto from "crypto";
class AuthRepository {
  async addRefreshToken(userId, token, expiresAt) {
    const query = `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING id, user_id, token, expires_at`;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const values = [userId, tokenHash, expiresAt];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async findActiveRefreshToken(userId, tokenHash) {
    const query = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.role
    FROM refresh_tokens rt
    JOIN users u ON u.id = rt.user_id
    WHERE rt.user_id = $1
      AND rt.token = $2
      AND rt.revoked_at IS NULL
      AND rt.expires_at > NOW()
      AND u.is_active = TRUE
  `;

    const { rows } = await pool.query(query, [userId, tokenHash]);

    return rows[0] || null;
  }
  async revokeRefreshToken(token) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const query = `
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE token = $1
      AND revoked_at IS NULL
    RETURNING id
  `;

    const { rows } = await pool.query(query, [tokenHash]);

    return rows.length > 0;
  }

  async rotateRefreshToken(userId, oldToken, newToken, expiresAt) {
    const client = await pool.connect();

    const oldTokenHash = crypto
      .createHash("sha256")
      .update(oldToken)
      .digest("hex");

    const newTokenHash = crypto
      .createHash("sha256")
      .update(newToken)
      .digest("hex");

    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `
          SELECT
            rt.id AS refresh_token_id,
            u.id,
            u.name,
            u.email,
            u.role
          FROM refresh_tokens rt
          JOIN users u ON u.id = rt.user_id
          WHERE rt.user_id = $1
            AND rt.token = $2
            AND rt.revoked_at IS NULL
            AND rt.expires_at > NOW()
            AND u.is_active = TRUE
          FOR UPDATE OF rt
        `,
        [userId, oldTokenHash],
      );

      if (rows.length === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      const user = rows[0];

      // Cabut refresh token lama
      await client.query(
        `
          UPDATE refresh_tokens
          SET revoked_at = NOW()
          WHERE id = $1
        `,
        [user.refresh_token_id],
      );

      // Simpan hash refresh token baru
      await client.query(
        `
          INSERT INTO refresh_tokens (
            user_id,
            token,
            expires_at
          )
          VALUES ($1, $2, $3)
        `,
        [user.id, newTokenHash, expiresAt],
      );

      await client.query("COMMIT");

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new AuthRepository();
