import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

// Read DATABASE_URL directly from .env to avoid stale system env vars
function getDbUrl(): string {
  try {
    const envContent = readFileSync(join(process.cwd(), '.env'), 'utf-8')
    const match = envContent.match(/^DATABASE_URL=(.+)$/m)
    if (match) return match[1].trim().replace(/^['"]|['"]$/g, '')
  } catch {}
  return process.env.DATABASE_URL || ''
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const dbUrl = getDbUrl()

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(dbUrl && !dbUrl.startsWith('file:') ? { datasources: { db: { url: dbUrl } } } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
