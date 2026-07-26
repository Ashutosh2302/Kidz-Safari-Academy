import { MemoryLane } from "@/components/MemoryLane";
import { ShareUpdate } from "@/components/ShareUpdate";
import { hoursOfPlayLabel, screenFreeHoursLabel } from "@/lib/copy";
import type { MemoryLanePhoto } from "@/lib/memory-lane";

type MilestoneHighlight = {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
} | null;

export function ParentThisWeek({
  name,
  weekHours,
  weekTarget,
  hoursSinceJoining,
  milestone,
  joinedOn,
  memoryPhotos,
}: {
  name: string;
  weekHours: number;
  weekTarget: number;
  hoursSinceJoining: number;
  milestone: MilestoneHighlight;
  joinedOn: string;
  memoryPhotos: MemoryLanePhoto[];
}) {
  const fill = Math.min(100, (weekHours / Math.max(weekTarget, 1)) * 100);
  // Exact fill so 1/5 reads as a true fifth; plant sits on top of the waterline
  const plantHeight = fill;

  return (
    <section
      id="this-week"
      className="surface-card scroll-mt-4 overflow-hidden p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-forest-soft">
            This week
          </p>
          <h2 className="font-display text-2xl font-bold text-forest">
            Why this hour mattered
          </h2>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-sm font-semibold text-ink-soft">
            {screenFreeHoursLabel(hoursSinceJoining)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <MemoryLane
              name={name}
              joinedOn={joinedOn}
              photos={memoryPhotos}
            />
            <ShareUpdate
              childName={name}
              milestone={
                milestone
                  ? {
                      name: milestone.name,
                      category: milestone.category,
                      icon: milestone.icon,
                      description: milestone.description,
                    }
                  : null
              }
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {/* Screen-time saved plant/jar */}
        <div
          id="this-week-screentime"
          className="flex items-center gap-4 rounded-2xl border-2 border-forest bg-mint/60 p-4 scroll-mt-6 transition"
        >
          <div
            className="relative flex h-24 w-16 shrink-0 flex-col justify-end overflow-hidden rounded-b-[2rem] rounded-t-lg border-2 border-forest bg-cream"
            aria-hidden
          >
            {/* Fifth-marks so low fill looks intentional */}
            {[1, 2, 3, 4].map((fifth) => (
              <div
                key={fifth}
                className="pointer-events-none absolute inset-x-0 z-[1] border-t border-dashed border-forest/25"
                style={{ bottom: `${(fifth / 5) * 100}%` }}
              />
            ))}
            <div
              className="absolute inset-x-0 bottom-0 bg-forest-soft/85 transition-all duration-700"
              style={{ height: `${plantHeight}%` }}
            />
            <div
              className="absolute inset-x-0 z-10 flex flex-col items-center transition-all duration-700"
              style={{
                bottom: plantHeight > 0 ? `calc(${plantHeight}% - 0.35rem)` : "0.35rem",
              }}
            >
              <span className="text-lg leading-none drop-shadow-sm">🌿</span>
              {weekHours >= 3 && (
                <span className="mt-0.5 text-sm leading-none">🌻</span>
              )}
            </div>
            <div className="pointer-events-none absolute inset-x-1 top-1 z-[2] h-2 rounded-full bg-forest/10" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold text-forest">
              {hoursOfPlayLabel(weekHours)}
            </p>
            <p className="mt-1 text-sm leading-snug text-ink-soft">
              Instead of screens this week — each present class grows{" "}
              {name}&apos;s little garden.
            </p>
            <div className="relative mt-2 h-2 overflow-hidden rounded-full border border-forest/25 bg-cream">
              {[1, 2, 3, 4].map((fifth) => (
                <div
                  key={fifth}
                  className="pointer-events-none absolute inset-y-0 w-px bg-forest/20"
                  style={{ left: `${(fifth / 5) * 100}%` }}
                />
              ))}
              <div
                className="relative h-full rounded-full bg-yellow transition-all duration-700"
                style={{ width: `${fill}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-forest-soft">
              {weekHours}/{weekTarget} in the last 7 days
            </p>
          </div>
        </div>

        {/* Leap highlight */}
        <div
          id="this-week-milestone"
          className={`rounded-2xl border-2 border-forest p-4 scroll-mt-6 transition ${
            milestone ? "bg-pastel-yellow" : "bg-cream"
          }`}
        >
          {milestone ? (
            <div className="flex items-start gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-forest bg-card text-3xl shadow-[var(--shadow-card)]">
                {milestone.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-forest-soft">
                  Leap unlocked · {milestone.category}
                </p>
                <p className="font-display text-xl font-bold text-forest">
                  {milestone.name}
                </p>
                <p className="mt-1 text-sm leading-snug text-ink-soft">
                  {milestone.description}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[7.5rem] flex-col justify-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-forest-soft">
                Tiny leaps · 0 yet
              </p>
              <p className="mt-1 font-display text-lg font-bold text-forest">
                No leaps unlocked yet
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Every journey starts with tiny steps 🐾 — when {name} unlocks a
                leap, the specific moment will shine here.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
