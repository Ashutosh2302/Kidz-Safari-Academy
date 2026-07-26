"use server";

import { redirect } from "next/navigation";
import {
  checkTeacherPin,
  clearTeacherSession,
  setTeacherSession,
} from "@/lib/auth";

export async function loginTeacher(formData: FormData) {
  const pin = String(formData.get("pin") ?? "");
  if (!checkTeacherPin(pin)) {
    return { error: "That PIN doesn’t look right. Try again?" };
  }
  await setTeacherSession();
  redirect("/admin");
}

export async function logoutTeacher() {
  await clearTeacherSession();
  redirect("/admin/login");
}
