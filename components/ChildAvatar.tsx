/** Neutral child-safe default when no portrait is uploaded. */
function SafariDefaultAvatar({
  name,
  sizeClass,
}: {
  name: string;
  sizeClass: string;
}) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  return (
    <span
      aria-hidden
      className={`${sizeClass} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-yellow bg-mint shadow-[2px_2px_0_rgba(0,0,0,0.15)]`}
    >
      {/* Soft safari leaf mark */}
      <svg
        viewBox="0 0 40 40"
        className="absolute inset-0 h-full w-full opacity-35"
        aria-hidden
      >
        <ellipse cx="20" cy="22" rx="11" ry="14" fill="#2F5D3A" />
        <path
          d="M20 8c0 8-6 12-6 18 4-2 8-2 12 0 0-6-6-10-6-18z"
          fill="#4A7C59"
        />
        <circle cx="20" cy="10" r="2.5" fill="#C4A35A" />
      </svg>
      <span className="relative z-[1] font-display font-bold text-forest">
        {initial}
      </span>
    </span>
  );
}

export function ChildAvatar({
  name,
  photoUrl,
  size = "md",
}: {
  name: string;
  photoUrl: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg"
      ? "h-14 w-14 text-xl"
      : size === "sm"
        ? "h-9 w-9 text-sm"
        : "h-12 w-12 text-lg";

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full border-2 border-yellow object-cover object-top shadow-[2px_2px_0_rgba(0,0,0,0.15)]`}
      />
    );
  }

  return <SafariDefaultAvatar name={name} sizeClass={sizeClass} />;
}
