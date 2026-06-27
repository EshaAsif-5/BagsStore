import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import ApiError from "./utils/ApiError.js";
import routes from "./routes/index.js";
import { allowedOrigins, settings } from "./config/settings.js";

const app = express();

// ─────────────────────────────────────────────
// SECURITY HEADERS
// ─────────────────────────────────────────────
app.use(helmet());
// ─────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────
const allowedOriginsList = allowedOrigins;

const corsOptions = {
  origin(origin, callback) {
    // Allow Postman, curl, mobile apps
    if (!origin) return callback(null, true);

    if (allowedOriginsList.includes(origin)) {
      return callback(null, true);
    }

    console.log("❌ Blocked Origin:", origin);
    console.log("✅ Allowed Origins:", allowedOriginsList);

    return callback(new Error(`CORS: Origin '${origin}' not allowed.`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-guest-session-id",
  ],
};

app.use(cors(corsOptions));

// Handle browser preflight requests

// ─────────────────────────────────────────────
// BODY PARSERS
// ─────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));         // Reject oversized JSON payloads
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─────────────────────────────────────────────
// COOKIE PARSER
// ─────────────────────────────────────────────
app.use(cookieParser());

// ─────────────────────────────────────────────
// HTTP PARAMETER POLLUTION PROTECTION
// ─────────────────────────────────────────────
app.use(hpp());

// ─────────────────────────────────────────────
// REQUEST LOGGER (dev only)
// ─────────────────────────────────────────────
if (settings.nodeEnv === "development") {
  app.use(morgan("dev"));
}

// ─────────────────────────────────────────────
// GLOBAL RATE LIMITER (general API)
// ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: settings.rateLimit.windowMs,
  max: settings.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again after 15 minutes.",
  },
});
app.use("/api", globalLimiter);

// ─────────────────────────────────────────────
// STRICTER RATE LIMITER (auth routes)
// Defined in middleware/authLimiter.middleware.js
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ZEE.BY ZUNAISHA API is running.",
    environment: settings.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────
// API ROUTES  (imported and mounted here as built)
// ─────────────────────────────────────────────
app.use("/api/v1", routes);

// ─────────────────────────────────────────────
// 404 HANDLER — unmatched routes
// ─────────────────────────────────────────────
app.use((req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// ─────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `Duplicate value for '${field}'. Please use a different value.`;
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Your session has expired. Please log in again.";
  }

  // Log stack trace in development only
  if (settings.nodeEnv === "development") {
    console.error("❌ ERROR:", err);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    ...(settings.nodeEnv === "development" && { stack: err.stack }),
  });
});

export default app;
