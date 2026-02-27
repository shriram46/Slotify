/**
 * Validates input data for creating time slots.
 *
 * Checks:
 * - All required fields are present
 * - Date format is YYYY-MM-DD and is a valid calendar date
 * - Date is not in the past (IST-safe)
 * - Time format is HH:mm (24-hour)
 * - Start time is earlier than end time
 * - Interval is a positive number and not greater than 120 minutes
 *
 * @param {Object} params
 * @param {string} params.date - Slot date in YYYY-MM-DD format
 * @param {string} params.startTime - Start time in HH:mm format (24-hour)
 * @param {string} params.endTime - End time in HH:mm format (24-hour)
 * @param {number|string} params.intervalMinutes - Interval between slots in minutes
 *
 * @returns {{ valid: boolean, error?: string }}
 * Returns valid: true if input passes all checks,
 * otherwise valid: false with an error code.
 */

function validateSlotCreationInput({ date, startTime, endTime, intervalMinutes }) {

  // Required fields check
  if (!date || !startTime || !endTime || !intervalMinutes) {
    return { valid: false, error: "ALL_FIELDS_REQUIRED" };
  }

  // Date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { valid: false, error: "INVALID_DATE_FORMAT" };
  }

  // Check valid calendar date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate)) {
    return { valid: false, error: "INVALID_DATE" };
  }

  // Past date check (IST safe)
  const today = new Date().toLocaleDateString("en-CA");
  if (date < today) {
    return { valid: false, error: "PAST_DATE" };
  }

  // Time format HH:mm
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return { valid: false, error: "INVALID_TIME_FORMAT" };
  }

  // start < end
  if (startTime >= endTime) {
    return { valid: false, error: "INVALID_TIME_RANGE" };
  }

  // Interval check
  const interval = Number(intervalMinutes);

  if (!interval || interval <= 0) {
    return { valid: false, error: "INVALID_INTERVAL" };
  }

  if (interval > 120) {
    return { valid: false, error: "INTERVAL_TOO_LARGE" };
  }

  return { valid: true };
}

module.exports = { validateSlotCreationInput };