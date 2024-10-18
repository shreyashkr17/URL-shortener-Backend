import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from "express";
import redisClient from "../config/redis";

export class UuidService {
  static generateUuid():string {
    return uuidv4();
  }

  static async setUuidCookie(req: Request, res: Response, next: NextFunction) {
    if (!req.cookies.userUuid) {
      const uuid = UuidService.generateUuid();
      res.cookie("userUuid", uuid, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      }); // 24 hours
      await redisClient.setEx(`user:${uuid}`, 24 * 60 * 60, "0");
    }
    next();
  }
}
