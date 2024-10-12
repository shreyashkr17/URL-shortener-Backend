import axios from 'axios';

import { CacheService } from './cacheServices';

export class IpService{
    static async getClientIp(): Promise<string> {
        const cachedIp  = await CacheService.getCache('client_ip');

        if (cachedIp) return cachedIp;

        const response = await axios.get('https://api.ipify.org?format=json');
        const ip = response.data.ip;

        await CacheService.setCache('client_ip', ip,60); // Cache the client IP
        return ip;
    }
}