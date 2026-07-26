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
      className="animate-soft-pop flex min-w-0 items-start gap-2 rounded-2xl border-2 border-forest bg-pastel-yellow p-2 sm:gap-2.5 sm:p-2.5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-forest bg-card text-lg sm:h-10 sm:w-10 sm:text-xl">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-sm font-bold leading-tight text-forest">
          {name}
        </span>
        <span className="block truncate text-[10px] font-semibold text-forest-soft">
          {category}
        </span>
        {description?.trim() ? (
          <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-ink-soft">
            {description.trim()}
          </span>
        ) : null}
      </span>
    </li>
  );
}

/** Up to 3 compact cards per row. */
export function LeapUnlockCardList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul className={`grid grid-cols-3 gap-2 ${className}`.trim()}>{children}</ul>
  );
}

export const INLINE_LEAP_LIMIT = 3;
