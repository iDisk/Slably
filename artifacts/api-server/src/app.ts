import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";

const app: Express = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server calls (no origin header) and same-origin proxied calls
      if (!origin) return callback(null, true);
      // Allow all *.replit.dev and *.repl.co subdomains in development
      if (
        process.env.NODE_ENV !== "production" &&
        (origin.endsWith(".replit.dev") ||
          origin.endsWith(".repl.co") ||
          origin.startsWith("http://localhost"))
      ) {
        return callback(null, true);
      }
      // Allow explicitly configured origins
      if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // In development with no explicit list, allow all (Replit proxy)
      if (process.env.NODE_ENV !== "production" && allowedOrigins.length === 0) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin "${origin}" not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  _res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.path} ${_res.statusCode} ${ms}ms`);
  });
  next();
});

// Global rate limiter — defensive baseline for all routes
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(globalLimiter);

import router from "./routes/index.js";
app.use("/api", router);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler — must have 4 params so Express recognizes it
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as any).status ?? 500;
  const isDev = process.env.NODE_ENV !== "production";
  console.error(`[ERROR] ${err.message}`, isDev ? err.stack : "");
  res.status(status).json({
    error: isDev ? err.message : "Internal server error",
  });
});

export default app;
