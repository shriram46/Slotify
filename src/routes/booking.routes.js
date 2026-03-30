const express = require("express");
const Slot = require("../models/Slot");
const authMiddleware = require("../middleware/auth.middleware");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * POST /api/bookings/:slotId
 * Patient books a slot
 */
router.post("/:slotId", authMiddleware, async (req, res) => {
  const { slotId } = req.params;
  const userId = req.user.userId;

  // Log booking attempt
  logger.info("Booking attempt", {
    slotId,
    userId,
    requestId: req.requestId
  });

  // Validate slotId format before querying DB (prevents CastError on invalid ObjectId)
  if (!mongoose.Types.ObjectId.isValid(slotId)) {

     logger.warn("Invalid slotId format", {
      slotId,
      userId,
      requestId: req.requestId
    });

    return res.status(400).json({
      error: {
        code: "INVALID_SLOT_ID",
        message: "Invalid slot ID"
      }
    });
  }

  try {
    const slot = await Slot.findOneAndUpdate(
      {
        _id: slotId,
        isBooked: false, // critical condition
      },
      {
        isBooked: true,
        bookedBy: userId,
      },
      {
        new: true,
      }
    );

    if (!slot) {

  //  Check if slot exists at all
  const existingSlot = await Slot.findById(slotId);

  if (!existingSlot) {

    logger.warn("Slot not found during booking", {
          slotId,
          userId,
          requestId: req.requestId
    });

    return res.status(404).json({
      error: {
        code: "SLOT_NOT_FOUND",
        message: "Slot not found"
      }
    });
  }

  //  Booked by same user
  if (existingSlot.bookedBy?.toString() === userId) {

    logger.warn("Slot already booked by same user", {
          slotId,
          userId,
          requestId: req.requestId
    });

    return res.status(409).json({
      error: {
        code: "ALREADY_BOOKED_BY_YOU",
        message: "You have already booked this slot"
      }
    });
  }

  //  Booked by someone else

   logger.warn("Slot already booked by another user", {
        slotId,
        userId,
        requestId: req.requestId
    });

  return res.status(409).json({
    error: {
      code: "SLOT_ALREADY_BOOKED",
      message: "This slot is no longer available"
    }
  });
}

    // Success log
    logger.info("Booking successful", {
      slotId: slot._id,
      userId,
      requestId: req.requestId
    });


    return res.status(200).json({
      message: "Slot booked successfully",
      slotId: slot._id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  } catch (err) {

    logger.error("Booking failed", {
      slotId,
      userId,
      message: err.message,
      stack: err.stack,
      requestId: req.requestId
    });

    return res.status(500).json({
      error: {
        code: "SERVER_ERROR",
        message: "Failed to book slot",
      },
    });
  }
});

/**
 * GET /api/my-bookings
 * Patient views their bookings
 */
router.get("/my-bookings", authMiddleware, async (req, res) => {
  
  // Log fetch attempt
  logger.info("Fetch user bookings", {
    userId: req.user.userId,
    requestId: req.requestId
  });
  
  try {
  const bookings = await Slot.find({
    bookedBy: req.user.userId
  }).sort({ date: 1, startTime: 1 });

  // Success log
    logger.info("Fetched user bookings successfully", {
      userId: req.user.userId,
      count: bookings.length,
      requestId: req.requestId
    });

  return res.json(bookings);
} catch (err) {

    logger.error("Failed to fetch bookings", {
      userId: req.user.userId,
      message: err.message,
      stack: err.stack,
      requestId: req.requestId
    });

    return res.status(500).json({
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch bookings",
      },
    });
  }
});

module.exports = router;