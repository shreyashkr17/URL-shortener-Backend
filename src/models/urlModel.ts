import pool from "../config/database";

export interface Url {
  id: string;
  original_url: string;
  short_url: string;
  created_at: Date;
  ip_addresses: string[];
  user_id?: string;
}

export class UrlModel {
  static async create(url: Url): Promise<Url> {
    const query = `
      INSERT INTO urls (id, original_url, short_url, created_at, ip_addresses, user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      url.id,
      url.original_url,
      url.short_url,
      url.created_at,
      url.ip_addresses,
      url.user_id
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByoriginal_url(original_url: string): Promise<Url | null> {
    const query = "SELECT * FROM urls WHERE original_url = $1";
    const result = await pool.query(query, [original_url]);
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<Url | null> {
    const query = "SELECT * FROM urls WHERE id = $1";
    console.log("Query: ", query);
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Add IP Address if not already in array
  static async addIpAddress(
    id: string,
    ipAddress: string
  ): Promise<Url | null> {
    const query = `UPDATE urls SET ip_addresses = array_append(ip_addresses, $1) WHERE id = $2 RETURNING *`;
    const result = await pool.query(query, [ipAddress, id]);
    return result.rows[0] || null;
  }

  static async findByUserAndOriginalUrl(userId: string, original_url: string): Promise<Url | null> {
    const query = "SELECT * FROM urls WHERE user_id = $1 AND original_url = $2";
    const result = await pool.query(query, [userId, original_url]);
    return result.rows[0] || null;
  }
}
