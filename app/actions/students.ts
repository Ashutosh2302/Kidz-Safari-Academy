"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { allocateUniqueMagicToken } from "@/lib/allocate-magic-token";
import { isTeacherAuthed } from "@/lib/auth";
import { parseDateOnly } from "@/lib/dates";
import { ensureFeeCyclesUpToDate } from "@/lib/fees";
import { prisma } from "@/lib/prisma";
import { revalidateParentPortal } from "@/lib/revalidate-parent";

export async function createStudent(formData: FormData) {
  if (!(await isTeacherAuthed())) {
    redirect("/admin/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const parentName = String(formData.get("parentName") ?? "").trim();
  const parentPhone = String(formData.get("parentPhone") ?? "").trim();
  const dobRaw = String(formData.get("dob") ?? "").trim();
  const enrolledRaw = String(formData.get("enrolledOn") ?? "").trim();
  const photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;
  const monthlyFee = Number(formData.get("monthlyFee") ?? 0);

  if (!name || !parentName || !parentPhone) {
    throw new Error("Name, parent name, and phone are required.");
  }

  const student = await prisma.student.create({
    data: {
      name,
      parentName,
      parentPhone,
      photoUrl,
      dob: dobRaw ? parseDateOnly(dobRaw) : null,
      enrolledOn: enrolledRaw ? parseDateOnly(enrolledRaw) : new Date(),
      monthlyFee: Number.isFinite(monthlyFee)
        ? Math.max(0, Math.round(monthlyFee))
        : 0,
      magicLinkToken: await allocateUniqueMagicToken(),
    },
  });

  if (student.monthlyFee > 0) {
    await ensureFeeCyclesUpToDate(student.id);
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin/fees");
  revalidatePath("/admin");
  redirect(`/admin/students/${student.id}`);
}

export async function updateStudent(formData: FormData) {
  if (!(await isTeacherAuthed())) {
    redirect("/admin/login");
  }

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const parentName = String(formData.get("parentName") ?? "").trim();
  const parentPhone = String(formData.get("parentPhone") ?? "").trim();
  const dobRaw = String(formData.get("dob") ?? "").trim();
  const enrolledRaw = String(formData.get("enrolledOn") ?? "").trim();
  const photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;
  const monthlyFee = Number(formData.get("monthlyFee") ?? 0);

  if (!id || !name || !parentName || !parentPhone) {
    throw new Error("Missing required fields.");
  }

  const fee = Number.isFinite(monthlyFee)
    ? Math.max(0, Math.round(monthlyFee))
    : 0;

  const student = await prisma.student.update({
    where: { id },
    data: {
      name,
      parentName,
      parentPhone,
      photoUrl,
      dob: dobRaw ? parseDateOnly(dobRaw) : null,
      enrolledOn: enrolledRaw ? parseDateOnly(enrolledRaw) : undefined,
      monthlyFee: fee,
    },
  });

  if (fee > 0) {
    await ensureFeeCyclesUpToDate(student.id);
  }

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${id}`);
  revalidatePath("/admin/fees");
  revalidateParentPortal(student.magicLinkToken);
  redirect(`/admin/students/${id}`);
}

export async function archiveStudent(studentId: string) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }
  if (!studentId) return { error: "Missing student." };

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return { error: "Student not found." };
  if (student.archivedAt) return { success: true };

  await prisma.student.update({
    where: { id: studentId },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/fees");
  revalidatePath("/admin/media");
  revalidatePath("/admin/milestones");
  revalidateParentPortal(student.magicLinkToken);
  return { success: true };
}

export async function restoreStudent(studentId: string) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }
  if (!studentId) return { error: "Missing student." };

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return { error: "Student not found." };

  await prisma.student.update({
    where: { id: studentId },
    data: { archivedAt: null },
  });

  if (student.monthlyFee > 0) {
    await ensureFeeCyclesUpToDate(studentId);
  }

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/fees");
  revalidatePath("/admin/media");
  revalidatePath("/admin/milestones");
  revalidateParentPortal(student.magicLinkToken);
  return { success: true };
}
