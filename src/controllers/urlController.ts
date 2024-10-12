import { Request, Response } from "express";
import { UrlService } from "../services/urlServices";

import { IpService } from "../services/ipServices";

export class UrlController {
  static async createshort_url(req: Request, res: Response) {
    try {
      const { original_url } = req.body;
      const ip = await IpService.getClientIp();
      console.log("Type of ip from getClient(): ",typeof ip)
      const url = await UrlService.generateshort_url(original_url, ip);

      res.json({ url });
    } catch (error) {
      console.error('Error creating short URL:', error);
      res.status(500).json({ error: 'An error occurred while creating the short URL' });
    }
  }

  static async redirectUrl(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log('UrlController: Received redirect request for ID:', id);

      const url = await UrlService.getoriginal_url(id);
      console.log('UrlController: Result from UrlService:', url);

      if (!url) {
        console.log('UrlController: URL not found, sending 404');
        return res.status(404).json({ error: "URL not found" });
      }

      let redirectUrl = url.original_url;
      if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
        redirectUrl = 'http://' + redirectUrl;
      }

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error redirecting URL:', error);
      res.status(500).json({ error: 'An error occurred while redirecting' });
    }
  }
}
