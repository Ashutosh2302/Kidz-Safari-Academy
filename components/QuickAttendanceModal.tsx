"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getAttendanceBoardForDate,
  saveAttendanceForDate,
} from "@/app/actions/attendance";
import {
  DEFAULT_CLASS_HOURS,
  normalizeClassHours,
  SHORT_CLASS_HOURS,
  type ClassHours,
} from "@/lib/class-hours";
import { isWeekendDate, weekendLabel } from "@/lib/schedule";

type BoardStudent = {
  id: string;
  name: string;
  status: "PRESENT" | "ABSENT" | null;
  note: string | null;
  hoursAttended: number | null;
};

type Row = {
  id: string;
  name: string;
  status: "PRESENT" | "ABSENT" | null;
  note: string;
  hoursAttended: ClassHours;
};

function toRows(students: BoardStudent[]): Row[] {
  return students.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    note: s.note ?? "",
    hoursAttended: normalizeClassHours(s.hoursAttended),
  }));
}

/** Quick attendance marker locked to the session builder date. */
export function QuickAttendanceModal({
  date,
  onClose,
  onSaved,
}: {
  date: string;
  onClose: () => void;
  onSaved: (present: { id: string; name: string }[]) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const weekend = isWeekendDate(date);
  const dayName = weekend ? weekendLabel(date) : null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setMessage(null);
    void (async () => {
      const result = await getAttendanceBoardForDate(date);
      if (cancelled) return;
      if ("error" in result && result.error) {
        setLoadError(result.error);
        setRows([]);
        setLoading(false);
        return;
      }
      if (!("success" in result) || !result.success) return;
      setRows(toRows(result.students));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const presentCount = useMemo(
    () => rows.filter((r) => r.status === "PRESENT").length,
    [rows],
  );

  function setStatus(id: string, status: "PRESENT" | "ABSENT") {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              hoursAttended:
                status === "PRESENT"
                  ? r.hoursAttended || DEFAULT_CLASS_HOURS
                  : r.hoursAttended,
            }
          : r,
      ),
    );
  }

  function setHours(id: string, hoursAttended: ClassHours) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "PRESENT", hoursAttended } : r,
      ),
    );
  }

  function markAllPresent() {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        status: "PRESENT",
        hoursAttended: r.hoursAttended || DEFAULT_CLASS_HOURS,
      })),
    );
  }

  function onSave() {
    setMessage(null);
    const marks = rows
      .filter((r) => r.status)
      .map((r) => ({
        studentId: r.id,
        status: r.status as "PRESENT" | "ABSENT",
        note: r.note,
        hoursAttended: r.hoursAttended,
        isExtraClass: weekend && r.status === "PRESENT",
      }));

    if (marks.length === 0) {
      setMessage(
        weekend
          ? "Weekends are off by default. Mark Present only for an extra class."
          : "Mark at least one child first.",
      );
      return;
    }

    startTransition(async () => {
      const result = await saveAttendanceForDate({ date, marks });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      const refreshed = await getAttendanceBoardForDate(date);
      if (
        "error" in refreshed &&
        refreshed.error
      ) {
        setMessage("Attendance saved, but couldn’t refresh the list.");
        return;
      }
      if (!("success" in refreshed) || !refreshed.success) {
        setMessage("Attendance saved, but couldn’t refresh the list.");
        return;
      }
      onSaved(refreshed.present);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-forest/50 p-3 sm:items-center sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-attendance-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border-4 border-forest bg-cream shadow-[var(--shadow-chunky)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b-2 border-dashed border-forest px-5 py-3">
          <div>
            <h2
              id="quick-attendance-title"
              className="font-display text-xl font-bold text-forest"
            >
              Mark attendance
            </h2>
            <p className="text-sm font-semibold text-forest-soft">
              For session date · {date}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-forest bg-yellow px-3 py-1 text-sm font-bold text-forest"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {weekend ? (
            <div className="rounded-2xl border-2 border-forest bg-pastel-yellow px-4 py-3">
              <p className="font-display text-lg font-bold text-forest">
                {dayName} is usually off
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Only mark Present if you ran an extra / makeup class.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-forest-soft">
              {loading
                ? "Loading…"
                : `${presentCount} / ${rows.length} present`}
            </p>
            <button
              type="button"
              onClick={markAllPresent}
              disabled={loading || rows.length === 0}
              className="btn-secondary !py-2 text-sm disabled:opacity-60"
            >
              {weekend ? "All present (extra)" : "All present (2h)"}
            </button>
          </div>

          {loadError ? (
            <p className="rounded-2xl border-2 border-red bg-pastel-pink px-3 py-2 text-sm font-semibold text-red-deep">
              {loadError}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-2xl border-2 border-forest bg-mint px-3 py-2 text-sm font-semibold text-forest">
              {message}
            </p>
          ) : null}

          {!loading && rows.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-[1.25rem] border-2 border-forest bg-white p-3"
                >
                  <p className="font-display text-base font-bold text-forest">
                    {row.name}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus(row.id, "PRESENT")}
                      className={`flex-1 rounded-full border-2 border-forest px-2 py-1.5 text-xs font-bold ${
                        row.status === "PRESENT"
                          ? "bg-yellow text-forest"
                          : "bg-cream text-forest"
                      }`}
                    >
                      {weekend ? "Extra" : "Present"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(row.id, "ABSENT")}
                      className={`flex-1 rounded-full border-2 border-forest px-2 py-1.5 text-xs font-bold ${
                        row.status === "ABSENT"
                          ? "bg-pastel-pink text-red-deep"
                          : "bg-cream text-forest"
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                  {row.status === "PRESENT" ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setHours(row.id, DEFAULT_CLASS_HOURS)}
                        className={`flex-1 rounded-full border-2 border-forest px-2 py-1 text-[11px] font-bold ${
                          row.hoursAttended === DEFAULT_CLASS_HOURS
                            ? "bg-mint text-forest"
                            : "bg-white text-forest"
                        }`}
                      >
                        {DEFAULT_CLASS_HOURS}h
                      </button>
                      <button
                        type="button"
                        onClick={() => setHours(row.id, SHORT_CLASS_HOURS)}
                        className={`flex-1 rounded-full border-2 border-forest px-2 py-1 text-[11px] font-bold ${
                          row.hoursAttended === SHORT_CLASS_HOURS
                            ? "bg-pastel-yellow text-forest"
                            : "bg-white text-forest"
                        }`}
                      >
                        {SHORT_CLASS_HOURS}h
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="shrink-0 border-t-2 border-dashed border-forest px-5 py-3">
          <button
            type="button"
            disabled={pending || loading}
            onClick={onSave}
            className="btn-primary w-full disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save & use present children"}
          </button>
        </div>
      </div>
    </div>
  );
}
