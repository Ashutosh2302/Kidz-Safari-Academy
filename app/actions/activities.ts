"use server";

import { revalidatePath } from "next/cache";
import { isTeacherAuthed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function listActivities() {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  const activities = await prisma.activity.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return { success: true as const, activities };
}

export async function createActivity(name: string) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return { error: "Give the activity a name." };
  }
  if (trimmed.length > 60) {
    return { error: "Keep activity names under 60 characters." };
  }

  const existing = await prisma.activity.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (existing) {
    return {
      success: true as const,
      activity: existing,
      alreadyExisted: true as const,
    };
  }

  const activity = await prisma.activity.create({
    data: { name: trimmed },
    select: { id: true, name: true },
  });

  revalidatePath("/admin/media");
  revalidatePath("/admin/students");

  return {
    success: true as const,
    activity,
    alreadyExisted: false as const,
  };
}
