"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDisplayDate } from "@/lib/dates";
import {
  feeStatusBadgeClass,
  formatCycleRange,
  paymentMethodLabel,
} from "@/lib/fee-display";

export type OverviewRow = {
  studentId: string;
  studentName: string;
  monthlyFee: number;
  cycleId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  lastPaymentAt: string | null;
};

export type PaymentLogItem = {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  method: string;
  note: string | null;
  paidAt: string;
};

type StatusFilter = "ALL" | "DUE" | "PARTIAL" | "PAID" | "WAIVED" | "OUTSTANDING";

export function FeesOverview({
  rows,
  payments,
  calendarMonthLabel,
  collectedThisMonth,
  outstandingTotal,
}: {
  rows: OverviewRow[];
  payments: PaymentLogItem[];
  calendarMonthLabel: string;
  collectedThisMonth: number;
  outstandingTotal: number;
}) {
  const [filter, setFilter] = useState<StatusFilter>("OUTSTANDING");
  const [sort, setSort] = useState<"name" | "status" | "due">("status");

  const filtered = useMemo(() => {
    let list = [...rows];
    if (filter === "OUTSTANDING") {
      list = list.filter(
        (r) => r.status === "DUE" || r.status === "PARTIAL",
      );
    } else if (filter !== "ALL") {
      list = list.filter((r) => r.status === filter);
    }

    list.sort((a, b) => {
      if (sort === "name") return a.studentName.localeCompare(b.studentName);
      if (sort === "due") return b.amountDue - b.amountPaid - (a.amountDue - a.amountPaid);
      const order = ["DUE", "PARTIAL", "PAID", "WAIVED"];
      const ai = order.indexOf(a.status ?? "DUE");
      const bi = order.indexOf(b.status ?? "DUE");
      if (ai !== bi) return ai - bi;
      return a.studentName.localeCompare(b.studentName);
    });
    return list;
  }, [rows, filter, sort]);

  const dueCount = rows.filter((r) => r.status === "DUE").length;
  const partialCount = rows.filter((r) => r.status === "PARTIAL").length;
  const paidCount = rows.filter((r) => r.status === "PAID").length;
  const waivedCount = rows.filter((r) => r.status === "WAIVED").length;

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "OUTSTANDING", label: "Unpaid" },
    { id: "ALL", label: "All" },
    { id: "DUE", label: "Due" },
    { id: "PARTIAL", label: "Partial" },
    { id: "PAID", label: "Paid" },
    { id: "WAIVED", label: "Waived" },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="surface-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-forest-soft">
            This month&apos;s collections
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-forest">
            ₹{collectedThisMonth}
          </p>
          <p className="text-sm text-ink-soft">
            Calendar month · {calendarMonthLabel}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-forest-soft">
            Currently outstanding
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-forest">
            ₹{outstandingTotal}
          </p>
          <p className="text-sm text-ink-soft">
            Across due &amp; partial join-date cycles
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <span className="pill-yellow">
          {dueCount + partialCount} due / partial
        </span>
        <span className="rounded-full border-2 border-forest bg-mint px-3 py-1.5 text-sm font-bold text-forest">
          {paidCount} paid
        </span>
        {waivedCount > 0 ? (
          <span className="rounded-full border-2 border-forest bg-pastel-blue px-3 py-1.5 text-sm font-bold text-forest">
            {waivedCount} waived
          </span>
        ) : null}
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-forest">
              Current cycles
            </h2>
            <p className="text-sm text-ink-soft">
              One row per child · status of their active join-date cycle
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-bold text-forest">
              Sort{" "}
              <select
                value={sort}
                onChange={(e) =>
                  setSort(e.target.value as "name" | "status" | "due")
                }
                className="ml-1 rounded-full border-2 border-forest bg-cream px-2 py-1 text-sm font-bold"
              >
                <option value="status">Status</option>
                <option value="name">Name</option>
                <option value="due">Balance</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full border-2 border-forest px-3 py-1.5 text-xs font-bold ${
                filter === f.id
                  ? "bg-yellow text-forest"
                  : "bg-cream text-forest"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="surface-card overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-forest/20 text-xs font-bold uppercase tracking-wide text-forest-soft">
                <th className="px-4 py-3">Child</th>
                <th className="px-4 py-3">Cycle</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Last payment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-ink-soft"
                  >
                    No students match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.studentId}
                    className="border-b border-forest/10 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/students/${row.studentId}`}
                        className="font-bold text-forest hover:underline"
                      >
                        {row.studentName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {row.periodStart && row.periodEnd
                        ? formatCycleRange(
                            new Date(row.periodStart),
                            new Date(row.periodEnd),
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.status ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${feeStatusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-forest">
                      ₹{row.amountDue}
                    </td>
                    <td className="px-4 py-3 font-semibold text-forest">
                      ₹{row.amountPaid}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {row.lastPaymentAt
                        ? formatDisplayDate(new Date(row.lastPaymentAt))
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold text-forest">
          All payments
        </h2>
        <p className="mb-3 text-sm text-ink-soft">
          Combined ledger · every payment from every child, newest first
        </p>
        {payments.length === 0 ? (
          <div className="surface-card p-5 text-ink-soft">
            No payments logged yet.
          </div>
        ) : (
          <ul className="surface-card divide-y-2 divide-dashed divide-forest/15 p-0">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
              >
                <div>
                  <Link
                    href={`/admin/students/${p.studentId}`}
                    className="font-bold text-forest hover:underline"
                  >
                    {p.studentName}
                  </Link>
                  <p className="text-xs text-ink-soft">
                    {formatDisplayDate(new Date(p.paidAt))} ·{" "}
                    {paymentMethodLabel(p.method)}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <span className="font-display text-lg font-bold text-forest">
                  ₹{p.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
