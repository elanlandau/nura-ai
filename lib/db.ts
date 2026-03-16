import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function isPostgresUrl(url: string | undefined): boolean {
  return Boolean(url && (url.startsWith('postgresql://') || url.startsWith('postgres://')));
}

/**
 * Single PrismaClient instance. Cached on globalThis so serverless (e.g. Vercel)
 * reuses one client per process and avoids PrismaClientInitializationError.
 * On Vercel we use adapter-pg (Node.js runtime) for Postgres to avoid the binary engine.
 */
function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const databaseUrl = process.env.DATABASE_URL;
  console.log('DB URL check:', databaseUrl?.slice(0, 15) ?? '(not set)');

  if (isPostgresUrl(databaseUrl)) {
    const adapter = new PrismaPg({ connectionString: databaseUrl! });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  } else {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrisma();
