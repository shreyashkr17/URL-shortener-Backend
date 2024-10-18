import express from "express";
import { Request, Response, NextFunction } from "express";
import { UrlController } from "./controllers/urlController";
import { RateLimitter } from "./middleware/rateLimiter";
import {
  register,
  httpRequestDurationMicroseconds,
} from "./monitoring/metrics";
import cors from "cors";
import cookieParser from "cookie-parser";
import { UuidService } from "./services/uuidServices";

const app = express();

app.use(express.json());
app.use(cookieParser());

const corsOptions = {
  origin: ["https://www.shortlycut.xyz", "https://shortlycut.xyz"],
  optionsSuccessStatus: 200,
  credentials: true, // Add this line to allow cookies to be sent with CORS requests
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds
      .labels(
        req.method,
        req.route?.path || "unknown",
        res.statusCode.toString()
      )
      .observe(duration / 1000);
  });
  next();
});

// Move UUID middleware before rate limiter
app.use(UuidService.setUuidCookie);

// Modify rate limiter middleware to create UUID if not present
const rateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.cookies.userUuid) {
    const uuid = UuidService.generateUuid();
    res.cookie("userUuid", uuid, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    req.cookies.userUuid = uuid; // Add UUID to request object
  }
  await RateLimitter.limit(req, res, next).catch(next);
};

const createShortUrlHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await UrlController.createshort_url(req, res);
  } catch (error) {
    next(error);
  }
};

const redirectUrlHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await UrlController.redirectUrl(req, res);
  } catch (error) {
    next(error);
  }
};

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/shorten", rateLimiterMiddleware, createShortUrlHandler);
app.get("/:id", redirectUrlHandler);

app.get("/metrics", async (req: Request, res: Response) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

export default app;
