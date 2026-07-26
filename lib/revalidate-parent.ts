import { revalidatePath } from "next/cache";

/**
 * Invalidate parent portal pages (covers `/s/{slug}-{token}` and legacy `/s/{token}`).
 */
export function revalidateParentPortal(magicLinkToken?: string | null) {
  revalidatePath("/s/[token]", "page");
  if (magicLinkToken) {
    revalidatePath(`/s/${magicLinkToken}`);
  }
}
