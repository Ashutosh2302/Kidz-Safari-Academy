import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Bump this after migrations that add models/fields so the Next.js
 * global Prisma singleton is discarded in development.
 */
const PRISMA_SCHEMA_REV = 11;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaRev?: number;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // Neon serverless: use the pooled host (*-pooler.*) — direct connections
  // add real per-request latency under Vercel cold starts.
  if (
    process.env.NODE_ENV === "production" &&
    /neon\.tech/i.test(connectionString) &&
    !/-pooler\./i.test(connectionString)
  ) {
    console.warn(
      "[prisma] DATABASE_URL looks like a Neon direct (unpooled) host. " +
        "Prefer the connection string whose hostname contains “-pooler” " +
        "(Neon dashboard → Connection details → Pooled connection).",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function runtimeHasField(
  client: PrismaClient,
  model: string,
  field: string,
) {
  const models = (
    client as unknown as {
      _runtimeDataModel?: {
        models?: Record<string, { fields?: { name: string }[] }>;
      };
    }
  )._runtimeDataModel?.models;

  const fields = models?.[model]?.fields;
  if (!fields) return true; // shape unknown — don't thrash
  return fields.some((f) => f.name === field);
}

function isStaleClient(client: PrismaClient) {
  // Cached clients from before a schema change lack new model delegates/fields
  if (
    typeof (client as { mediaAsset?: { findMany?: unknown } }).mediaAsset
      ?.findMany !== "function"
  ) {
    return true;
  }
  if (!runtimeHasField(client, "Attendance", "hoursAttended")) return true;
  if (!runtimeHasField(client, "Attendance", "isExtraClass")) return true;
  if (!runtimeHasField(client, "Session", "activityCategory")) return true;
  if (!runtimeHasField(client, "Student", "photoUrl")) return true;
  if (!runtimeHasField(client, "SessionPhoto", "isHighlight")) return true;
  if (!runtimeHasField(client, "MediaAsset", "isHighlight")) return true;
  if (!runtimeHasField(client, "StudentMilestone", "note")) return true;
  return false;
}

function getClient() {
  const revMismatch = globalForPrisma.prismaSchemaRev !== PRISMA_SCHEMA_REV;
  if (
    process.env.NODE_ENV !== "production" &&
    globalForPrisma.prisma &&
    (revMismatch || isStaleClient(globalForPrisma.prisma))
  ) {
    void globalForPrisma.prisma.$disconnect();
    globalForPrisma.prisma = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaSchemaRev = PRISMA_SCHEMA_REV;
  }

  return globalForPrisma.prisma;
}

/** Lazily resolves client so schema regenerates don't keep a stale singleton */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
