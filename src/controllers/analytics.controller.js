const Slot = require("../models/Slot");
const logger = require("../utils/logger");

/**
 * Get slot analytics for a specific date.
 * 
 * Query Params:
 *  - date (YYYY-MM-DD)
 * 
 * Returns:
 *  - Total slots
 *  - Booked vs Available count
 *  - Booking rate (%)
 *  - Past booked vs Upcoming booked slots (based on current time)
 */
exports.getSlotAnalytics = async (req, res) => {
  try {
    const { date } = req.query;

    // Fetch all slots for the given date
    const allSlots = await Slot.find({ date });

    // Separate booked and available slots
    const booked = allSlots.filter(s => s.isBooked);
    const available = allSlots.filter(s => !s.isBooked);

    // Current server time (used to classify past vs upcoming slots)
    const now = new Date();

    /**
     * A booked slot is considered "past" if its start time
     * is earlier than the current time.
     */
    const pastBooked = booked.filter(slot => {
      const slotTime = new Date(`${slot.date}T${slot.startTime}:00`);
      return slotTime < now;
    });

    /**
     * A booked slot is considered "upcoming" if its start time
     * is greater than or equal to the current time.
     */
    const upcomingBooked = booked.filter(slot => {
      const slotTime = new Date(`${slot.date}T${slot.startTime}:00`);
      return slotTime >= now;
    });

    // Calculate booking rate percentage
    const bookingRate =
      allSlots.length > 0
        ? `${Math.round((booked.length / allSlots.length) * 100)}%`
        : "0%";

    logger.info("Slot analytics fetched", {
      requestId: req.requestId,
       date,
      totalSlots: allSlots.length,
      bookedSlots: booked.length,
      availableSlots: available.length,
      bookingRate,
      pastBookedSlots: pastBooked.length,
      upcomingBookedSlots: upcomingBooked.length
    });

    // Send structured analytics response
    return res.json({
      date,
      totalSlots: allSlots.length,
      bookedSlots: booked.length,
      availableSlots: available.length,
      bookingRate,
      pastBookedSlots: pastBooked.length,
      upcomingBookedSlots: upcomingBooked.length
    });

  } catch (err) {
    logger.error("Fetch analytics failed", {
      requestId: req.requestId,
      date: req.query?.date,
      errorMessage: err.message,
      stack: err.stack
    });

    // Centralized error response for unexpected failures
    return res.status(500).json({
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch analytics"
      }
    });
  }
};