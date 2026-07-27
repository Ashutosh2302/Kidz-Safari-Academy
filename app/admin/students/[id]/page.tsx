import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateStudent } from "@/app/actions/students";
import { AdminNav } from "@/components/AdminNav";
import { ArchiveStudentButton } from "@/components/ArchiveStudentButton";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { DashDivider } from "@/components/DashDivider";
import { OpenProfileButton } from "@/components/OpenProfileButton";
import { PortraitPhotoField } from "@/components/PortraitPhotoField";
import { isTeacherAuthed } from "@/lib/auth";
import { formatDisplayDate, toDateInputValue } from "@/lib/dates";
import {
  feeStatusBadgeClass,
  formatCycleRange,
  paymentMethodLabel,
} from "@/lib/fee-display";
import { ensureFeeCyclesUpToDate } from "@/lib/fees";
import { parentPortalUrl } from "@/lib/magic-link";
import { prisma } from "@/lib/prisma";
import { timed } from "@/lib/server-timing";
import { activeStudentWhere, isStudentArchived } from "@/lib/students";

function utcDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return timed("page:admin/students/[id]", async () => {
  if (!(await isTeacherAuthed())) {
    redirect("/admin/login");
  }

  const { id } = await params;
  await ensureFeeCyclesUpToDate(id);

  const [student, peers] = await timed("query:admin/students/[id]", () =>
    Promise.all([
      prisma.student.findUnique({
        where: { id },
        include: {
          feeCycles: {
            orderBy: { periodStart: "desc" },
            include: {
              payments: { orderBy: { paidAt: "desc" } },
            },
          },
          attendance: { orderBy: { date: "desc" }, take: 10 },
          milestones: {
            include: { milestone: true },
            orderBy: { achievedDate: "desc" },
          },
          _count: { select: { sessions: true } },
        },
      }),
      prisma.student.findMany({
        where: activeStudentWhere,
        select: { id: true, name: true },
      }),
    ]),
  );

  if (!student) notFound();

  const archived = isStudentArchived(student);
  const url = parentPortalUrl(student, peers);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/admin/students"
        className="mb-3 inline-flex text-sm font-bold text-forest-soft"
      >
        ← Students
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-bold text-forest">
              {student.name}
            </h1>
            {archived ? (
              <span className="rounded-full bg-pastel-pink px-2.5 py-1 text-xs font-bold text-red-deep">
                Archived
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-ink-soft">
            Enrolled {formatDisplayDate(student.enrolledOn)} ·{" "}
            {student._count.sessions} sessions logged
            {archived && student.archivedAt
              ? ` · archived ${formatDisplayDate(student.archivedAt)}`
              : ""}
          </p>
        </div>
        {!archived ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <OpenProfileButton url={url} />
            <CopyLinkButton url={url} />
          </div>
        ) : null}
      </div>

      {archived ? (
        <div className="mt-4 rounded-[1.25rem] border-2 border-forest bg-pastel-pink/40 px-4 py-3 text-sm text-forest">
          <p className="font-bold">Removed from the active roster</p>
          <p className="mt-1 text-ink-soft">
            History is preserved. The parent magic link is paused until you
            restore this student.
          </p>
        </div>
      ) : null}

      <DashDivider className="!my-4" />
      <AdminNav current="/admin/students" />

      <div className="grid gap-6 lg:grid-cols-2">
        <form action={updateStudent} className="surface-card space-y-3 p-5">
          <h2 className="font-display text-xl font-bold text-forest">Profile</h2>
          <input type="hidden" name="id" value={student.id} />
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-forest">Name</span>
            <input name="name" defaultValue={student.name} required className="input-field" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-forest">DOB</span>
              <input
                name="dob"
                type="date"
                defaultValue={student.dob ? utcDateInput(student.dob) : ""}
                className="input-field"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-forest">
                Enrolled on
              </span>
              <input
                name="enrolledOn"
                type="date"
                defaultValue={utcDateInput(student.enrolledOn)}
                required
                className="input-field"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-forest">Parent</span>
            <input
              name="parentName"
              defaultValue={student.parentName}
              required
              className="input-field"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-forest">Phone</span>
            <input
              name="parentPhone"
              defaultValue={student.parentPhone}
              required
              className="input-field"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-forest">
              Monthly fee (₹)
            </span>
            <input
              name="monthlyFee"
              type="number"
              min={0}
              defaultValue={student.monthlyFee}
              className="input-field"
            />
          </label>
          <PortraitPhotoField
            initialUrl={student.photoUrl}
            studentName={student.name}
          />
          <button type="submit" className="btn-secondary w-full !py-2.5">
            Save profile
          </button>
          {!archived ? (
            <p className="truncate text-xs text-forest-soft">{url}</p>
          ) : null}

          <div className="border-t-2 border-dashed border-forest/15 pt-3">
            <ArchiveStudentButton
              studentId={student.id}
              studentName={student.name}
              archived={archived}
            />
          </div>
        </form>

        <div className="space-y-4">
          <section className="surface-card p-5">
            <h2 className="font-display text-xl font-bold text-forest">
              Recent attendance
            </h2>
            {student.attendance.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">No marks yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {student.attendance.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium text-ink-muted">
                      {formatDisplayDate(a.date)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        a.status === "PRESENT"
                          ? "bg-mint text-forest"
                          : "bg-pastel-pink text-red-deep"
                      }`}
                    >
                      {a.status === "PRESENT"
                        ? a.isExtraClass
                          ? `Extra class · ${a.hoursAttended}h`
                          : `Present · ${a.hoursAttended}h`
                        : "Absent"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/admin/attendance?date=${toDateInputValue()}`}
              className="mt-3 inline-block text-sm font-bold text-forest-soft"
            >
              Mark attendance →
            </Link>
          </section>

          <section className="surface-card p-5">
            <h2 className="font-display text-xl font-bold text-forest">
              Fee statement
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              Join-date cycles · ₹{student.monthlyFee}/mo
            </p>
            {student.feeCycles.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">
                No cycles yet. Set a monthly fee above, then open Fees to
                collect.
              </p>
            ) : (
              <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto">
                {student.feeCycles.map((cycle) => (
                  <li key={cycle.id} className="text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-forest">
                        {formatCycleRange(cycle.periodStart, cycle.periodEnd)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${feeStatusBadgeClass(cycle.status)}`}
                      >
                        {cycle.status}
                      </span>
                    </div>
                    <p className="text-ink-soft">
                      Due ₹{cycle.amountDue} · Paid ₹{cycle.amountPaid}
                    </p>
                    {cycle.payments.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 border-l-2 border-forest/15 pl-2">
                        {cycle.payments.map((p) => (
                          <li key={p.id} className="text-xs text-ink-muted">
                            <span className="font-semibold text-forest">
                              ₹{p.amount}
                            </span>{" "}
                            · {paymentMethodLabel(p.method)} ·{" "}
                            {formatDisplayDate(p.paidAt)}
                            {p.note ? ` · ${p.note}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/fees"
              className="mt-3 inline-block text-sm font-bold text-forest-soft"
            >
              Open fees desk →
            </Link>
          </section>

          <section className="surface-card p-5">
            <h2 className="font-display text-xl font-bold text-forest">
              Leaps unlocked
            </h2>
            {student.milestones.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">None yet.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {student.milestones.map((sm) => (
                  <li
                    key={sm.id}
                    className="rounded-full bg-pastel-yellow px-3 py-1 text-sm font-bold text-forest"
                  >
                    {sm.milestone.icon} {sm.milestone.name}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/milestones"
              className="mt-3 inline-block text-sm font-bold text-forest-soft"
            >
              Manage leaps →
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
  });
}
