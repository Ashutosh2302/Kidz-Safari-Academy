/** Monday 00:00 UTC of the week containing `date` (used for streaks, not hour goals) */
export function startOfWeekUTC(date = new Date()) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  return d;
}

/**
 * Rolling last-7-days window ending today (UTC calendar days),
 * not a Monday–Sunday term/calendar week.
 */
export function isInCurrentWeek(date: Date, now = new Date()) {
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  return date >= start && date < end;
}

export function weekHoursTarget() {
  // Soft weekly goal: ~2–3 full (2h) classes in a rolling 7-day window
  return 6;
}
