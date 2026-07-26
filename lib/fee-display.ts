/** Client-safe fee display helpers — no Prisma / Node imports. */

export function formatCycleRange(periodStart: Date, periodEnd: Date) {
  const fmt = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${fmt.format(periodStart)} – ${fmt.format(periodEnd)}`;
}

export function feeStatusBadgeClass(status: string) {
  if (status === "PAID") return "bg-mint text-forest";
  if (status === "PARTIAL") return "bg-pastel-yellow text-forest";
  if (status === "WAIVED") return "bg-pastel-blue text-forest";
  return "bg-pastel-pink text-red-deep";
}

export function paymentMethodLabel(method: string) {
  switch (method) {
    case "UPI":
      return "UPI";
    case "BANK":
      return "Bank";
    case "OTHER":
      return "Other";
    default:
      return "Cash";
  }
}

export function resolveFeeStatus(
  amountDue: number,
  amountPaid: number,
  waived = false,
): "DUE" | "PAID" | "PARTIAL" | "WAIVED" {
  if (waived) return "WAIVED";
  if (amountPaid <= 0) return "DUE";
  if (amountPaid >= amountDue) return "PAID";
  return "PARTIAL";
}
