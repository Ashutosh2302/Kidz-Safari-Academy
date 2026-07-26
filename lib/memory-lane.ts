export type MemoryLaneRange = "week" | "month" | "lifetime";

export type MemoryLaneMedia = {
  id: string;
  url: string;
  isHighlight: boolean;
  sessionDate: string; // ISO
  sessionNote: string;
  isVideo: boolean;
};

/** @deprecated Use MemoryLaneMedia — kept for call-site clarity */
export type MemoryLanePhoto = MemoryLaneMedia;

const MONTH_CAP = 14;
const LIFETIME_CAP = 18;

/** Still-photo dwell time in the slideshow */
export const SLIDE_DURATION_MS = 4500;

/** Cap how long a video holds the Memory Lane stage before advancing */
export const VIDEO_MAX_MS = 9000;

function utcDayStart(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysAgoStart(days: number, now = new Date()) {
  const end = utcDayStart(now);
  end.setUTCDate(end.getUTCDate() - days);
  return end;
}

/** Evenly spaced indices across a list (preserves order). */
export function sampleEvenly<T extends { id: string }>(
  items: T[],
  max: number,
): T[] {
  if (items.length <= max) return items;
  if (max <= 0) return [];
  if (max === 1) return [items[Math.floor(items.length / 2)]];

  const picked: T[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < max; i++) {
    const idx = Math.round((i * (items.length - 1)) / (max - 1));
    const item = items[idx];
    if (!seen.has(item.id)) {
      seen.add(item.id);
      picked.push(item);
    }
  }
  for (const item of items) {
    if (picked.length >= max) break;
    if (!seen.has(item.id)) {
      seen.add(item.id);
      picked.push(item);
    }
  }
  return picked;
}

/**
 * Prefer teacher highlights, then fill with evenly spaced media by date.
 */
export function samplePreferringHighlights(
  photos: MemoryLaneMedia[],
  max: number,
): MemoryLaneMedia[] {
  const sorted = [...photos].sort(
    (a, b) => +new Date(a.sessionDate) - +new Date(b.sessionDate),
  );
  if (sorted.length <= max) return sorted;

  const highlights = sorted.filter((p) => p.isHighlight);
  const rest = sorted.filter((p) => !p.isHighlight);

  if (highlights.length >= max) {
    return sampleEvenly(highlights, max);
  }

  const needed = max - highlights.length;
  const fillers = sampleEvenly(rest, needed);
  return [...highlights, ...fillers].sort(
    (a, b) => +new Date(a.sessionDate) - +new Date(b.sessionDate),
  );
}

export function filterPhotosForRange(
  photos: MemoryLaneMedia[],
  range: MemoryLaneRange,
  joinedOn: string,
  now = new Date(),
): MemoryLaneMedia[] {
  const join = utcDayStart(new Date(joinedOn));
  const sorted = [...photos].sort(
    (a, b) => +new Date(a.sessionDate) - +new Date(b.sessionDate),
  );

  if (range === "week") {
    const start = daysAgoStart(7, now);
    return sorted.filter((p) => {
      const d = new Date(p.sessionDate);
      return d >= start && d >= join;
    });
  }

  if (range === "month") {
    const start = daysAgoStart(30, now);
    const inWindow = sorted.filter((p) => {
      const d = new Date(p.sessionDate);
      return d >= start && d >= join;
    });
    return samplePreferringHighlights(inWindow, MONTH_CAP);
  }

  const lifetime = sorted.filter((p) => new Date(p.sessionDate) >= join);
  return samplePreferringHighlights(lifetime, LIFETIME_CAP);
}

export function closingLineForRange(
  range: MemoryLaneRange,
  name: string,
  joinedOnLabel: string,
) {
  if (range === "week") return `That's ${name}'s week! 🌻`;
  if (range === "month") return `A month of tiny leaps with ${name} 🌱`;
  return `Growing with us since ${joinedOnLabel} 🌱`;
}

export const RANGE_LABELS: Record<MemoryLaneRange, string> = {
  week: "This Week",
  month: "This Month",
  lifetime: "Lifetime",
};

export function mediaCountLabel(count: number) {
  if (count === 1) return "1 moment";
  return `${count} moments`;
}
