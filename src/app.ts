import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { UrlController } from './controllers/urlController';
import { RateLimitter } from './middleware/rateLimiter';
import {register, httpRequestDurationMicroseconds} from './monitoring/metrics';
import cors from 'cors';
// import logger from './monitoring/logger';

const app = express();
app.use(express.json());

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? 'http://localhost:5173' : 'http://localhost:5173',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.use((req:Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', ()=>{
    const duration = Date.now()-start;

    httpRequestDurationMicroseconds
      .labels(req.method, req.route.path, res.statusCode.toString())
      .observe(duration/1000);
  });
  next();
})

const rateLimiterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  RateLimitter.limit(req, res, next).catch(next);
};

const createshort_urlHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await UrlController.createshort_url(req, res);
  } catch (error) {
    // logger.error('Error creating short URL', { error });
    next(error);
  }
};

const redirectUrlHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await UrlController.redirectUrl(req, res);
  } catch (error) {
    // logger.error('Error redirecting URL', { error });
    next(error);
  }
};

app.post('/shorten', rateLimiterMiddleware, createshort_urlHandler);
app.get('/:id', redirectUrlHandler);
app.get('/metrics', async(req:Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    // logger.error('Error exposing metrics', { error });
    res.status(500).end(error);
  }
});

export default app;