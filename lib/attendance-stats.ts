type AttendanceRow = {
  date: Date;
  status: "PRESENT" | "ABSENT";
  hoursAttended?: number;
};

/** Number of days marked PRESENT */
export function presentCount(rows: AttendanceRow[]) {
  return rows.filter((r) => r.status === "PRESENT").length;
}

/** Screen-free hours from present days (defaults to 2h per present mark) */
export function presentHours(rows: AttendanceRow[]) {
  return rows.reduce((sum, row) => {
    if (row.status !== "PRESENT") return sum;
    const hours = row.hoursAttended ?? 2;
    return sum + Math.max(0, hours);
  }, 0);
}

/**
 * Consecutive present classes counting backward from the most recent mark.
 * An ABSENT breaks the streak; unmarked weekends do not (they're not in the list).
 */
export function consecutiveClassStreak(rows: AttendanceRow[]) {
  const marked = [...rows].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
  let streak = 0;
  for (const row of marked) {
    if (row.status === "PRESENT") streak += 1;
    else break;
  }
  return streak;
}

/** Consecutive calendar weeks with at least one PRESENT, ending at most recent present week */
export function consistencyStreakWeeks(rows: AttendanceRow[]) {
  const presentDates = rows
    .filter((r) => r.status === "PRESENT")
    .map((r) => r.date)
    .sort((a, b) => b.getTime() - a.getTime());

  if (presentDates.length === 0) return 0;

  const weekKey = (d: Date) => {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = x.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    x.setUTCDate(x.getUTCDate() + mondayOffset);
    return x.toISOString().slice(0, 10);
  };

  const weeks = [...new Set(presentDates.map(weekKey))];
  let streak = 1;
  for (let i = 0; i < weeks.length - 1; i++) {
    const cur = new Date(weeks[i]);
    const next = new Date(weeks[i + 1]);
    const diffDays = (cur.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 8) streak += 1;
    else break;
  }
  return streak;
}

export function monthGrid(year: number, monthIndex: number) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const startPad = (first.getUTCDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
