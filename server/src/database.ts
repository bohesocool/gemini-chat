import { PrismaClient } from '@prisma/client';
import { config } from './config.js';

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

function createClient(): PrismaClient {
  return new PrismaClient({
    log: config.nodeEnv === 'production' ? ['warn', 'error'] : ['query', 'warn', 'error'],
  });
}

export const prisma: PrismaClient = config.dbEnabled
  ? (globalForPrisma.__prisma ?? createClient())
  : (new Proxy({} as PrismaClient, {
      get() {
        throw new Error('Database is disabled (DB_ENABLED=false); Prisma client should not be used.');
      },
    }));

if (config.dbEnabled && config.nodeEnv !== 'production') {
  globalForPrisma.__prisma = prisma;
}

export async function initDatabase(): Promise<void> {
  if (!config.dbEnabled) return;
  await prisma.$connect();
}
