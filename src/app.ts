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
import { AuthController } from "./controllers/authController";
import { AuthMiddleware } from "./middleware/authMiddleware";
import { ApiTokenMiddleware } from "./middleware/apiTokenMiddleware";

const app = express();

app.use(express.json());
app.use(cookieParser());

const corsOptions = {
  origin: ["https://www.shortlycut.xyz", "https://shortlycut.xyz", "http://localhost:5173", "*"],
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

const createBatchShortURLsHandler = async (
  req:Request, 
  res: Response,
  next: NextFunction
) => {
  try {
    await UrlController.shortenBatchURLs(req, res);
  } catch (error) {
    next(error);
  }
}

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

const registerAuthHandler = async (
  req:Request,
  res:Response,
  next:NextFunction
) => {
  try {
    await AuthController.register(req,res);
  } catch (error) {
    next(error);
  }
}
const loginAuthHandler = async (
  req:Request,
  res:Response,
  next:NextFunction
) => {
  try {
    await AuthController.login(req, res);
  } catch (error) {
    next(error);
  }
}

const authMiddlewareHandler = async (
  req:Request,
  res:Response,
  next:NextFunction
) => {
  try {
    await AuthMiddleware.authenticate(req,res,next);
  } catch (error) {
    next(error);
  }
}

const logoutAuthHandler = async (
  req:Request,
  res:Response,
  next:NextFunction
) => {
  try {
    await AuthController.logout(req,res);
  } catch (error) {
    next(error);
  }
};

const getProfileAuthHandler = async (
  req:Request,
  res:Response,
  next:NextFunction
) => {
  try {
    await AuthController.getProfile(req,res);
  } catch (error) {
    next(error);
  }
};

const getgenerateAPIHandler = async(
  req:Request,
  res:Response,
  next:NextFunction
) => {
  try {
    await AuthController.generateAPIToken(req,res);
  } catch (error) {
    next(error);
  }
};

const generateListAPIHandler = async (
  req:Request,
  res:Response,
  next: NextFunction
) => {
  try {
    await AuthController.listApiTokens(req,res);
  } catch (error) {
    next(error);
  }
};

const deleteAPITokenHandler = async (
  req:Request,
  res:Response,
  next: NextFunction
) => {
  try {
    await AuthController.revokeApiToken(req,res);
  } catch (error) {
    next(error);
  }
}

const apiMiddlewareHandler = async (
  req:Request,
  res:Response,
  next: NextFunction
) => {
  try {
    await ApiTokenMiddleware.authenticate(req,res,next);
  } catch (error) {
    next(error);
  }
}

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: __dirname });
});

app.post("/auth/register", registerAuthHandler);
app.post("/auth/login", loginAuthHandler);
app.post('/auth/logout', authMiddlewareHandler, logoutAuthHandler);
app.get('/auth/profile', authMiddlewareHandler, getProfileAuthHandler);

app.post('/auth/api_token', authMiddlewareHandler, getgenerateAPIHandler);
app.get('/auth/list-tokens', authMiddlewareHandler, generateListAPIHandler);
app.delete('/auth/api_token/:token', authMiddlewareHandler, deleteAPITokenHandler);

app.post("/shorten", apiMiddlewareHandler, rateLimiterMiddleware, createShortUrlHandler);
app.post("/shorten/batch", apiMiddlewareHandler, rateLimiterMiddleware, createBatchShortURLsHandler);
app.post("/ext/shorten/batch",  rateLimiterMiddleware, createBatchShortURLsHandler);
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
