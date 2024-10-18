import { Request, Response, NextFunction } from "express";

import redisClient from "../config/redis";

export class RateLimitter {
  static async limit(req: Request, res: Response, next: NextFunction) {
    try {
      // Global rate limiting
      const globalKey = "global_requests";
      const globalRequests = await redisClient.incr(globalKey);

      if (globalRequests === 1) {
        await redisClient.expire(globalKey, 1); // Expire after 1 second
      }

      if (globalRequests > 150) {
        return res.status(429).json({ message: "Too many requests globally" });
      }

      // User-level rate limiting
      const userUuid = req.cookies.userUuid;
      if (!userUuid) {
        return res.status(400).json({ message: "User UUID not found" });
      }

      const userKey = `user:${userUuid}`;
      const userRequests = await redisClient.incr(userKey);

      if (userRequests === 1) {
        await redisClient.expire(userKey, 1); // Expire after 1 second
      }

      if (userRequests > 10) {
        return res
          .status(429)
          .json({ message: "Too many requests for this user" });
      }

      next();
    } catch (error) {
      console.error("Rate limiting error:", error);
      next(error);
    }
  }
}
