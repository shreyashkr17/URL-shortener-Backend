import { Request, Response } from "express";
import { AuthServices } from "../services/authServices";
import { UserModel } from "../models/userModel";

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

      res.status(201).json({ user });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { user, token } = await AuthServices.login(email, password);

      // Set JWT token in cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({ user });
    } catch (error:any) {
      res.status(401).json({ error: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const userId = req.user?.id; // Will be set by auth middleware
      if (userId) {
        await AuthServices.logout(userId);
      }

      res.clearCookie('auth_token');
      res.json({ message: 'Logged out successfully' });
    } catch (error:any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const urls = await UserModel.getUrlsByUserId(userId);
      res.json({ urls });
    } catch (error:any) {
      res.status(500).json({ error: error.message });
    }
  }
}
