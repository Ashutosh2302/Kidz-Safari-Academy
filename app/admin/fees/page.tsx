import { redirect } from "next/navigation";
import { logoutTeacher } from "@/app/actions/auth";
import { AdminNav } from "@/components/AdminNav";
import { DashDivider } from "@/components/DashDivider";
import { EmptyState } from "@/components/EmptyState";
import { FeeCycleCard } from "@/components/FeeCycleCard";
import { FeesOverview } from "@/components/FeesOverview";
import { isTeacherAuthed } from "@/lib/auth";
import { formatMonthLabel, parseDateOnly, toDateInputValue } from "@/lib/dates";
import {
  calendarMonthBounds,
  ensureFeeCyclesUpToDate,
  feeCycleContaining,
} from "@/lib/fees";
import { prisma } from "@/lib/prisma";
import { timed } from "@/lib/server-timing";
import { activeStudentWhere } from "@/lib/students";

export default async function FeesPage() {
  return timed("page:admin/fees", async () => {
    if (!(await isTeacherAuthed())) {
      redirect("/admin/login");
    }

    // Writes must finish before reads — then fan out reads in parallel
    await ensureFeeCyclesUpToDate();

    const today = parseDateOnly(toDateInputValue());
    const { start: monthStart, end: monthEnd } = calendarMonthBounds(today);

    const [students, activeCount, monthPayments, allPayments] = await timed(
      "query:admin/fees:reads",
      () =>
        Promise.all([
          prisma.student.findMany({
            where: { ...activeStudentWhere, monthlyFee: { gt: 0 } },
            orderBy: { name: "asc" },
            include: {
              feeCycles: {
                include: {
                  payments: { orderBy: { paidAt: "desc" } },
                },
                orderBy: { periodStart: "desc" },
              },
            },
          }),
          prisma.student.count({ where: activeStudentWhere }),
          prisma.payment.findMany({
            where: {
              paidAt: { gte: monthStart, lt: monthEnd },
            },
            select: { amount: true },
          }),
          prisma.payment.findMany({
            include: { student: { select: { id: true, name: true } } },
            orderBy: { paidAt: "desc" },
            take: 100,
          }),
        ]),
    );

    const overviewRows = students.map((student) => {
      const { periodStart } = feeCycleContaining(student.enrolledOn, today);
      const current =
        student.feeCycles.find(
          (c) => c.periodStart.getTime() === periodStart.getTime(),
        ) ?? student.feeCycles[0] ?? null;

      const lastPayment = current?.payments[0] ?? null;

      return {
        studentId: student.id,
        studentName: student.name,
        monthlyFee: student.monthlyFee,
        cycleId: current?.id ?? null,
        periodStart: current?.periodStart.toISOString() ?? null,
        periodEnd: current?.periodEnd.toISOString() ?? null,
        status: current?.status ?? null,
        amountDue: current?.amountDue ?? student.monthlyFee,
        amountPaid: current?.amountPaid ?? 0,
        lastPaymentAt: lastPayment?.paidAt.toISOString() ?? null,
      };
    });

    const outstandingTotal = overviewRows
      .filter((r) => r.status === "DUE" || r.status === "PARTIAL")
      .reduce((sum, r) => sum + Math.max(0, r.amountDue - r.amountPaid), 0);

    const collectedThisMonth = monthPayments.reduce((n, p) => n + p.amount, 0);

    return (
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-forest">Fees</h1>
            <p className="mt-1 text-ink-soft">
              Join-date monthly cycles · every payment stays on the ledger
            </p>
          </div>
          <form action={logoutTeacher}>
            <button
              type="submit"
              className="rounded-full border-2 border-forest bg-cream px-3 py-2 text-sm font-bold text-forest"
            >
              Out
            </button>
          </form>
        </div>

        <DashDivider className="!my-4" />
        <AdminNav current="/admin/fees" />

        {students.length === 0 ? (
          activeCount === 0 ? (
            <EmptyState
              icon="💰"
              title="Fees start with a student"
              description="Enroll a child and set their monthly fee — cycles and payments will show up here."
              actionHref="/admin/students/new"
              actionLabel="+ New student"
            />
          ) : (
            <EmptyState
              icon="💰"
              title="No fee cycles yet"
              description="Set a monthly fee on a student profile, then come back here to collect and track payments."
              actionHref="/admin/students"
              actionLabel="Open students"
            />
          )
        ) : (
          <>
            <FeesOverview
              rows={overviewRows}
              payments={allPayments.map((p) => ({
                id: p.id,
                studentId: p.student.id,
                studentName: p.student.name,
                amount: p.amount,
                method: p.method,
                note: p.note,
                paidAt: p.paidAt.toISOString(),
              }))}
              calendarMonthLabel={formatMonthLabel(monthStart)}
              collectedThisMonth={collectedThisMonth}
              outstandingTotal={outstandingTotal}
            />

            <section className="mt-10">
              <h2 className="font-display text-2xl font-bold text-forest">
                Collect &amp; history
              </h2>
              <p className="mb-4 text-sm text-ink-soft">
                Log payments against each child&apos;s current cycle · expand for
                full statement
              </p>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {students.map((student) => {
                  const { periodStart } = feeCycleContaining(
                    student.enrolledOn,
                    today,
                  );
                  const current =
                    student.feeCycles.find(
                      (c) => c.periodStart.getTime() === periodStart.getTime(),
                    ) ?? null;

                  return (
                    <FeeCycleCard
                      key={student.id}
                      studentId={student.id}
                      studentName={student.name}
                      monthlyFee={student.monthlyFee}
                      currentCycle={
                        current
                          ? {
                              id: current.id,
                              periodStart: current.periodStart.toISOString(),
                              periodEnd: current.periodEnd.toISOString(),
                              amountDue: current.amountDue,
                              amountPaid: current.amountPaid,
                              status: current.status,
                            }
                          : null
                      }
                      history={student.feeCycles.map((c) => ({
                        id: c.id,
                        periodStart: c.periodStart.toISOString(),
                        periodEnd: c.periodEnd.toISOString(),
                        amountDue: c.amountDue,
                        amountPaid: c.amountPaid,
                        status: c.status,
                        payments: c.payments.map((p) => ({
                          id: p.id,
                          amount: p.amount,
                          method: p.method,
                          note: p.note,
                          paidAt: p.paidAt.toISOString(),
                        })),
                      }))}
                    />
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </main>
    );
  });
}
