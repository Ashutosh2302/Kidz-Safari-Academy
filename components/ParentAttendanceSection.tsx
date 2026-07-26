import {
  consistencyStreakWeeks,
  monthGrid,
  presentHours,
} from "@/lib/attendance-stats";
import { DEFAULT_CLASS_HOURS } from "@/lib/class-hours";
import { hoursOfScreenFreePlayLabel } from "@/lib/copy";
import { formatDisplayDate } from "@/lib/dates";
import { isWeekendDate } from "@/lib/schedule";

type Row = {
  date: Date;
  status: "PRESENT" | "ABSENT";
  note: string | null;
  hoursAttended?: number;
  isExtraClass?: boolean;
};

export function ParentAttendanceSection({
  name,
  attendance,
}: {
  name: string;
  attendance: Row[];
}) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const cells = monthGrid(year, month);
  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));

  const byDay = new Map(
    attendance.map((a) => [a.date.toISOString().slice(0, 10), a]),
  );

  const hours = presentHours(attendance);
  const streak = consistencyStreakWeeks(attendance);
  const plantFill = Math.min(100, (hours / 24) * 100);
  const extraClasses = attendance
    .filter((a) => a.status === "PRESENT" && a.isExtraClass)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-forest">
            Showing up
          </h2>
          <p className="text-sm text-ink-soft">{monthLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="pill-yellow !text-xs">
            {hoursOfScreenFreePlayLabel(hours)}
          </span>
          {streak >= 2 && (
            <span className="rounded-full border-2 border-forest bg-mint px-3 py-1 text-xs font-bold text-forest">
              {streak} weeks in a row
            </span>
          )}
          {extraClasses.length > 0 && (
            <span className="rounded-full border-2 border-forest bg-pastel-yellow px-3 py-1 text-xs font-bold text-forest">
              {extraClasses.length} extra class
              {extraClasses.length === 1 ? "" : "es"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border-2 border-forest bg-mint/50 p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-forest">
          <span>Growing with every class</span>
          <span>{hours}h</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full border border-forest/30 bg-cream">
          <div
            className="h-full rounded-full bg-leaf transition-all"
            style={{ width: `${plantFill}%`, background: "var(--forest-soft)" }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Classes are Mon–Fri. A full day is +{DEFAULT_CLASS_HOURS} hours of
          real-world play for {name}.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-forest-soft sm:text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const cellDate = new Date(Date.UTC(year, month, day));
          const key = cellDate.toISOString().slice(0, 10);
          const row = byDay.get(key);
          const weekend = isWeekendDate(cellDate);
          const present = row?.status === "PRESENT";
          const absent = row?.status === "ABSENT";
          const extra = Boolean(present && row?.isExtraClass);
          const shortStay =
            present && (row?.hoursAttended ?? DEFAULT_CLASS_HOURS) === 1;
          const tip = [
            present
              ? extra
                ? shortStay
                  ? "Extra class · 1 hour"
                  : `Extra class · ${DEFAULT_CLASS_HOURS} hours`
                : shortStay
                  ? "Present · 1 hour"
                  : `Present · ${DEFAULT_CLASS_HOURS} hours`
              : absent
                ? "Absent"
                : weekend
                  ? "Rest day (weekend)"
                  : null,
            row?.note,
          ]
            .filter(Boolean)
            .join(" — ");

          let cellClass =
            "border-transparent bg-cream text-ink-muted";
          if (present && extra) {
            cellClass =
              "border-forest bg-pastel-yellow text-forest shadow-[2px_2px_0_var(--forest)]";
          } else if (present && shortStay) {
            cellClass = "border-forest bg-pastel-yellow text-forest";
          } else if (present) {
            cellClass = "border-forest bg-yellow text-forest";
          } else if (absent) {
            cellClass = "border-forest/30 bg-pastel-pink/80 text-red-deep";
          } else if (weekend) {
            cellClass =
              "border-dashed border-forest/25 bg-cream/80 text-forest-soft/70";
          }

          return (
            <div
              key={key}
              title={tip || undefined}
              className={`flex aspect-square items-center justify-center rounded-full border-2 text-xs font-bold ${cellClass}`}
            >
              {day}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-ink-soft">
        Yellow = class day · soft yellow outline on weekends = rest · bright
        weekend fill = extra class
      </p>

      {extraClasses.length > 0 && (
        <div className="mt-4 rounded-2xl border-2 border-forest bg-pastel-yellow/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-forest-soft">
            Teachers went the extra mile
          </p>
          <ul className="mt-2 space-y-2">
            {extraClasses.slice(0, 4).map((a) => (
              <li key={a.date.toISOString()} className="text-sm">
                <span className="font-bold text-forest">
                  {formatDisplayDate(a.date)}
                </span>
                <span className="text-ink-soft">
                  {" "}
                  — {a.note?.trim() || "Extra class"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
