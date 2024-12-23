import { Request, Response, NextFunction } from "express";
import { ApiTokenModel } from "../models/apiTokenModel";

export class ApiTokenMiddleware {
  static async authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      const apiToken = req.headers["x-api-token"] as string;
      if (!apiToken) {
        return res.status(401).json({ error: "API token is required" });
      }

      const token = await ApiTokenModel.findByToken(apiToken);
      if (!token) {
        return res.status(401).json({ error: "Invalid API token" });
      }

      await ApiTokenModel.updateLastUsed(token.id);
      req.user = { id: token.user_id, username: "", email: "" };
      next();
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
}
