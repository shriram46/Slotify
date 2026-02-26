/**
 * Checks if the slot time is at least 30 minutes ahead of the current time 
 */
function isSlotAtLeast30MinAhead(date, startTime) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const slotDateTime = new Date(`${date}T${startTime}:00`);
  const minAllowed = new Date(now.getTime() + 30 * 60000);

  return slotDateTime >= minAllowed;
}

/**
 * Validate date string (YYYY-MM-DD) and not past date
 */
function validateSlotDate(date) {
  // Check format YYYY-MM-DD
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoRegex.test(date)) return { valid: false, error: "INVALID_DATE_FORMAT" };

  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const slotDate = new Date(`${date}T00:00:00`);
  
  if (isNaN(slotDate.getTime())) return { valid: false, error: "INVALID_DATE" };

  // Past date check
  if (slotDate < today.setHours(0,0,0,0)) return { valid: false, error: "PAST_DATE" };

  return { valid: true };
}

module.exports = { isSlotAtLeast30MinAhead, validateSlotDate };