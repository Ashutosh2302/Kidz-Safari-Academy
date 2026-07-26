"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ParentAttendanceSection } from "@/components/ParentAttendanceSection";
import { ParentMilestonesSection } from "@/components/ParentMilestonesSection";

type AttendanceRow = {
  date: string;
  status: "PRESENT" | "ABSENT";
  note: string | null;
  hoursAttended: number;
  isExtraClass: boolean;
};

type MilestoneItem = {
  id: string;
  achievedDate: string;
  note: string | null;
  milestone: {
    name: string;
    category: string;
    icon: string;
  };
};

type ModalKind = "attendance" | "milestones" | null;

type PortalModalActions = {
  openAllLeaps: () => void;
  openAttendance: () => void;
};

const ParentPortalModalContext = createContext<PortalModalActions | null>(null);

export function useParentPortalModals() {
  const ctx = useContext(ParentPortalModalContext);
  if (!ctx) {
    throw new Error(
      "useParentPortalModals must be used within ParentExtrasProvider",
    );
  }
  return ctx;
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.add("ring-4", "ring-yellow", "ring-offset-2", "ring-offset-cream");
  window.setTimeout(() => {
    el.classList.remove(
      "ring-4",
      "ring-yellow",
      "ring-offset-2",
      "ring-offset-cream",
    );
  }, 1600);
}

export function ParentExtrasProvider({
  name,
  attendance,
  milestones,
  children,
}: {
  name: string;
  attendance: AttendanceRow[];
  milestones: MilestoneItem[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState<ModalKind>(null);
  const titleId = useId();
  const openAllLeaps = useCallback(() => setOpen("milestones"), []);
  const openAttendance = useCallback(() => setOpen("attendance"), []);
  const actions = useMemo(
    () => ({ openAllLeaps, openAttendance }),
    [openAllLeaps, openAttendance],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <ParentPortalModalContext.Provider value={actions}>
      {children}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-forest/50 p-3 sm:items-center sm:p-6"
          role="presentation"
          onClick={() => setOpen(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border-4 border-forest bg-cream shadow-[var(--shadow-chunky)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-dashed border-forest bg-cream px-4 py-3 sm:px-5">
              <h2
                id={titleId}
                className="font-display text-lg font-bold text-forest sm:text-xl"
              >
                {open === "attendance" ? "Showing up" : "Tiny leaps"}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-full border-2 border-forest bg-yellow px-3 py-1 text-sm font-bold text-forest"
              >
                Close
              </button>
            </div>
            <div className="p-3 sm:p-4">
              {open === "attendance" ? (
                <ParentAttendanceSection
                  name={name}
                  attendance={attendance.map((a) => ({
                    ...a,
                    date: new Date(a.date),
                  }))}
                />
              ) : (
                <ParentMilestonesSection
                  name={name}
                  items={milestones.map((m) => ({
                    ...m,
                    achievedDate: new Date(m.achievedDate),
                  }))}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </ParentPortalModalContext.Provider>
  );
}

export function ParentExtrasModals({
  presentHours,
  leapCount,
  sessionCount,
  photoCount,
  classStreak,
}: {
  presentHours: number;
  leapCount: number;
  sessionCount: number;
  photoCount: number;
  classStreak: number;
}) {
  const { openAllLeaps, openAttendance } = useParentPortalModals();

  const statPill =
    "inline-flex items-center rounded-full border-2 border-yellow/50 bg-forest/25 px-3 py-1.5 text-xs font-bold text-yellow/95";
  const actionPill =
    "inline-flex items-center gap-1 rounded-full border-2 border-yellow bg-yellow px-3 py-1.5 text-xs font-bold text-forest shadow-[2px_2px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {sessionCount > 0 && (
        <span className={statPill}>
          {sessionCount} session{sessionCount === 1 ? "" : "s"}
        </span>
      )}
      {classStreak >= 2 && (
        <span className={statPill}>
          {classStreak} class{classStreak === 1 ? "" : "es"} in a row
        </span>
      )}
      {photoCount > 0 && (
        <span className={statPill}>
          {photoCount} photo{photoCount === 1 ? "" : "s"}
        </span>
      )}
      <button
        type="button"
        onClick={() => scrollToId("this-week-screentime")}
        className={statPill}
        title="Jump to this week’s screen-time"
      >
        Showing up{presentHours > 0 ? ` · ${presentHours}h` : ""}
      </button>
      <button
        type="button"
        onClick={() => scrollToId("this-week-milestone")}
        className={statPill}
        title="Jump to this week’s leap"
      >
        Tiny leaps{leapCount > 0 ? ` · ${leapCount}` : ""}
      </button>
      <button type="button" onClick={openAttendance} className={actionPill}>
        Calendar
        <span aria-hidden className="text-[10px]">
          ▾
        </span>
      </button>
      <button type="button" onClick={openAllLeaps} className={actionPill}>
        All leaps
        <span aria-hidden className="text-[10px]">
          ▾
        </span>
      </button>
    </div>
  );
}

export function ViewMoreLeapsButton({
  remainingCount,
}: {
  remainingCount: number;
}) {
  const { openAllLeaps } = useParentPortalModals();
  return (
    <button
      type="button"
      onClick={openAllLeaps}
      className="mt-1.5 text-left text-[11px] font-bold leading-none text-forest-soft transition hover:text-forest sm:text-xs"
    >
      {remainingCount > 0
        ? `View more leaps (${remainingCount}) →`
        : "View more leaps →"}
    </button>
  );
}
