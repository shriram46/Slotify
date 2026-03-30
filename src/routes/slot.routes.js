const express = require("express");
const Slot = require("../models/Slot");
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const generateSlots = require("../utils/slotGenerator");
const { isSlotAtLeast30MinAhead, validateSlotDate, validateDate } = require("../validators/slotTimeValidation");
const { validateSlotCreationInput } = require("../validators/slotCreationValidator");
const { validateCancellation } = require("../validators/cancelBookingValidation");
const { isValidObjectId } = require("../validators/objectIdValidator");
const { getSlotAnalytics } = require("../controllers/analytics.controller");
const logger = require("../utils/logger");

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

    logger.info("Create slots request received", {
      requestId: req.requestId,
      date
    });

    // Validate input using validator
const validation = validateSlotCreationInput({
  date,
  startTime,
  endTime,
  intervalMinutes
});

if (!validation.valid) {
  logger.warn("Slot creation validation failed", {
    requestId: req.requestId,
    errorCode: validation.error,
    date
  });

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
      logger.warn("No slots generated", {
        requestId: req.requestId,
        date
      });

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
  logger.warn("All slots already exist", {
    requestId: req.requestId,
    date
  });

  return res.status(409).json({
    error: {
      code: "SLOTS_ALREADY_EXIST",
      message: "All slots already exist for this range"
    }
  });
}

// Insert only new slots
await Slot.insertMany(newSlots);

logger.info("Slots created", {
  requestId: req.requestId,
  date,
  created: newSlots.length,
  skippedDuplicates: slots.length - newSlots.length
});

return res.status(201).json({
  message: "Slots created successfully",
  created: newSlots.length,
  skippedDuplicates: slots.length - newSlots.length
});
    } catch (err) {
      logger.error("Slot creation failed", {
        requestId: req.requestId,
        date,
        errorMessage: err.message,
        stack: err.stack
      });

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

  logger.info("Fetch slots request received", {
    requestId: req.requestId,
    date
  });

  // Validate date
    const validation = validateSlotDate(date);
    if (!validation.valid) {
      logger.warn("Invalid slot date", {
        requestId: req.requestId,
        date,
        errorCode: validation.error
      });

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

    logger.info("Slots fetched", {
      requestId: req.requestId,
      date,
      count: filteredSlots.length
    });

    return res.json(filteredSlots);
}  catch (err) {
    logger.error("Fetch slots failed", {
      requestId: req.requestId,
      errorMessage: err.message,
      stack: err.stack
    });

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

    logger.info("Fetch bookings request received", {
      requestId: req.requestId,
      date: date || "ALL"
    });

    const filter = { isBooked: true };
    if (date) filter.date = date;

    const bookings = await Slot.find(filter)
      .populate("bookedBy", "name email")
      .sort({ date: 1, startTime: 1 });

    logger.info("Bookings fetched", {
      requestId: req.requestId,
      count: bookings.length
    });

    return res.json(bookings);
  } catch (err) {
      logger.error("Fetch bookings failed", {
        requestId: req.requestId,
        errorMessage: err.message,
        stack: err.stack
      });

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

    logger.info("Cancel booking request received", {
      requestId: req.requestId,
      slotId
    });

    // ObjectId validation
    if (!isValidObjectId(slotId)) {
      logger.warn("Invalid slotId for cancellation", {
        requestId: req.requestId,
        slotId
      });

       return res.status(400).json({
       error: {
       code: "INVALID_SLOT_ID",
       message: "Invalid slot ID"
      }
      });
   }

    // Step 1: Find the slot 
const slot = await Slot.findById(slotId);

// Check Slot
 if (!slot) {
  logger.warn("Slot not found for cancellation", {
    requestId: req.requestId,
    slotId
  });

  return res.status(404).json({
    error: {
      code: "SLOT_NOT_FOUND",
      message: "Slot not found"
    }
  });
}
// Step 2: Validate cancellation rules
const validation = validateCancellation(slot, req.user.userId);

if (!validation.valid) {
  logger.warn("Cancellation validation failed", {
    requestId: req.requestId,
    slotId,
    errorCode: validation.error
  });

  const errorMap = {
    CANCEL_NOT_ALLOWED: "You can only cancel your own booked slot",
    PAST_SLOT: "Cannot cancel past slot",
    CANCEL_WINDOW_CLOSED: "Cancellation allowed only 24 hours before slot time"
  };

  return res.status(400).json({
    error: {
      code: validation.error,
      message: errorMap[validation.error]
    }
  });
}

// Step 3: Cancel booking
slot.isBooked = false;
slot.bookedBy = null;
await slot.save();

logger.info("Booking cancelled", {
  requestId: req.requestId,
  slotId
});

    return res.status(200).json({
      message: "Booking cancelled successfully",
      slot
    });
  } catch (err) {
      logger.error("Cancel booking failed", {
        requestId: req.requestId,
        errorMessage: err.message,
        stack: err.stack
      });

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

    logger.info("Delete slot request received", {
      requestId: req.requestId,
      slotId
    });

    //  ObjectId Validation
    if (!isValidObjectId(slotId)) {
  logger.warn("Invalid slotId for delete", {
    requestId: req.requestId,
    slotId
  });

  return res.status(400).json({
    error: {
      code: "INVALID_SLOT_ID",
      message: "Invalid slot ID"
    }
  });
}

    const slot = await Slot.findById(slotId);

    if (!slot) {
      logger.warn("Slot not found for delete", {
        requestId: req.requestId,
        slotId
      });

      return res.status(404).json({
        error: {
          code: "SLOT_NOT_FOUND",
          message: "Slot not found"
        }
      });
    }

    if (slot.isBooked) {
      logger.warn("Attempt to delete booked slot", {
        requestId: req.requestId,
        slotId
      });

      return res.status(400).json({
        error: {
          code: "SLOT_ALREADY_BOOKED",
          message: "Booked slots cannot be deleted"
        }
      });
    }

    await Slot.deleteOne({ _id: slotId });

    logger.info("Slot deleted", {
      requestId: req.requestId,
      slotId
    });

    return res.json({
      message: "Slot deleted successfully"
    });
  } catch (err) {
      logger.error("Delete slot failed", {
        requestId: req.requestId,
        errorMessage: err.message,
        stack: err.stack
      });

      return res.status(500).json({
        error: {
          code: "SERVER_ERROR",
          message: "Failed to delete slot"
        }
      });
    }
  }
);


/**
 * GET /api/slots/analytics?date=YYYY-MM-DD
 * Admin booking analytics for a given date
 */

router.get(
  "/analytics",
  authMiddleware,
  adminMiddleware,
  validateDate,
  getSlotAnalytics
);

module.exports = router;