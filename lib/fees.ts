import { parseDateOnly, toDateInputValue } from "@/lib/dates";
import { resolveFeeStatus } from "@/lib/fee-display";
import { prisma } from "@/lib/prisma";

export {
  feeStatusBadgeClass,
  formatCycleRange,
  paymentMethodLabel,
  resolveFeeStatus,
} from "@/lib/fee-display";

function utcDateOnly(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function clampDay(year: number, month: number, day: number) {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.min(day, last);
}

/** Next cycle start one month after `start`, preserving the join day-of-month. */
export function nextCycleStart(start: Date, joinDay: number) {
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth() + 1;
  if (month > 11) {
    month = 0;
    year += 1;
  }
  return new Date(Date.UTC(year, month, clampDay(year, month, joinDay)));
}

export function dayBefore(date: Date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/** Cycle that contains `asOf` for a student enrolled on `enrolledOn`. */
export function feeCycleContaining(enrolledOn: Date, asOf: Date) {
  const join = utcDateOnly(enrolledOn);
  const joinDay = join.getUTCDate();
  const target = utcDateOnly(asOf);

  let start = join;
  // If looking before enrollment, use the first cycle
  if (target < start) {
    const next = nextCycleStart(start, joinDay);
    return { periodStart: start, periodEnd: dayBefore(next) };
  }

  for (let i = 0; i < 600; i += 1) {
    const next = nextCycleStart(start, joinDay);
    const end = dayBefore(next);
    if (target <= end) {
      return { periodStart: start, periodEnd: end };
    }
    start = next;
  }

  throw new Error("Could not resolve fee cycle");
}

/**
 * Ensure every student with a monthly fee has cycles from join date
 * through the cycle that covers today.
 */
export async function ensureFeeCyclesUpToDate(studentId?: string) {
  const students = await prisma.student.findMany({
    where: {
      monthlyFee: { gt: 0 },
      ...(studentId ? { id: studentId } : {}),
    },
    select: { id: true, monthlyFee: true, enrolledOn: true },
  });

  if (students.length === 0) return;

  const today = parseDateOnly(toDateInputValue());

  for (const student of students) {
    const join = utcDateOnly(student.enrolledOn);
    const joinDay = join.getUTCDate();
    let start = join;

    for (let i = 0; i < 600; i += 1) {
      const next = nextCycleStart(start, joinDay);
      const end = dayBefore(next);

      await prisma.feeCycle.upsert({
        where: {
          studentId_periodStart: {
            studentId: student.id,
            periodStart: start,
          },
        },
        create: {
          studentId: student.id,
          periodStart: start,
          periodEnd: end,
          amountDue: student.monthlyFee,
          amountPaid: 0,
          status: "DUE",
        },
        update: {},
      });

      // Stop once today's cycle exists
      if (end >= today) break;
      start = next;
    }

    // Keep open cycles in sync with the student's current monthly fee
    await syncOpenCycleAmountDue(student.id, student.monthlyFee);
  }
}

/**
 * Update amountDue on unpaid cycles (DUE / PARTIAL) when monthly fee changes.
 * Paid / waived cycles keep their historical amount.
 */
export async function syncOpenCycleAmountDue(
  studentId: string,
  monthlyFee: number,
) {
  const openCycles = await prisma.feeCycle.findMany({
    where: {
      studentId,
      status: { in: ["DUE", "PARTIAL"] },
    },
    include: { payments: true },
  });

  for (const cycle of openCycles) {
    if (cycle.amountDue === monthlyFee) continue;

    const amountPaid = cycle.payments.reduce((sum, p) => sum + p.amount, 0);
    const status = resolveFeeStatus(monthlyFee, amountPaid, false);

    await prisma.feeCycle.update({
      where: { id: cycle.id },
      data: { amountDue: monthlyFee, amountPaid, status },
    });
  }
}

/** Recalculate denormalized paid total + status from ledger rows. */
export async function refreshCycleTotals(
  feeCycleId: string,
  options?: { waived?: boolean },
) {
  const cycle = await prisma.feeCycle.findUnique({
    where: { id: feeCycleId },
    include: { payments: true },
  });
  if (!cycle) return null;

  const amountPaid = cycle.payments.reduce((sum, p) => sum + p.amount, 0);
  const waived =
    options?.waived === true ||
    (options?.waived !== false &&
      cycle.status === "WAIVED" &&
      amountPaid === 0);

  const status = resolveFeeStatus(cycle.amountDue, amountPaid, waived);

  return prisma.feeCycle.update({
    where: { id: feeCycleId },
    data: { amountPaid, status },
  });
}

/** Calendar-month bounds (UTC) for business bookkeeping totals. */
export function calendarMonthBounds(date = new Date()) {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
  );
  return { start, end };
}
