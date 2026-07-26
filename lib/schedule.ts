import { parseDateOnly } from "@/lib/dates";

/** Gentle Sprouts runs Mon–Fri by default; Sat/Sun are off unless an extra class is logged. */
export function isWeekendDate(date: Date | string) {
  const d = typeof date === "string" ? parseDateOnly(date) : date;
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

export function weekendLabel(date: Date | string) {
  const d = typeof date === "string" ? parseDateOnly(date) : date;
  return d.getUTCDay() === 0 ? "Sunday" : "Saturday";
}
