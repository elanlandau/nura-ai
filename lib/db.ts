import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  if (url.startsWith('file:')) {
    const relativePath = url.replace(/^file:\/\//, '').replace(/^file:/, '');
    const absolutePath = path.isAbsolute(relativePath)
      ? relativePath
      : path.resolve(process.cwd(), relativePath);
    return `file:${absolutePath}`;
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = getDatabaseUrl();
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
