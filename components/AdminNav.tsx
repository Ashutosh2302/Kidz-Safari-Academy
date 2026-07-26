import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const links = [
  { href: "/admin/media", label: "Photos & videos" },
  { href: "/admin", label: "Notes" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/fees", label: "Fees" },
  { href: "/admin/milestones", label: "Leaps" },
] as const;

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
      <nav className="flex flex-wrap gap-2">
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
                  ? "pill-yellow"
                  : "rounded-full border-2 border-forest bg-white px-3 py-1.5 text-sm font-bold text-forest"
              }
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
