import { Request, Response } from "express";
import { AuthServices } from "../services/authServices";
import { UserModel } from "../models/userModel";
import { error } from "console";
import { ApiTokenModel } from "../models/apiTokenModel";
import pool from "../config/database";

export class AuthController {
  static async register(registrationData: {
    username: string;
    email: string;
    password: string;
  }) {
    try {
      const { username, email, password } = registrationData;

      if (!username || !email || !password) {
        throw new Error("All fields are required");
      }

      const { user, token } = await AuthServices.register(
        username,
        email,
        password
      );

      return { user, token };
    } catch (error: any) {
      throw error;
    }
  }

  static async login(loginData: any) {
    try {
      const { email, password } = loginData;

      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const { user, token } = await AuthServices.login(email, password);

      return { user, token };
    } catch (error: any) {
      throw error;
    }
  }

  static async logout(userId: string) {
    try {
      if (!userId) {
        throw new Error("User ID required for logout");
      }

      await AuthServices.logout(userId);
      return { success: true };
    } catch (error: any) {
      throw error;
    }
  }

  static async getProfile(userId: string) {
    try {
      if (!userId) {
        throw new Error("User ID required");
      }

      const urls = await UserModel.getUrlsByUserId(userId);
      return { urls };
    } catch (error: any) {
      throw error;
    }
  }

  // API Token
  static async generateAPIToken(userId: string) {
    try {
      // const userId = req.user?.id;
      if (!userId) {
        throw new Error("User ID required");
      }

      const apiToken = await ApiTokenModel.create(userId);
      return apiToken;
    } catch (error: any) {
      throw error;
    }
  }

  static async listApiTokens(userId: string) {
    try {
      if (!userId) {
        throw new Error("User ID required");
      }

      const tokens = await ApiTokenModel.findByUserId(userId);
      return tokens;
    } catch (error: any) {
      throw error;
    }
  }

  static async revokeApiToken(userId: string, tokenId: string) {
    try {
      if (!userId) {
        throw new Error("User ID required");
      }

      if (!tokenId) {
        throw new Error("Token ID required");
      }

      const tokenExists = await pool.query(
        "SELECT * FROM api_tokens WHERE id = $1",
        [tokenId]
      );

      if (tokenExists.rows.length === 0) {
        const error = new Error("Token not found");
        throw { ...error, status: 404 };
      }

      const token = tokenExists.rows[0];
      if (token.user_id !== userId) {
        const error = new Error("Unauthorized to revoke this token");
        throw { ...error, status: 403 };
      }

      await ApiTokenModel.deleteToken(tokenId);
      return { message: "Token revoked successfully" };
    } catch (error: any) {
      console.error("Error revoking API token:", error);
      throw error;
    }
  }
}
