import ShortUniqueId from "short-unique-id";
import { Url, UrlModel } from "../models/urlModel";
import { CacheService } from "./cacheServices";

const uid = new ShortUniqueId({ length: 8 });

export class UrlService {
  static async generateshort_url(original_url: string, ipAddress: string, userId?: string): Promise<Url> {
    // Check if the URL already exists in the Cache
    const cachedUrl = await CacheService.getCache(original_url);
    if (cachedUrl && typeof cachedUrl === 'object') {
      console.log(cachedUrl.ip_addresses)
      if (Array.isArray(cachedUrl.ip_addresses) && !cachedUrl.ip_addresses.includes(ipAddress)) {
        const updatedUrl = await UrlModel.addIpAddress(cachedUrl.id, ipAddress);
        if (!updatedUrl) {
          console.error('Failed to update IP address in the database');
          throw new Error('Failed to update IP address');
        }
        await CacheService.setCache(original_url, updatedUrl);
        await CacheService.setCache(updatedUrl.id, updatedUrl);
        return updatedUrl;
      }
      return cachedUrl as Url;
    }

    // Check in the database
    const existingUrl = await UrlModel.findByoriginal_url(original_url);
    if (existingUrl) {
      console.log(existingUrl.ip_addresses)
      if (Array.isArray(existingUrl.ip_addresses) && !existingUrl.ip_addresses.includes(ipAddress)) {
        const updatedUrl = await UrlModel.addIpAddress(existingUrl.id, ipAddress);
        if (!updatedUrl) {
          console.error('Failed to update IP address in the database');
          throw new Error('Failed to update IP address');
        }
        await CacheService.setCache(original_url, updatedUrl);
        await CacheService.setCache(updatedUrl.id, updatedUrl);
        return updatedUrl;
      }
      await CacheService.setCache(original_url, existingUrl);
      await CacheService.setCache(existingUrl.id, existingUrl);
      return existingUrl;
    }

    // If not found, create a new short URL
    const id = uid.randomUUID();
    const short_url = `https://njs.shortlycut.xyz/${id}`;
    const url: Url = {
      id,
      original_url,
      short_url,
      created_at: new Date(),
      ip_addresses: [ipAddress],
      user_id: userId || undefined,
    };
    console.log(url);

    // Save to database and cache it
    const createdUrl = await UrlModel.create(url);
    await CacheService.setCache(original_url, createdUrl);
    await CacheService.setCache(id, createdUrl);

    return createdUrl;
  }

  static async getoriginal_url(id: string): Promise<Url | null> {
    console.log('Looking up URL for ID:', id);
    const cachedUrl = await CacheService.getCache(id);
    if (cachedUrl) {
      console.log('Found URL in cache:', cachedUrl);
      return cachedUrl as Url;
    }

    console.log('Cache miss, querying database for ID:', id);
    const url = await UrlModel.findById(id);
    if (url) {
      console.log('Found URL in database:', url);
      await CacheService.setCache(id, url);
      return url;
    } else {
      console.log('No URL found in database for ID:', id);
      return null;
    }
  }
}
