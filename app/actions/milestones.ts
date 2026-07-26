"use server";

import { revalidatePath } from "next/cache";
import { isTeacherAuthed } from "@/lib/auth";
import {
  DEFAULT_LEAP_CATEGORY,
  LEAP_ICONS,
} from "@/lib/copy";
import { parseDateOnly, toDateInputValue } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { revalidateParentPortal } from "@/lib/revalidate-parent";

export async function createMilestone(input: {
  name: string;
  category?: string;
  icon?: string;
}) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  const name = input.name.trim();
  if (!name) {
    return { error: "Give the leap a short name." };
  }
  if (name.length > 60) {
    return { error: "Keep the leap name under 60 characters." };
  }

  const category =
    input.category?.trim() || DEFAULT_LEAP_CATEGORY;
  const iconRaw = input.icon?.trim() || "⭐";
  const icon = (LEAP_ICONS as readonly string[]).includes(iconRaw)
    ? iconRaw
    : "⭐";

  const existing = await prisma.milestone.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      category: { equals: category, mode: "insensitive" },
    },
  });
  if (existing) {
    return {
      error: "That leap already exists in the library.",
      milestone: existing,
    };
  }

  const milestone = await prisma.milestone.create({
    data: { name, category, icon },
  });

  revalidatePath("/admin/milestones");
  return { success: true, milestone };
}

export async function toggleStudentMilestone(input: {
  studentId: string;
  milestoneId: string;
  achieved: boolean;
  achievedDate?: string;
  /** Specific what-happened line for the parent leap card */
  note?: string;
}) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  if (input.achieved) {
    const note = input.note?.trim() || null;
    if (!note) {
      return {
        error:
          "Add a short specific note — e.g. “Followed the trail without holding hands”.",
      };
    }

    await prisma.studentMilestone.upsert({
      where: {
        studentId_milestoneId: {
          studentId: input.studentId,
          milestoneId: input.milestoneId,
        },
      },
      create: {
        studentId: input.studentId,
        milestoneId: input.milestoneId,
        note,
        achievedDate: input.achievedDate
          ? parseDateOnly(input.achievedDate)
          : parseDateOnly(toDateInputValue()),
      },
      update: {
        note,
        achievedDate: input.achievedDate
          ? parseDateOnly(input.achievedDate)
          : undefined,
      },
    });
  } else {
    await prisma.studentMilestone.deleteMany({
      where: {
        studentId: input.studentId,
        milestoneId: input.milestoneId,
      },
    });
  }

  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    select: { magicLinkToken: true },
  });

  revalidatePath("/admin/milestones");
  revalidatePath(`/admin/students/${input.studentId}`);
  if (student) revalidateParentPortal(student.magicLinkToken);

  return { success: true };
}
