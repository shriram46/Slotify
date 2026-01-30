const express = require("express");
const Slot = require("../models/Slot");
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const generateSlots = require("../utils/slotGenerator");

const router = express.Router();

/**
 * POST /api/slots
 * Allows admin users to generate available time slots for a given date
 * Access: Protected (Admin only)
 */
router.post(
  "/",
  authMiddleware,     // Verifies JWT and attaches user info to request
  adminMiddleware,    // Ensures only admin users can access this route
  async (req, res) => {
    const { date, startTime, endTime, intervalMinutes } = req.body;

    // Validate required input fields
    if (!date || !startTime || !endTime || !intervalMinutes) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "All fields are required"
        }
      });
    }

    // Generate slots based on provided time range and interval
    const slots = generateSlots(
      date,
      startTime,
      endTime,
      intervalMinutes
    );

    // Handle case where no valid slots could be generated
    if (slots.length === 0) {
      return res.status(400).json({
        error: {
          code: "NO_SLOTS",
          message: "No valid slots generated"
        }
      });
    }

    try {
      // Persist generated slots in the database
      await Slot.insertMany(slots, { ordered: false });

      return res.status(201).json({
        message: "Slots created successfully",
        totalSlots: slots.length
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          error: {
            code: "SLOTS_ALREADY_EXIST",
            message: "Slots already exist for this date and time range"
          }
        });
      }

      return res.status(500).json({
        error: {
          code: "SERVER_ERROR",
          message: "Failed to create slots"
        }
      });
    }
  }
);

/**
 * GET /api/slots?date=YYYY-MM-DD
 * Returns all available (not booked) slots for a given date
 * Access: Protected (Authenticated users)
 */
router.get("/", authMiddleware, async (req, res) => {
  const { date } = req.query;

  // Date is mandatory to fetch slots
  if (!date) {
    return res.status(400).json({
      error: {
        code: "INVALID_INPUT",
        message: "Date is required"
      }
    });
  }

  // Fetch available slots sorted by start time
  const slots = await Slot.find({
    date,
    isBooked: false
  }).sort({ startTime: 1 });

  return res.json(slots);
});

/**
 * GET /api/slots/bookings
 * Admin views all booked slots
 */
router.get(
  "/bookings",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const { date } = req.query;

    const filter = { isBooked: true };
    if (date) filter.date = date;

    const bookings = await Slot.find(filter)
      .populate("bookedBy", "name email")
      .sort({ date: 1, startTime: 1 });

    return res.json(bookings);
  }
);

module.exports = router;
