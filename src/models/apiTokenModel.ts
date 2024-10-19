import pool from "../config/database";
import { v4 as uuidv4 } from "uuid";

export interface ApiToken {
  id: string;
  user_id: string;
  token: string;
  created_at: Date;
  last_used: Date | null;
}

export class ApiTokenModel {
  private static generateToken(): string {
    const token1 = uuidv4().replace(/-/g, '');
    const token2 = uuidv4().replace(/-/g, '');
    let combinedToken = '';
    
    for (let i = 0; i < token1.length; i++) {
      combinedToken += token1[i] + token2[i];
    }
    
    return `Shly-${combinedToken}`;
  }
  static async create(userId: string): Promise<ApiToken> {
    const id = uuidv4();
    const token = this.generateToken(); // Use UUID as the token for simplicity
    const query = `
          INSERT INTO api_tokens (id, user_id, token, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING *
        `;
    const result = await pool.query(query, [id, userId, token]);
    return result.rows[0];
  }

  static async findByToken(token: string): Promise<ApiToken | null> {
    const query = "SELECT * FROM api_tokens WHERE token = $1";
    const result = await pool.query(query, [token]);
    return result.rows[0] || null;
  }

  static async updateLastUsed(id: string): Promise<void> {
    const query = "UPDATE api_tokens SET last_used_at = NOW() WHERE id = $1";
    await pool.query(query, [id]);
  }

  static async findByUserId(userId: string): Promise<ApiToken[]> {
    const query = "SELECT * FROM api_tokens WHERE user_id = $1";
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async deleteToken(id: string): Promise<void> {
    const query = "DELETE FROM api_tokens WHERE id = $1";
    await pool.query(query, [id]);
  }
}
