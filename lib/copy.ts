/** Pluralize hour counts for parent-facing copy. */
export function screenFreeHoursLabel(
  hours: number,
  suffix = "since joining",
) {
  const unit = hours === 1 ? "hour" : "hours";
  return `${hours} screen-free ${unit} ${suffix}`;
}

export function hoursOfScreenFreePlayLabel(
  hours: number,
  suffix = "since joining",
) {
  const unit = hours === 1 ? "hour" : "hours";
  return `${hours} ${unit} of screen-free play ${suffix}`;
}

export function hoursOfPlayLabel(hours: number) {
  const unit = hours === 1 ? "hour" : "hours";
  return `${hours} ${unit} of real-world play`;
}

/** e.g. 1st, 2nd, 3rd, 4th */
export function ordinal(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** Natural parent copy — uses category, not the leap type's internal name. */
export function milestoneLeapDescription(name: string, category: string) {
  const byCategory: Record<string, string> = {
    "Nature Circle": `${name} took a big step in Nature Circle today.`,
    Rhymes: `${name} found their voice in rhyme time today.`,
    Stories: `${name} leaned into story time with new confidence.`,
    "Motor Skills": `${name} made a steady leap in movement today.`,
    "Social Play": `${name} practiced kindness with friends today.`,
    "Circle Time": `${name} took a big step in Circle Time today.`,
    Art: `${name} stretched creatively in Art today.`,
    Outdoor: `${name} grew a little braver outdoors today.`,
    Story: `${name} leaned into Story time with new confidence.`,
    "Music & Movement": `${name} moved with joy in Music & Movement today.`,
  };

  return (
    byCategory[category] ??
    `${name} took a big step in ${category} today.`
  );
}

/** Suggested leap categories for teacher create flow */
export const LEAP_CATEGORIES = [
  "Circle Time",
  "Nature Circle",
  "Art",
  "Social Play",
  "Outdoor",
  "Music & Movement",
  "Rhymes",
  "Stories",
  "Motor Skills",
] as const;

export const DEFAULT_LEAP_CATEGORY = "Circle Time";

/** Preset icons for new leaps — keeps parent view visually consistent */
export const LEAP_ICONS = [
  "🎨",
  "✏️",
  "💃",
  "🎵",
  "🌿",
  "🤝",
  "🚶",
  "📖",
  "🧱",
  "✋",
  "🌱",
  "🍃",
  "🗣️",
  "⭐",
  "🦁",
  "🦋",
] as const;

export const ACTIVITY_CATEGORIES = [
  "Circle Time",
  "Art",
  "Outdoor",
  "Story",
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export function isActivityCategory(value: string): value is ActivityCategory {
  return (ACTIVITY_CATEGORIES as readonly string[]).includes(value);
}
