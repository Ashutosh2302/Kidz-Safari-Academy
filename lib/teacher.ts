/** Parent-facing teacher byline under session notes */
export function teacherAttribution(createdBy?: string | null) {
  const fromEnv = process.env.TEACHER_DISPLAY_NAME?.trim();
  if (fromEnv) return fromEnv;

  const raw = createdBy?.trim();
  if (raw && raw.toLowerCase() !== "teacher") return raw;

  return "Ms. Aastha";
}
