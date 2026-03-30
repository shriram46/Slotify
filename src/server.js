require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 5000;

// Crash handlers FIRST
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", {
    message: err.message,
    stack: err.stack
  });
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection", {
    message: err?.message || err,
    stack: err?.stack
  });
  process.exit(1);
});

// Optional startup log
logger.info("Starting server...");

// Health route with safe requestId
app.get("/", (req, res) => {
  logger.info("Health check hit", {
    requestId: req.requestId || "N/A"
  });
  res.send("API running");
});

// Start server ONLY after DB connects
(async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info("Server started successfully", {
        port: PORT,
        env: process.env.NODE_ENV || "development"
      });
    });

  } catch (err) {
    logger.error("Server startup failed - DB connection error", {
      message: err.message,
      stack: err.stack
    });
    process.exit(1);
  }
})();