import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
};

/**
 * Shared empty state for admin tabs — icon + heading + subtext + primary action.
 */
export function EmptyState({
  icon = "🌱",
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: Props) {
  return (
    <div className="surface-card flex flex-col items-center px-6 py-12 text-center sm:px-10 sm:py-14">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-forest bg-mint text-3xl shadow-[2px_2px_0_rgba(0,0,0,0.12)]"
        aria-hidden
      >
        {icon}
      </span>
      <h2 className="mt-5 font-display text-2xl font-bold text-forest sm:text-3xl">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-ink-soft">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn-primary mt-6 !py-2.5 text-sm">
          {actionLabel}
        </Link>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
