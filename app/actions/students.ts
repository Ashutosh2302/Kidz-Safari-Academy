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
