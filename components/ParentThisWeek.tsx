import { MemoryLane } from "@/components/MemoryLane";
import {
  INLINE_LEAP_LIMIT,
  LeapUnlockCard,
  LeapUnlockCardList,
} from "@/components/LeapUnlockCard";
import { ViewMoreLeapsButton } from "@/components/ParentExtrasModals";
import { ShareUpdate } from "@/components/ShareUpdate";
import { hoursOfPlayLabel, screenFreeHoursLabel } from "@/lib/copy";
import type { MemoryLaneMedia } from "@/lib/memory-lane";

export type LeapHighlight = {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
};

export function ParentThisWeek({
  name,
  weekHours,
  weekTarget,
  hoursSinceJoining,
  milestones,
  totalLeapCount,
  joinedOn,
  memoryPhotos,
}: {
  name: string;
  weekHours: number;
  weekTarget: number;
  hoursSinceJoining: number;
  /** Up to 3 recent leaps for the compact preview row. */
  milestones: LeapHighlight[];
  totalLeapCount: number;
  joinedOn: string;
  memoryPhotos: MemoryLaneMedia[];
}) {
  const fill = Math.min(100, (weekHours / Math.max(weekTarget, 1)) * 100);
  const plantHeight = fill;
  const shareMilestone = milestones[0] ?? null;
  const remainingCount = Math.max(0, totalLeapCount - milestones.length);
  const showViewMore = totalLeapCount > INLINE_LEAP_LIMIT;

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
            Screen-free hours
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
                shareMilestone
                  ? {
                      name: shareMilestone.name,
                      category: shareMilestone.category,
                      icon: shareMilestone.icon,
                      description: shareMilestone.description,
                    }
                  : null
              }
            />
          </div>
        </div>
      </div>

      {/* Same 2-col row height as before — garden | compact 3-leap strip */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:items-stretch">
        <div
          id="this-week-screentime"
          className="flex items-center gap-4 rounded-2xl border-2 border-forest bg-mint/60 p-4 scroll-mt-6 transition"
        >
          <div
            className="relative flex h-24 w-16 shrink-0 flex-col justify-end overflow-hidden rounded-b-[2rem] rounded-t-lg border-2 border-forest bg-cream"
            aria-hidden
          >
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
                bottom:
                  plantHeight > 0
                    ? `calc(${plantHeight}% - 0.35rem)`
                    : "0.35rem",
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
              Instead of screens, {name} spent this time playing, building, and
              exploring with classmates.
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

        {/* Same rectangle slot — 3 compact modal-style tiles inside */}
        <div
          id="this-week-milestone"
          className="flex flex-col justify-center rounded-2xl border-2 border-forest bg-cream p-2.5 scroll-mt-6 sm:p-3"
        >
          {milestones.length === 0 ? (
            <div className="px-1 py-2">
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
          ) : (
            <>
              <LeapUnlockCardList>
                {milestones.map((milestone, index) => (
                  <LeapUnlockCard
                    key={milestone.id}
                    index={index}
                    icon={milestone.icon}
                    name={milestone.name}
                    category={milestone.category}
                    description={milestone.description}
                  />
                ))}
              </LeapUnlockCardList>
              {showViewMore ? (
                <ViewMoreLeapsButton remainingCount={remainingCount} />
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export { INLINE_LEAP_LIMIT };
