const express = require("express");
const Slot = require("../models/Slot");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * POST /api/bookings/:slotId
 * Patient books a slot
 */
router.post("/:slotId", authMiddleware, async (req, res) => {
  const { slotId } = req.params;
  const userId = req.user.userId;

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
      return res.status(409).json({
        error: {
          code: "SLOT_ALREADY_BOOKED",
          message: "This slot is no longer available",
        },
      });
    }

    return res.status(200).json({
      message: "Slot booked successfully",
      slotId: slot._id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  } catch (err) {
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
  try {
  const bookings = await Slot.find({
    bookedBy: req.user.userId
  }).sort({ date: 1, startTime: 1 });

  return res.json(bookings);
} catch (err) {
    return res.status(500).json({
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch bookings",
      },
    });
  }
});

module.exports = router;