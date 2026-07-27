"use client";

import Link, { useLinkStatus } from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const links = [
  { href: "/admin/media", label: "Session" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/fees", label: "Fees" },
  { href: "/admin/milestones", label: "Leaps" },
] as const;

function NavPendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`ml-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-forest transition-opacity duration-150 ${
        pending ? "animate-pulse opacity-100" : "opacity-0"
      }`}
      style={
        pending
          ? undefined
          : // Debounce flash on fast navigations (see Next.js useLinkStatus docs)
            { animationDelay: "100ms" }
      }
    />
  );
}

export type AdminNavBranch = {
  label: string;
  href?: string;
};

/**
 * Optional nested trail under Students (or another tab), e.g.
 * Students ·····→ Sessions
 */
export function AdminNav({
  current,
  branch,
}: {
  current: string;
  /** Shown under the active Students tab when nested (profile / sessions). */
  branch?: AdminNavBranch[];
}) {
  const showStudentsBranch =
    Boolean(branch?.length) && current.startsWith("/admin/students");

  return (
    <div className="mb-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <BrandLogo height={48} />
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-forest">
            Gentle Sprouts Academy
          </p>
          <p className="text-xs font-semibold text-forest-soft">
            Kidz Safari · Teacher desk
          </p>
        </div>
      </div>
      <nav aria-label="Teacher desk">
        <div className="flex flex-wrap gap-2">
          {links.map((link) => {
            const active = current.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "pill-yellow inline-flex items-center"
                    : "inline-flex items-center rounded-full border-2 border-forest bg-white px-3 py-1.5 text-sm font-bold text-forest"
                }
              >
                {link.label}
                <NavPendingHint />
              </Link>
            );
          })}
        </div>

        {showStudentsBranch ? (
          <ol
            className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t-2 border-dotted border-forest/25 pt-2 text-xs font-bold text-forest"
            aria-label="Within Students"
          >
            <li>
              <Link
                href="/admin/students"
                className="text-forest-soft underline-offset-2 hover:text-forest hover:underline"
              >
                Students
              </Link>
            </li>
            {branch!.map((item, i) => {
              const isLast = i === branch!.length - 1;
              return (
                <li
                  key={`${item.label}-${i}`}
                  className="flex items-center gap-2"
                >
                  <span className="tracking-widest text-forest/40" aria-hidden>
                    ···
                  </span>
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="text-forest-soft underline-offset-2 hover:text-forest hover:underline"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className="rounded-full border-2 border-forest bg-mint px-2.5 py-0.5"
                      aria-current="page"
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        ) : null}
      </nav>
    </div>
  );
}
