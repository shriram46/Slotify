const express = require("express");
const authRoutes = require("./routes/auth.routes");
const slotRoutes = require("./routes/slot.routes");
const bookingRoutes = require("./routes/booking.routes");

// Added imports 
const logger = require("./utils/logger");
const { v4: uuidv4 } = require("uuid");
const morgan = require("morgan");

const app = express();

// Request ID middleware 
app.use((req, res, next) => {
  const requestId = uuidv4();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  next();
});

// Middleware to parse incoming JSON requests
app.use(express.json());

//  Morgan logger 
const stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

app.use(
  morgan((tokens, req, res) => {
    return JSON.stringify({
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: Number(tokens.status(req, res)),
      responseTime: `${tokens["response-time"](req, res)} ms`,
      requestId: req.requestId,
    });
  }, { stream })
);

// request start log 
app.use((req, res, next) => {
  logger.info("Incoming request", {
    method: req.method,
    url: req.originalUrl,
    requestId: req.requestId,
  });
  next();
});

// Authentication and user-related routes
app.use("/api/auth", authRoutes);

// Slot management routes (admin create, user view)
app.use("/api/slots", slotRoutes);

// Slot booking routes 
app.use("/api/bookings", bookingRoutes);

//  Global error handler 
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    requestId: req.requestId,
  });

  res.status(500).json({
    error: {
      code: "SERVER_ERROR",
      message: "Something went wrong",
      requestId: req.requestId,
    },
  });
});

module.exports = app;