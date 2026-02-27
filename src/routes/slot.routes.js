const express = require("express");
const Slot = require("../models/Slot");
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const generateSlots = require("../utils/slotGenerator");
const { isSlotAtLeast30MinAhead, validateSlotDate } = require("../validators/slotTimeValidation");
const { validateSlotCreationInput } = require("../validators/slotCreationValidator");

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

    // Validate input using validator
const validation = validateSlotCreationInput({
  date,
  startTime,
  endTime,
  intervalMinutes
});

if (!validation.valid) {
  const errorMap = {
    ALL_FIELDS_REQUIRED: "All fields are required",
    INVALID_DATE_FORMAT: "Date must be YYYY-MM-DD",
    INVALID_DATE: "Invalid date",
    PAST_DATE: "Past dates are not allowed",
    INVALID_TIME_FORMAT: "Time must be HH:mm",
    INVALID_TIME_RANGE: "Start time must be before end time",
    INVALID_INTERVAL: "Interval must be greater than 0",
    INTERVAL_TOO_LARGE: "Interval too large"
  };

  return res.status(400).json({
    error: {
      code: validation.error,
      message: errorMap[validation.error]
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
      // Check existing slots for same date + startTime
const existingSlots = await Slot.find({
  date,
  startTime: { $in: slots.map(s => s.startTime) }
}).select("startTime");

// Convert existing startTimes to Set for fast lookup
const existingStartTimes = new Set(
  existingSlots.map(s => s.startTime)
);

// Filter only new slots (remove duplicates)
const newSlots = slots.filter(
  s => !existingStartTimes.has(s.startTime)
);

// If nothing new to insert
if (newSlots.length === 0) {
  return res.status(409).json({
    error: {
      code: "SLOTS_ALREADY_EXIST",
      message: "All slots already exist for this range"
    }
  });
}

// Insert only new slots
await Slot.insertMany(newSlots);

return res.status(201).json({
  message: "Slots created successfully",
  created: newSlots.length,
  skippedDuplicates: slots.length - newSlots.length
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
 try { 
  const { date } = req.query;

  // Validate date
    const validation = validateSlotDate(date);
    if (!validation.valid) {
      const errorMap = {
        INVALID_DATE_FORMAT: "Date must be in YYYY-MM-DD format",
        INVALID_DATE: "Invalid date",
        PAST_DATE: "Past dates are not allowed"
      };
      return res.status(400).json({
        error: {
          code: validation.error,
          message: errorMap[validation.error]
        }
      });
    }

  // Fetch available slots sorted by start time
  const slots = await Slot.find({
    date,
    isBooked: false
  }).sort({ startTime: 1 });

  let filteredSlots = slots;

  // Today -> apply 30-minute buffer
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).toISOString().split("T")[0];
    if (date === today) {
      filteredSlots = slots.filter(slot => {
        try {
          return isSlotAtLeast30MinAhead(date, slot.startTime);
        } catch {
          return false; // skip invalid time
        }
      });
    }

    return res.json(filteredSlots);
}  catch (err) {
    return res.status(500).json({
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch slots"
      }
    });
  }
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
    try {
    const { date } = req.query;

    const filter = { isBooked: true };
    if (date) filter.date = date;

    const bookings = await Slot.find(filter)
      .populate("bookedBy", "name email")
      .sort({ date: 1, startTime: 1 });

    return res.json(bookings);
  } catch (err) {
      return res.status(500).json({
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch bookings"
        }
      });
    }
  }
);

/**
 * DELETE /api/slots/:slotId/cancel
 * Patient cancels their booking
 */
router.delete(
  "/:slotId/cancel",
  authMiddleware,
  async (req, res) => {
    try {
    const { slotId } = req.params;

    const slot = await Slot.findOneAndUpdate(
      {
        _id: slotId,
        isBooked: true,
        bookedBy: req.user.userId
      },
      {
        isBooked: false,
        bookedBy: null
      },
      { new: true }
    );

    if (!slot) {
      return res.status(403).json({
        error: {
          code: "CANCEL_NOT_ALLOWED",
          message: "You can only cancel your own booked slot"
        }
      });
    }

    return res.status(200).json({
      message: "Booking cancelled successfully",
      slot
    });
  } catch (err) {
      console.error("Cancel booking error:", err); // server log

      return res.status(500).json({
        error: {
          code: "SERVER_ERROR",
          message: "Failed to cancel booking"
        }
      });
    }
  }
);

/**
 * DELETE /api/slots/:slotId
 * Allows admin to delete an unbooked slot
 * Access: Protected (Admin only)
 */
router.delete(
  "/:slotId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try{
    const { slotId } = req.params;

    const slot = await Slot.findById(slotId);

    if (!slot) {
      return res.status(404).json({
        error: {
          code: "SLOT_NOT_FOUND",
          message: "Slot not found"
        }
      });
    }

    if (slot.isBooked) {
      return res.status(400).json({
        error: {
          code: "SLOT_ALREADY_BOOKED",
          message: "Booked slots cannot be deleted"
        }
      });
    }

    await Slot.deleteOne({ _id: slotId });

    return res.json({
      message: "Slot deleted successfully"
    });
  } catch (err) {
      console.error("Delete slot error:", err);

      return res.status(500).json({
        error: {
          code: "SERVER_ERROR",
          message: "Failed to delete slot"
        }
      });
    }
  }
);

module.exports = router;
