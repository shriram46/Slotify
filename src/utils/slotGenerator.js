// Utility function to generate time slots for a given date
const generateSlots = (date, startTime, endTime, intervalMinutes) => {
  const slots = [];

  // Convert HH:mm time string into total minutes
  const toMinutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  let start = toMinutes(startTime);
  const end = toMinutes(endTime);

  // Generate slots until end time is reached
  while (start + intervalMinutes <= end) {
    const slotStart = start;
    const slotEnd = start + intervalMinutes;

    // Convert minutes back to HH:mm format
    const formatTime = (mins) => {
      const h = String(Math.floor(mins / 60)).padStart(2, "0");
      const m = String(mins % 60).padStart(2, "0");
      return `${h}:${m}`;
    };

    slots.push({
      date,
      startTime: formatTime(slotStart),
      endTime: formatTime(slotEnd)
    });

    start = slotEnd;
  }

  return slots;
};

module.exports = generateSlots;
