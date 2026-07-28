import type { ReactNode } from "react";

/** Compact leap tile — same look on landing preview + All leaps modal. */
export function LeapUnlockCard({
  icon,
  name,
  category,
  description,
  index = 0,
}: {
  icon: string;
  name: string;
  category: string;
  description?: string | null;
  index?: number;
}) {
  return (
    <li
      className="animate-soft-pop flex min-w-0 items-start gap-3 rounded-2xl border-2 border-forest bg-pastel-yellow p-3"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-forest bg-card text-xl"
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="block font-display text-base font-bold leading-snug text-forest">
          {name}
        </span>
        <span className="mt-0.5 block text-xs font-semibold text-forest-soft">
          {category}
        </span>
        {description?.trim() ? (
          <span className="mt-1 block text-sm leading-snug text-ink-soft">
            {description.trim()}
          </span>
        ) : null}
      </span>
    </li>
  );
}

/** Stacked list — readable on phones; optional second column on wider screens. */
export function LeapUnlockCardList({
  children,
  className = "",
  columns = 1,
}: {
  children: ReactNode;
  className?: string;
  /** Use 2 on wide modals; keep 1 in narrow page columns. */
  columns?: 1 | 2;
}) {
  return (
    <ul
      className={`grid grid-cols-1 gap-2 ${
        columns === 2 ? "sm:grid-cols-2" : ""
      } ${className}`.trim()}
    >
      {children}
    </ul>
  );
}

export const INLINE_LEAP_LIMIT = 3;
