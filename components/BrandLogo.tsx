/**
 * Kidz Safari brand mark (logo file includes its own dark background).
 */
export function BrandLogo({
  height = 48,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex shrink-0 items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-kidzsafari-bg.png"
        alt="Kidz Safari — Tiny steps to giant leaps"
        height={height}
        className="w-auto object-contain"
        style={{ height }}
      />
    </span>
  );
}
