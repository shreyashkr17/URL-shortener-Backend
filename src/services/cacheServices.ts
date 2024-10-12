import redisClient from "../config/redis";

export class CacheService {
  static async setCache(key: string, value: any, expireTimeInSecond = 600): Promise<void> {
    await redisClient.setEx(key, expireTimeInSecond, JSON.stringify(value));
  }

  static async getCache(key: string): Promise<any | null> {
    const value = await redisClient.get(key);
    console.log('Line 10 from cacheService Cache value:', value);
    if (value === null) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('Error parsing cached value:', error);
      return null;
    }
  }

  static async increment(key: string): Promise<number> {
    return await redisClient.incr(key);
  }
}
