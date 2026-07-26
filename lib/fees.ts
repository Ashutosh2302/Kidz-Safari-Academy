import { parseDateOnly, toDateInputValue } from "@/lib/dates";
import { resolveFeeStatus } from "@/lib/fee-display";
import { prisma } from "@/lib/prisma";
import { timed } from "@/lib/server-timing";

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
 *
 * Batches reads + creates to avoid a per-cycle round-trip waterfall
 * (critical on serverless / Neon cold starts).
 */
export async function ensureFeeCyclesUpToDate(studentId?: string) {
  return timed("query:ensureFeeCycles", async () => {
    const students = await prisma.student.findMany({
      where: {
        monthlyFee: { gt: 0 },
        archivedAt: null,
        ...(studentId ? { id: studentId } : {}),
      },
      select: { id: true, monthlyFee: true, enrolledOn: true },
    });

    if (students.length === 0) return;

    const today = parseDateOnly(toDateInputValue());
    const studentIds = students.map((s) => s.id);

    const existing = await prisma.feeCycle.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, periodStart: true },
    });

    const existingKeys = new Set(
      existing.map(
        (c) => `${c.studentId}:${c.periodStart.toISOString()}`,
      ),
    );

    const toCreate: {
      studentId: string;
      periodStart: Date;
      periodEnd: Date;
      amountDue: number;
      amountPaid: number;
      status: "DUE";
    }[] = [];

    for (const student of students) {
      const join = utcDateOnly(student.enrolledOn);
      const joinDay = join.getUTCDate();
      let start = join;

      for (let i = 0; i < 600; i += 1) {
        const next = nextCycleStart(start, joinDay);
        const end = dayBefore(next);
        const key = `${student.id}:${start.toISOString()}`;
        if (!existingKeys.has(key)) {
          toCreate.push({
            studentId: student.id,
            periodStart: start,
            periodEnd: end,
            amountDue: student.monthlyFee,
            amountPaid: 0,
            status: "DUE",
          });
        }
        if (end >= today) break;
        start = next;
      }
    }

    if (toCreate.length > 0) {
      await prisma.feeCycle.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
    }

    // One read for all open cycles, then parallel updates only where fee changed
    const openCycles = await prisma.feeCycle.findMany({
      where: {
        studentId: { in: studentIds },
        status: { in: ["DUE", "PARTIAL"] },
      },
      include: { payments: true },
    });

    const feeByStudent = new Map(students.map((s) => [s.id, s.monthlyFee]));
    const updates = openCycles
      .map((cycle) => {
        const monthlyFee = feeByStudent.get(cycle.studentId);
        if (monthlyFee == null || cycle.amountDue === monthlyFee) return null;
        const amountPaid = cycle.payments.reduce((sum, p) => sum + p.amount, 0);
        const status = resolveFeeStatus(monthlyFee, amountPaid, false);
        return prisma.feeCycle.update({
          where: { id: cycle.id },
          data: { amountDue: monthlyFee, amountPaid, status },
        });
      })
      .filter((u): u is NonNullable<typeof u> => u != null);

    if (updates.length > 0) {
      await Promise.all(updates);
    }
  });
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

  const updates = openCycles
    .filter((cycle) => cycle.amountDue !== monthlyFee)
    .map((cycle) => {
      const amountPaid = cycle.payments.reduce((sum, p) => sum + p.amount, 0);
      const status = resolveFeeStatus(monthlyFee, amountPaid, false);
      return prisma.feeCycle.update({
        where: { id: cycle.id },
        data: { amountDue: monthlyFee, amountPaid, status },
      });
    });

  if (updates.length > 0) {
    await Promise.all(updates);
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
