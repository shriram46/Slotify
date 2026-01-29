const express = require("express");
const authRoutes = require("./routes/auth.routes");
const slotRoutes = require("./routes/slot.routes");
const bookingRoutes = require("./routes/booking.routes");

const app = express();

// Middleware to parse incoming JSON requests
app.use(express.json());

// Authentication and user-related routes
app.use("/api/auth", authRoutes);

// Slot management routes (admin create, user view)
app.use("/api/slots", slotRoutes);

// Slot booking routes 
app.use("/api/bookings", bookingRoutes);

module.exports = app;
