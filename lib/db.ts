import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Single PrismaClient instance. Cached on globalThis so serverless (e.g. Vercel)
 * reuses one client per process and avoids PrismaClientInitializationError.
 * Uses DATABASE_URL from env (schema: url = env("DATABASE_URL")).
 */
function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = new PrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = getPrisma();
