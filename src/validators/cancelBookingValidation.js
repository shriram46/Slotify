/**
 * Validates whether a slot can be cancelled
 * Rules:
 * - User must cancel own booking
 * - Cannot cancel past slot
 * - Must cancel at least 24 hours before slot time
 */
function validateCancellation(slot, userId) {
  if (!slot || !slot.isBooked || slot.bookedBy?.toString() !== userId) {
    return { valid: false, error: "CANCEL_NOT_ALLOWED" };
  }

  const slotDateTime = new Date(`${slot.date}T${slot.startTime}:00`);

  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  if (slotDateTime < now) {
    return { valid: false, error: "PAST_SLOT" };
  }

  const cancelDeadline = new Date(
    slotDateTime.getTime() - 24 * 60 * 60 * 1000
  );

  if (now > cancelDeadline) {
    return { valid: false, error: "CANCEL_WINDOW_CLOSED" };
  }

  return { valid: true };
}

module.exports = { validateCancellation };