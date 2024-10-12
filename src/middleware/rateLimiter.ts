import { Request, Response, NextFunction } from "express";

import redisClient from "../config/redis";

export class RateLimitter {
    static async limit(req: Request, res: Response, next: NextFunction){
        const ip = req.ip;
        const key = `ratelimit_${ip}`;

        const request = await redisClient.get(key);

        if(request && parseInt(request) >= 100){
            return res.status(429).json({message: "Too many requests"});
        }else{
            await redisClient.setEx(key, 60, (request ? parseInt(request) + 1 : 1).toString());
            next();
            
        }
    }
}