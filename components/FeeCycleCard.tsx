"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { recordCyclePayment, waiveFeeCycle } from "@/app/actions/fees";
import { formatDisplayDate } from "@/lib/dates";
import {
  feeStatusBadgeClass,
  formatCycleRange,
  paymentMethodLabel,
} from "@/lib/fee-display";

export type FeeCyclePayment = {
  id: string;
  amount: number;
  method: string;
  note: string | null;
  paidAt: string;
};

export type FeeCycleHistoryItem = {
  id: string;
  periodStart: string;
  periodEnd: string;
  amountDue: number;
  amountPaid: number;
  status: string;
  payments: FeeCyclePayment[];
};

export function FeeCycleCard({
  studentId,
  studentName,
  monthlyFee,
  currentCycle,
  history,
}: {
  studentId: string;
  studentName: string;
  monthlyFee: number;
  currentCycle: {
    id: string;
    periodStart: string;
    periodEnd: string;
    amountDue: number;
    amountPaid: number;
    status: string;
  } | null;
  history: FeeCycleHistoryItem[];
}) {
  const router = useRouter();
  const remaining = currentCycle
    ? Math.max(0, currentCycle.amountDue - currentCycle.amountPaid)
    : 0;
  const [amount, setAmount] = useState(String(remaining || monthlyFee || ""));
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("CASH");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!currentCycle) return;
    const left = Math.max(0, currentCycle.amountDue - currentCycle.amountPaid);
    setAmount(String(left || monthlyFee || ""));
  }, [
    currentCycle?.id,
    currentCycle?.amountDue,
    currentCycle?.amountPaid,
    monthlyFee,
  ]);

  const sortedHistory = useMemo(
    () =>
      [...history].sort(
        (a, b) =>
          new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime(),
      ),
    [history],
  );

  function refreshDefaults(nextRemaining: number) {
    setAmount(String(nextRemaining > 0 ? nextRemaining : monthlyFee || ""));
    setNote("");
  }

  function onPay() {
    if (!currentCycle) return;
    setMsg(null);
    const fd = new FormData();
    fd.set("feeCycleId", currentCycle.id);
    fd.set("amount", amount);
    fd.set("note", note);
    fd.set("method", method);

    startTransition(async () => {
      const result = await recordCyclePayment(fd);
      if (result.error) {
        setMsg(result.error);
        return;
      }
      setMsg("Payment logged.");
      const paid = Number(amount) || 0;
      refreshDefaults(Math.max(0, remaining - paid));
      router.refresh();
    });
  }

  function onWaive() {
    if (!currentCycle) return;
    setMsg(null);
    const fd = new FormData();
    fd.set("feeCycleId", currentCycle.id);

    startTransition(async () => {
      const result = await waiveFeeCycle(fd);
      if (result.error) {
        setMsg(result.error);
        return;
      }
      setMsg("Cycle waived.");
      router.refresh();
    });
  }

  return (
    <li className="surface-card flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/admin/students/${studentId}`}
            className="font-display text-lg font-bold text-forest hover:underline"
          >
            {studentName}
          </Link>
          {currentCycle ? (
            <p className="text-sm text-ink-soft">
              {formatCycleRange(
                new Date(currentCycle.periodStart),
                new Date(currentCycle.periodEnd),
              )}
            </p>
          ) : (
            <p className="text-sm text-ink-soft">No active cycle</p>
          )}
        </div>
        {currentCycle ? (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${feeStatusBadgeClass(currentCycle.status)}`}
          >
            {currentCycle.status}
          </span>
        ) : null}
      </div>

      {currentCycle ? (
        <>
          <p className="mt-2 text-sm font-semibold text-forest">
            Due ₹{currentCycle.amountDue} · Paid ₹{currentCycle.amountPaid}
            {remaining > 0 && currentCycle.status !== "WAIVED" ? (
              <span className="font-normal text-ink-soft">
                {" "}
                · ₹{remaining} left
              </span>
            ) : null}
          </p>

          {currentCycle.status !== "PAID" &&
          currentCycle.status !== "WAIVED" ? (
            <div className="mt-3 space-y-2 border-t-2 border-dashed border-forest/20 pt-3">
              <div className="flex flex-wrap gap-2">
                <label className="min-w-[100px] flex-1">
                  <span className="mb-1 block text-xs font-bold text-forest">
                    Amount ₹
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field !py-2 text-sm"
                  />
                </label>
                <label className="min-w-[100px]">
                  <span className="mb-1 block text-xs font-bold text-forest">
                    Method
                  </span>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="input-field !py-2 text-sm"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK">Bank</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
                <label className="min-w-[140px] flex-[2]">
                  <span className="mb-1 block text-xs font-bold text-forest">
                    Note
                  </span>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="input-field !py-2 text-sm"
                    placeholder="Optional…"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={onPay}
                  className="btn-primary !px-3 !py-2 text-xs disabled:opacity-60"
                >
                  {pending ? "…" : "Log payment"}
                </button>
                {currentCycle.amountPaid === 0 ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onWaive}
                    className="rounded-full border-2 border-forest bg-white px-3 py-2 text-xs font-bold text-forest"
                  >
                    Waive
                  </button>
                ) : null}
                {msg ? (
                  <span className="self-center text-xs font-semibold text-forest-soft">
                    {msg}
                  </span>
                ) : null}
              </div>
            </div>
          ) : msg ? (
            <p className="mt-2 text-xs font-semibold text-forest-soft">{msg}</p>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">
          Set a monthly fee on the student profile to start cycles.
        </p>
      )}

      <button
        type="button"
        onClick={() => setHistoryOpen((o) => !o)}
        className="mt-3 self-start text-sm font-bold text-forest-soft hover:underline"
      >
        {historyOpen ? "Hide history" : `Fee history (${sortedHistory.length})`}
      </button>

      {historyOpen ? (
        <ol className="mt-2 max-h-64 space-y-3 overflow-y-auto border-t-2 border-dashed border-forest/20 pt-3">
          {sortedHistory.length === 0 ? (
            <li className="text-sm text-ink-soft">No cycles yet.</li>
          ) : (
            sortedHistory.map((cycle) => (
              <li key={cycle.id} className="text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-forest">
                    {formatCycleRange(
                      new Date(cycle.periodStart),
                      new Date(cycle.periodEnd),
                    )}
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
                  <ul className="mt-1 space-y-1 border-l-2 border-forest/15 pl-2">
                    {cycle.payments.map((p) => (
                      <li key={p.id} className="text-xs text-ink-muted">
                        <span className="font-semibold text-forest">
                          ₹{p.amount}
                        </span>{" "}
                        · {paymentMethodLabel(p.method)} ·{" "}
                        {formatDisplayDate(new Date(p.paidAt))}
                        {p.note ? ` · ${p.note}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-0.5 text-xs text-ink-soft">No payments</p>
                )}
              </li>
            ))
          )}
        </ol>
      ) : null}
    </li>
  );
}
