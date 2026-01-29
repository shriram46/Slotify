const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    isBooked: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

/**
 * Prevent duplicate slots for same date & time
 */
slotSchema.index(
  { date: 1, startTime: 1, endTime: 1 },
  { unique: true }
);

module.exports = mongoose.model("Slot", slotSchema);
