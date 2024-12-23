import { Request, Response } from "express";
import { AuthServices } from "../services/authServices";
import { UserModel } from "../models/userModel";
import { error } from "console";
import { ApiTokenModel } from "../models/apiTokenModel";
import pool from "../config/database";

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const { user, token } = await AuthServices.register(
        username,
        email,
        password
      );

      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.status(201).json({ user, token });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      const { user, token } = await AuthServices.login(email, password);

      // Set JWT token in cookie
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.json({ user, token });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const userId = req.user?.id; // Will be set by auth middleware
      if (userId) {
        await AuthServices.logout(userId);
      }

      res.clearCookie("auth_token");
      res.json({ message: "Logged out successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const urls = await UserModel.getUrlsByUserId(userId);
      res.json({ urls });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // API Token
  static async generateAPIToken(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const apiToken = await ApiTokenModel.create(userId);
      res.json({ tokens:apiToken });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async listApiTokens(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const tokens = await ApiTokenModel.findByUserId(userId);
      res.json({ tokens });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async revokeApiToken(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const tokenId = req.params.token; // Ensure you get the token from params
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if token exists
      const tokenExists = await pool.query(
        "SELECT * FROM api_tokens WHERE id = $1",
        [tokenId]
      );
      if (tokenExists.rows.length === 0) {
        return res.status(404).json({ error: "Token not found" });
      }

      await ApiTokenModel.deleteToken(tokenId);
      res.json({ message: "Token revoked successfully" });
    } catch (error: any) {
      console.error("Error revoking API token:", error); // Added logging
      res.status(500).json({ error: error.message });
    }
  }
}
