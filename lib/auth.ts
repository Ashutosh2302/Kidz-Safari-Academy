import { cookies } from "next/headers";

export const TEACHER_COOKIE = "gs_teacher";
const COOKIE_VALUE = "ok";

export async function isTeacherAuthed() {
  const jar = await cookies();
  return jar.get(TEACHER_COOKIE)?.value === COOKIE_VALUE;
}

export function checkTeacherPin(pin: string) {
  const expected = process.env.TEACHER_PIN ?? "1234";
  return pin.trim() === expected;
}

export async function setTeacherSession() {
  const jar = await cookies();
  jar.set(TEACHER_COOKIE, COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearTeacherSession() {
  const jar = await cookies();
  jar.delete(TEACHER_COOKIE);
}
