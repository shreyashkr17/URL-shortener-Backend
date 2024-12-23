import { Request, Response } from "express";
import { UrlService } from "../services/urlServices";

import { IpService } from "../services/ipServices";

interface URLentry{
  rowIndex: number;
  cellValue: string;
}

export class UrlController {
  static async createshort_url(req: Request, res: Response) {
    try {
      const { original_url } = req.body;
      let urlOrigin = original_url;
      if (!urlOrigin.startsWith('http://') && !urlOrigin.startsWith('https://')) {
        urlOrigin = 'https://' + urlOrigin;
      }
      const ip = await IpService.getClientIp();
      console.log("Type of ip from getClient(): ",typeof ip);
      const userId = req.user?.id;
      const url = await UrlService.generateshort_url(urlOrigin, ip, userId);

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

  static async shortenBatchURLs(req:Request, res: Response){
    try {
      const {urlArray} = req.body;


      if(!Array.isArray(urlArray) || urlArray.length < 2){
        return res.status(400).json({ 
          error: "Invalid input format. Expect array with header and URL entries" 
        });
      };

      if (urlArray.length > 100) {
        return res.status(400).json({
          error: "Array too long. Please send in chunk sizes of 300 or fewer URLs.",
        });
      }

      const header = urlArray[0];
      if (typeof header !== 'string') {
        return res.status(400).json({ 
          error: "First element must be 'URLs' header" 
        });
      }

      const processedUrls: (string | URLentry)[] = ["Shorten URLs"];
      for(let i = 1; i<urlArray.length; i++){
        // console.log(i);

        const entry = urlArray[i] as URLentry;

        // console.log(entry);
        if (!entry.cellValue ) {
          continue; // Skip invalid entries
        }

        try {
          let url = entry.cellValue;
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
          }

          const userId = req.user?.id;

          const ip = await IpService.getClientIp();

          const shortUrl = await UrlService.generateshort_url(url, ip, userId);

          processedUrls.push({
            rowIndex: entry.rowIndex,
            cellValue: shortUrl.short_url,
          });
        } catch (error) {
          processedUrls.push({
            rowIndex: entry.rowIndex,
            cellValue: "Error processing URL"
          });
        }
        console.log("Processed URL: ", processedUrls);
      }

      res.status(200).json({processedUrls});
    } catch (error) {
      console.error('Error in batch URL processing:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
