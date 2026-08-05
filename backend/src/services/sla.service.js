/**
 * Service to calculate SLA Business Hours.
 * Business Hours: Monday to Friday, 08:00 to 17:00 (9 hours per business day).
 */

const SLA_WARN_HOURS = 24;
const SLA_CRIT_HOURS = 48;

function getBusinessHoursBetween(startInput, endInput = new Date()) {
  const start = new Date(startInput);
  const end = new Date(endInput);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return 0;
  }

  let totalHours = 0;
  let current = new Date(start);

  while (current < end) {
    const dayOfWeek = current.getDay(); // 0 = Sun, 6 = Sat, 1..5 = Mon..Fri

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dayStart = new Date(current);
      dayStart.setHours(8, 0, 0, 0);

      const dayEnd = new Date(current);
      dayEnd.setHours(17, 0, 0, 0);

      const effectiveStart = Math.max(current.getTime(), dayStart.getTime());
      const effectiveEnd = Math.min(end.getTime(), dayEnd.getTime());

      if (effectiveEnd > effectiveStart) {
        totalHours += (effectiveEnd - effectiveStart) / (1000 * 60 * 60);
      }
    }

    // Move to next day 00:00:00
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return totalHours;
}

const getSlaStatus = (updatedAt) => {
  const diffHours = getBusinessHoursBetween(updatedAt, new Date());
  if (diffHours >= SLA_CRIT_HOURS) return 'critical';
  if (diffHours >= SLA_WARN_HOURS) return 'warning';
  return 'ok';
};

module.exports = {
  getBusinessHoursBetween,
  getSlaStatus,
  SLA_WARN_HOURS,
  SLA_CRIT_HOURS,
};
