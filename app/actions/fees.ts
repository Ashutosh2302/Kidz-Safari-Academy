"use server";

import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { isTeacherAuthed } from "@/lib/auth";
import {
  ensureFeeCyclesUpToDate,
  refreshCycleTotals,
} from "@/lib/fees";
import { prisma } from "@/lib/prisma";

const METHODS = new Set<PaymentMethod>(["CASH", "UPI", "BANK", "OTHER"]);

function revalidateFeePaths(studentId: string) {
  revalidatePath("/admin/fees");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
}

export async function ensureCurrentFeeCycles() {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }
  await ensureFeeCyclesUpToDate();
  revalidatePath("/admin/fees");
  return { success: true };
}

/** Append a payment to the current (or specified) fee cycle — never overwrites. */
export async function recordCyclePayment(formData: FormData) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  const feeCycleId = String(formData.get("feeCycleId") ?? "");
  const amountRaw = Number(formData.get("amount") ?? 0);
  const note = String(formData.get("note") ?? "").trim();
  const methodRaw = String(formData.get("method") ?? "CASH").toUpperCase();
  const method = (
    METHODS.has(methodRaw as PaymentMethod) ? methodRaw : "CASH"
  ) as PaymentMethod;

  if (!feeCycleId) return { error: "Missing fee cycle." };

  const amount = Number.isFinite(amountRaw)
    ? Math.max(0, Math.round(amountRaw))
    : 0;
  if (amount <= 0) return { error: "Enter a payment amount greater than 0." };

  const cycle = await prisma.feeCycle.findUnique({ where: { id: feeCycleId } });
  if (!cycle) return { error: "Fee cycle not found." };

  await prisma.payment.create({
    data: {
      feeCycleId,
      studentId: cycle.studentId,
      amount,
      method,
      note: note || null,
      paidAt: new Date(),
    },
  });

  // Paying clears waive
  await refreshCycleTotals(feeCycleId, { waived: false });

  revalidateFeePaths(cycle.studentId);
  return { success: true };
}

export async function waiveFeeCycle(formData: FormData) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  const feeCycleId = String(formData.get("feeCycleId") ?? "");
  if (!feeCycleId) return { error: "Missing fee cycle." };

  const cycle = await prisma.feeCycle.findUnique({
    where: { id: feeCycleId },
    include: { payments: true },
  });
  if (!cycle) return { error: "Fee cycle not found." };

  if (cycle.payments.length > 0) {
    return {
      error:
        "This cycle already has payments — mark the remaining balance paid, or leave it partial.",
    };
  }

  await prisma.feeCycle.update({
    where: { id: feeCycleId },
    data: { status: "WAIVED", amountPaid: 0 },
  });

  revalidateFeePaths(cycle.studentId);
  return { success: true };
}

/** @deprecated alias kept if any old callers remain */
export async function ensureMonthFees() {
  return ensureCurrentFeeCycles();
}

/** @deprecated */
export async function recordFeePayment(formData: FormData) {
  // Map old form field names onto the new ledger action
  if (!formData.get("feeCycleId") && formData.get("id")) {
    formData.set("feeCycleId", String(formData.get("id")));
  }
  if (!formData.get("amount") && formData.get("amountPaid")) {
    formData.set("amount", String(formData.get("amountPaid")));
  }
  if (!formData.get("note") && formData.get("notes")) {
    formData.set("note", String(formData.get("notes")));
  }
  if (String(formData.get("waived") ?? "") === "1") {
    return waiveFeeCycle(formData);
  }
  return recordCyclePayment(formData);
}
