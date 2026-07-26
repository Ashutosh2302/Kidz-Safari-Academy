"use client";

import Link, { useLinkStatus } from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const links = [
  { href: "/admin/media", label: "Photos & videos" },
  { href: "/admin", label: "Notes" },
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

export function AdminNav({ current }: { current: string }) {
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
      <nav className="flex flex-wrap gap-2" aria-label="Teacher desk">
        {links.map((link) => {
          const active =
            link.href === "/admin"
              ? current === "/admin"
              : current.startsWith(link.href);
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
      </nav>
    </div>
  );
}
