/** Full Gentle Sprouts class length in hours */
export const DEFAULT_CLASS_HOURS = 2;

/** Short-stay override when a child only comes for part of class */
export const SHORT_CLASS_HOURS = 1;

export type ClassHours = typeof DEFAULT_CLASS_HOURS | typeof SHORT_CLASS_HOURS;

export function normalizeClassHours(value: number | null | undefined): ClassHours {
  return value === SHORT_CLASS_HOURS ? SHORT_CLASS_HOURS : DEFAULT_CLASS_HOURS;
}
