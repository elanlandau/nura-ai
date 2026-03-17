import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function isPostgresUrl(url: string | undefined): boolean {
  return Boolean(url && (url.startsWith('postgresql://') || url.startsWith('postgres://')));
}

function isEdgeRuntime(): boolean {
  // Next.js sets NEXT_RUNTIME=edge for edge route handlers.
  // Also detect global EdgeRuntime variable when present.
  return process.env.NEXT_RUNTIME === 'edge' || typeof (globalThis as any).EdgeRuntime !== 'undefined';
}

/**
 * Single PrismaClient instance. Cached on globalThis so serverless (e.g. Vercel)
 * reuses one client per process and avoids PrismaClientInitializationError.
 * On Vercel we use adapter-pg (Node.js runtime) for Postgres to avoid the binary engine.
 */
function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  if (isEdgeRuntime()) {
    throw new Error(
      'PrismaClientInitializationError: Prisma cannot run in the Edge runtime. ' +
        'Set `export const runtime = \"nodejs\"` in any route handler that imports prisma.'
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === '') {
    throw new Error('PrismaClientInitializationError: DATABASE_URL is not set in the environment.');
  }

  globalForPrisma.prisma = isPostgresUrl(databaseUrl)
    ? new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
    : new PrismaClient();
  return globalForPrisma.prisma;
}

export const prisma = getPrisma();
