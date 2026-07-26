import { generateMagicToken } from "@/lib/magic-link";
import { prisma } from "@/lib/prisma";

/** Allocate a unique 8-char token, retrying on the rare collision. */
export async function allocateUniqueMagicToken(): Promise<string> {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const token = generateMagicToken();
    const exists = await prisma.student.findUnique({
      where: { magicLinkToken: token },
      select: { id: true },
    });
    if (!exists) return token;
  }
  throw new Error("Could not allocate a unique magic-link token.");
}
