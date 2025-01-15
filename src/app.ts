import express from "express";
import { Request, Response, NextFunction } from "express";
import { UrlController } from "./controllers/urlController";
import { RateLimitter } from "./middleware/rateLimiter";
import {
  register,
  httpRequestDurationMicroseconds,
} from "./monitoring/metrics";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { UuidService } from "./services/uuidServices";
import { AuthController } from "./controllers/authController";
import { AuthMiddleware } from "./middleware/authMiddleware";
import { ApiTokenMiddleware } from "./middleware/apiTokenMiddleware";
import { urlQueue, queueOptions, authQueue, apiQueue } from "./config/queue";
import "./workers/worker";

const app = express();

app.use(express.json());
app.use(cookieParser());

const corsOptions = {
  origin: [
    "https://www.shortlycut.xyz",
    "https://shortlycut.xyz",
    "http://localhost:5173",
    "*",
  ],
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
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await UrlController.shortenBatchURLs(req, res);
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

const apiMiddlewareHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await ApiTokenMiddleware.authenticate(req, res, next);
  } catch (error) {
    next(error);
  }
};

app.get("/", async (req, res) => {
  // res.sendFile("index.html", { root: __dirname });
  const rootDir = path.join(__dirname);
  try {
    console.log("Recieved request to render index.html");

    const job = await urlQueue.add(
      "renderIndex",
      { filePath: "index.html", rootDir },
      queueOptions
    );

    const result = await job.finished();

    if (result.success) {
      res.sendFile("index.html", { root: rootDir });
    } else {
      throw new Error("Failed to process rendering task.");
    }

    // console.log('Task added to the queue for rendering index.html');
  } catch (error) {
    console.error("Failed to added render task to the queue:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const jobData = {
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
    };

    const job = await authQueue.add("register", jobData, queueOptions);

    const result = await job.finished();

    if (result.success) {
      res.cookie("auth_token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.status(201).json({ user: result.user, token: result.token });
    } else {
      res.status(result.status).json({ error: result.error });
    }
  } catch (error) {
    console.error("Error adding register task:", error);
    res.status(500).json(error);
  }
});
app.post("/auth/login", async (req, res) => {
  try {
    const jobData = {
      body: req.body,
      cookies: req.cookies,
      headers: {
        "user-agent": req.headers["user-agent"],
      },
    };

    const job = await authQueue.add("login", jobData);

    const result = await job.finished();

    if (result.token) {
      res.cookie("auth_token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      res.json(result);
    } else {
      res.status(401).json({ error: result.error });
    }
  } catch (error) {
    console.error("Error adding login task:", error);
    res.status(500).json(error);
  }
});
app.post("/auth/logout", async (req, res, next) => {
  try {
    const jobData = {
      token: req.headers["authorization"],
      userId: req.user?.id,
    };
    const job = await authQueue.add("logout", jobData);
    const result = await job.finished();
    if (result.success) {
      res.clearCookie("auth_token");
      res.json({ message: "Logged out successfully" });
    } else {
      res.status(result.status).json({ error: result.error });
    }
  } catch (error) {
    console.error("Error adding logout task:", error);
    res.status(500).json(error);
  }
});
app.get("/auth/profile", async (req, res, next) => {
  try {
    console.log("Received request for /auth/profile");
    // await authQueue.add("profile", { req, res, next }, queueOptions);
    const jobData = {
      token: req.headers["authorization"],
    };

    const job = await authQueue.add("profile", jobData, queueOptions);

    const result = await job.finished();

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(result.status).json({ error: result.error });
    }
    console.log("Profile task added to queue.");
  } catch (error) {
    console.error("Error adding profile task:", error);
    res.status(500).json(error);
  }
});

app.post("/auth/api_token", async (req, res, next) => {
  try {
    console.log("Recieved Request for /auth/api_token");
    // await apiQueue.add("generate-api-token", { req, res, next }, queueOptions);
    const jobData = {
      token: req.headers["authorization"],
    };

    const job = await apiQueue.add("generate-api-token", jobData, queueOptions);

    const result = await job.finished();

    if (result.success) {
      res.json({ tokens: result.apiToken });
    } else {
      res.status(result.status).json({ error: result.error });
    }
    console.log("Generating API_TOKEN task added to queue");
  } catch (error) {
    console.error("Error adding generating API_TOKEN task: ", error);
    res.status(500).json(error);
  }
});

app.get("/auth/list-tokens", async (req, res, next) => {
  try {
    console.log("Recieved request from /auth/list-tokens");
    const jobData = {
      token: req.headers["authorization"],
    };

    const job = await apiQueue.add("list-tokens", jobData, queueOptions);
    const result = await job.finished();
    if (result.success) {
      res.json({ tokens: result.tokens });
    } else {
      res.status(result.status).json({ error: result.error });
    }
    console.log("Listing tokens added sucessfully");
  } catch (error) {
    console.error("Error adding listing API_TOKEN task: ", error);
    res.status(500).json(error);
  }
});
app.delete("/auth/api_token/:token", async (req, res, next) => {
  try {
    console.log("Recieved request from deleting /auth/api_token/:token");
    const jobData = {
      token: req.headers["authorization"],
      tokenId: req.params.token,
    };

    const job = await apiQueue.add("delete-token-id", jobData, queueOptions);

    const result = await job.finished();

    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(result.status).json({ error: result.error });
    }
    console.log("Deleteing API Token added sucessfully");
  } catch (error) {
    console.error("Error in deleting API token ...");
    res.status(500).json(error);
  }
});

app.post(
  "/shorten",
  apiMiddlewareHandler,
  rateLimiterMiddleware,
  createShortUrlHandler
);
app.post(
  "/shorten/batch",
  apiMiddlewareHandler,
  rateLimiterMiddleware,
  createBatchShortURLsHandler
);
app.post(
  "/ext/shorten/batch",
  rateLimiterMiddleware,
  createBatchShortURLsHandler
);
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
