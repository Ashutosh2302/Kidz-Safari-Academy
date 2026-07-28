import {
  LeapUnlockCard,
  LeapUnlockCardList,
} from "@/components/LeapUnlockCard";
import { formatDisplayDate } from "@/lib/dates";

type Item = {
  id: string;
  achievedDate: Date;
  note: string | null;
  milestone: {
    name: string;
    category: string;
    icon: string;
  };
};

/** All leaps modal body — clean, parent-facing list. */
export function ParentMilestonesSection({
  name,
  items,
}: {
  name: string;
  items: Item[];
}) {
  if (items.length === 0) {
    return (
      <div className="px-1 py-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-forest-soft">
          0 leaps yet
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          No leaps unlocked yet — every journey starts with tiny steps 🐾
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          As {name} grows, specific moments will light up here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm leading-relaxed text-ink-soft">
        Skills {name} has unlocked since joining · {items.length}{" "}
        {items.length === 1 ? "leap" : "leaps"}
      </p>
      <LeapUnlockCardList className="mt-4" columns={2}>
        {items.map((item, index) => {
          const dateLabel = formatDisplayDate(item.achievedDate);
          const description = [dateLabel, item.note?.trim()]
            .filter(Boolean)
            .join(" · ");
          return (
            <LeapUnlockCard
              key={item.id}
              index={index}
              icon={item.milestone.icon}
              name={item.milestone.name}
              category={item.milestone.category}
              description={description}
            />
          );
        })}
      </LeapUnlockCardList>
    </div>
  );
}
