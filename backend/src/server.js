import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ─────────────────────────────────────────────
// CONNECT TO DATABASE THEN START SERVER
// ─────────────────────────────────────────────
const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🛍️  ZEE.BY ZOHAIB — API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🌍  Environment : ${NODE_ENV}
  🚀  Port        : ${PORT}
  🔗  Health      : http://localhost:${PORT}/api/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  });

  // ─────────────────────────────────────────
  // GRACEFUL SHUTDOWN
  // ─────────────────────────────────────────
  const shutdown = (signal) => {
    console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log("✅ HTTP server closed.");
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      console.error("❌ Forced shutdown after timeout.");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // ─────────────────────────────────────────
  // UNHANDLED REJECTIONS & EXCEPTIONS
  // ─────────────────────────────────────────
  process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Promise Rejection at:", promise);
    console.error("   Reason:", reason);
    server.close(() => process.exit(1));
  });

  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error.message);
    console.error(error.stack);
    process.exit(1);
  });
};

startServer();