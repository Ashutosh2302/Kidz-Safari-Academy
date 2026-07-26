import { randomInt } from "node:crypto";
import { firstName } from "@/lib/dates";

/** Short readable token — A–Z, a–z, 0–9 (no hyphens) */
export const MAGIC_TOKEN_LENGTH = 8;

const TOKEN_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const TOKEN_PATTERN = new RegExp(`^[A-Za-z0-9]{${MAGIC_TOKEN_LENGTH}}$`);

type NamedStudent = { id: string; name: string; magicLinkToken: string };

/** Crypto-safe random token (not Math.random). */
export function generateMagicToken(): string {
  let out = "";
  for (let i = 0; i < MAGIC_TOKEN_LENGTH; i += 1) {
    out += TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)]!;
  }
  return out;
}

/**
 * Parse the secure token from `/s/{slug}-{token}` or bare `/s/{token}`.
 * Slug is ignored for auth — only the token portion is returned.
 */
export function extractMagicToken(segment: string): string {
  const s = decodeURIComponent(segment.trim());
  const lastDash = s.lastIndexOf("-");
  if (lastDash >= 0) {
    const maybe = s.slice(lastDash + 1);
    if (TOKEN_PATTERN.test(maybe)) return maybe;
  }
  if (TOKEN_PATTERN.test(s)) return s;
  // Fallback: treat whole segment as token (unknown shape → lookup will 404)
  return s;
}

export function slugifyStudentName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "child";
}

/**
 * Cosmetic name prefix for magic links.
 * Prefers first name; uses full name (then a short id suffix) on collisions.
 */
export function parentPortalSlug(
  student: { id: string; name: string },
  peers: { id: string; name: string }[] = [],
): string {
  const others = peers.filter((p) => p.id !== student.id);
  const first = slugifyStudentName(firstName(student.name));
  const firstClash = others.some(
    (p) => slugifyStudentName(firstName(p.name)) === first,
  );
  if (!firstClash) return first;

  const full = slugifyStudentName(student.name);
  const fullClash = others.some((p) => slugifyStudentName(p.name) === full);
  if (!fullClash) return full;

  const suffix = student.id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toLowerCase();
  return `${full}-${suffix || "x"}`;
}

/** Path only: `/s/{slug}-{token}` */
export function parentPortalPath(
  student: NamedStudent,
  peers: { id: string; name: string }[] = [],
): string {
  const slug = parentPortalSlug(student, peers);
  return `/s/${slug}-${student.magicLinkToken}`;
}

/** Absolute parent portal URL */
export function parentPortalUrl(
  student: NamedStudent,
  peers: { id: string; name: string }[] = [],
  appUrl = process.env.APP_URL ?? "http://localhost:3000",
): string {
  return `${appUrl.replace(/\/$/, "")}${parentPortalPath(student, peers)}`;
}
