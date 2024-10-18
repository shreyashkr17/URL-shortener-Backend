import pool from "../config/database";
import bcrypt from "bcryptjs";

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  created_at: Date;
  last_login?: Date;
}

export class UserModel {
  static async create(
    user: Omit<User, "created_at">
  ): Promise<Omit<User, "password">> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const query = `
        INSERT INTO users (id, username, email, password, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, username, email, created_at
      `;
    const values = [user.id, user.username, user.email, hashedPassword];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<Omit<User, "password"> | null> {
    const query =
      "SELECT id, username, email, created_at, last_login FROM users WHERE id = $1";
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async updateLastLogin(id: string): Promise<void> {
    const query = "UPDATE users SET last_login = NOW() WHERE id = $1";
    await pool.query(query, [id]);
  }

  static async getUrlsByUserId(userId: string): Promise<any[]> {
    const query =
      "SELECT * FROM urls WHERE user_id = $1 ORDER BY created_at DESC";
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
}
