"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { saveAttendanceForDate } from "@/app/actions/attendance";
import {
  DEFAULT_CLASS_HOURS,
  normalizeClassHours,
  SHORT_CLASS_HOURS,
  type ClassHours,
} from "@/lib/class-hours";
import { toDateInputValue } from "@/lib/dates";
import { isWeekendDate, weekendLabel } from "@/lib/schedule";

type StudentRow = {
  id: string;
  name: string;
  status: "PRESENT" | "ABSENT" | null;
  note: string;
  hoursAttended: ClassHours;
};

function toRows(
  students: {
    id: string;
    name: string;
    status: "PRESENT" | "ABSENT" | null;
    note: string | null;
    hoursAttended: number | null;
  }[],
): StudentRow[] {
  return students.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    note: s.note ?? "",
    hoursAttended: normalizeClassHours(s.hoursAttended),
  }));
}

export function AttendanceBoard({
  initialDate,
  students,
}: {
  initialDate: string;
  students: {
    id: string;
    name: string;
    status: "PRESENT" | "ABSENT" | null;
    note: string | null;
    hoursAttended: number | null;
  }[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [rows, setRows] = useState<StudentRow[]>(() => toRows(students));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Soft nav updates server props; key={date} remounts, this covers prop sync
  useEffect(() => {
    setDate(initialDate);
    setRows(toRows(students));
    setMessage(null);
    // students for a date arrive with initialDate from the server page
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the date changes
  }, [initialDate]);

  const weekend = isWeekendDate(date);
  const dayName = weekend ? weekendLabel(date) : null;

  const presentCount = useMemo(
    () => rows.filter((r) => r.status === "PRESENT").length,
    [rows],
  );
  const hourTotal = useMemo(
    () =>
      rows
        .filter((r) => r.status === "PRESENT")
        .reduce((sum, r) => sum + r.hoursAttended, 0),
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
      setMessage(
        weekend
          ? "Extra class saved — parents will see you went the extra mile."
          : "Attendance saved.",
      );
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-forest">Date</span>
          <input
            type="date"
            value={date}
            max={toDateInputValue()}
            onChange={(e) => {
              const next = e.target.value;
              setDate(next);
              setMessage(null);
              startTransition(() => {
                router.push(`/admin/attendance?date=${next}`);
                router.refresh();
              });
            }}
            className="input-field max-w-xs"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={markAllPresent}
            className="btn-secondary !py-2 text-sm"
          >
            {weekend ? "All present (extra class)" : "All present (2h)"}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="btn-primary !py-2 text-sm disabled:opacity-60"
          >
            {pending ? "Saving…" : weekend ? "Save extra class" : "Save attendance"}
          </button>
        </div>
      </div>

      {weekend ? (
        <div className="rounded-2xl border-2 border-forest bg-pastel-yellow px-4 py-3">
          <p className="font-display text-lg font-bold text-forest">
            {dayName} is usually off
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Only mark Present if you ran an extra / makeup class. Add a short
            note (optional) — parents will see it as teachers going the extra
            mile. Leave everyone unmarked to keep the day off.
          </p>
        </div>
      ) : null}

      <p className="text-sm font-semibold text-forest-soft">
        {presentCount} / {rows.length} present · {hourTotal}h total
        <span className="font-normal text-ink-soft">
          {" "}
          (full class is {DEFAULT_CLASS_HOURS}h)
        </span>
      </p>

      {message && (
        <p className="rounded-2xl border-2 border-forest bg-mint px-4 py-3 text-sm font-semibold text-forest">
          {message}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <li key={row.id} className="surface-card p-4">
            <p className="font-display text-lg font-bold text-forest">{row.name}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setStatus(row.id, "PRESENT")}
                className={`flex-1 rounded-full border-2 border-forest px-3 py-2 text-sm font-bold ${
                  row.status === "PRESENT"
                    ? "bg-yellow text-forest"
                    : "bg-white text-forest"
                }`}
              >
                {weekend ? "Extra class" : "Present"}
              </button>
              <button
                type="button"
                onClick={() => setStatus(row.id, "ABSENT")}
                className={`flex-1 rounded-full border-2 border-forest px-3 py-2 text-sm font-bold ${
                  row.status === "ABSENT"
                    ? "bg-pastel-pink text-red-deep"
                    : "bg-white text-forest"
                }`}
              >
                Absent
              </button>
            </div>
            {row.status === "PRESENT" && (
              <>
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-forest-soft">
                    Time today
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHours(row.id, DEFAULT_CLASS_HOURS)}
                      className={`flex-1 rounded-full border-2 border-forest px-2 py-1.5 text-xs font-bold ${
                        row.hoursAttended === DEFAULT_CLASS_HOURS
                          ? "bg-mint text-forest"
                          : "bg-white text-forest"
                      }`}
                    >
                      {DEFAULT_CLASS_HOURS}h full
                    </button>
                    <button
                      type="button"
                      onClick={() => setHours(row.id, SHORT_CLASS_HOURS)}
                      className={`flex-1 rounded-full border-2 border-forest px-2 py-1.5 text-xs font-bold ${
                        row.hoursAttended === SHORT_CLASS_HOURS
                          ? "bg-pastel-yellow text-forest"
                          : "bg-white text-forest"
                      }`}
                    >
                      {SHORT_CLASS_HOURS}h only
                    </button>
                  </div>
                </div>
                <input
                  value={row.note}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) =>
                        r.id === row.id ? { ...r, note: e.target.value } : r,
                      ),
                    )
                  }
                  placeholder={
                    weekend
                      ? "e.g. Makeup Nature Circle / special workshop…"
                      : "Optional: practiced sharing…"
                  }
                  className="input-field mt-3 !py-2 text-sm"
                />
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
