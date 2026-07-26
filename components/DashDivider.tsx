export function DashDivider({ className = "" }: { className?: string }) {
  return <hr className={`dash-divider ${className}`} aria-hidden />;
}
