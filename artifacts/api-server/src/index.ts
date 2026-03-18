// Validate required environment variables before anything else
const REQUIRED_ENV_VARS = ["PORT", "DATABASE_URL", "JWT_SECRET"] as const;

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[STARTUP] Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

import app from "./app.js";

const port = Number(process.env["PORT"]);

if (Number.isNaN(port) || port <= 0) {
  console.error(`[STARTUP] Invalid PORT value: "${process.env["PORT"]}"`);
  process.exit(1);
}

app.listen(port, () => {
  console.log(`[STARTUP] Server listening on port ${port}`);
  console.log(`[STARTUP] NODE_ENV: ${process.env.NODE_ENV ?? "not set"}`);
  console.log(`[STARTUP] JWT_SECRET: configured ✓`);
  console.log(`[STARTUP] DATABASE_URL: configured ✓`);
});

process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception:", err.message, err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled rejection:", reason);
  process.exit(1);
});
