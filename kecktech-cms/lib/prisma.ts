import { PrismaClient } from '@prisma/client'

// Singleton pattern for Prisma Client
// This ensures we only have one instance of Prisma Client across the application
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Log database URL in development to debug connection issues
if (process.env.NODE_ENV === 'development') {
  console.log('[PRISMA] DATABASE_URL:', process.env.DATABASE_URL || 'NOT SET');
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
