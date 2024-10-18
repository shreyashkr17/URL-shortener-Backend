import { Request, Response, NextFunction } from "express";
import { AuthServices } from "../services/authServices";
import { UserModel } from "../models/userModel";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
      };
    }
  }
}
interface User {
  id: string;
  username: string;
  email: string;
  password: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: Omit<User, "password">;
  }
}

export class AuthMiddleware {
  static async authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.auth_token;

      if (!token) {
        return res.status(401).json({ error: "Authentication Required" });
      }

      const userId = await AuthServices.validateToken(token);
      const user = await UserModel.findById(userId); // Await the Promise

      if (!user) {
        return res.status(401).json({ error: "Invalid Token" });
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  static async optionalAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.auth_token;

      if (token) {
        const userId = await AuthServices.validateToken(token);
        const user = await UserModel.findById(userId);
        if (user) {
          req.user = user;
        }
      }

      next();
    } catch (error) {
      next();
    }
  }
}
