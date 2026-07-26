import { formatDisplayDate } from "@/lib/dates";

/** Simple join-date line — ongoing relationship, not a bounded term. */
export function WithUsSince({ joinedOn }: { joinedOn: Date }) {
  return (
    <div className="border-b-2 border-dashed border-forest/30 bg-mint/40 px-5 py-2.5 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-sm font-bold text-forest sm:text-base">
          With us since {formatDisplayDate(joinedOn)}
        </p>
      </div>
    </div>
  );
}
