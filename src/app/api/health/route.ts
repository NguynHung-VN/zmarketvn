import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, string> = {}

  // Check DATABASE_URL
  checks.database_url = process.env.DATABASE_URL ? 'SET' : 'MISSING'

  // Check JWT_SECRET
  checks.jwt_secret = process.env.JWT_SECRET ? 'SET' : 'MISSING (using default)'

  // Check DB connection
  try {
    await db.$queryRaw`SELECT 1`
    checks.db_connection = 'OK'
  } catch (e) {
    checks.db_connection = `FAIL: ${e instanceof Error ? e.message : String(e)}`
  }

  // Check User table
  try {
    const count = await db.user.count()
    checks.user_table = `OK (${count} users)`
  } catch (e) {
    checks.user_table = `FAIL: ${e instanceof Error ? e.message : String(e)}`
  }

  const allOk = Object.values(checks).every(v => v === 'OK' || v.startsWith('OK') || v === 'SET')

  return NextResponse.json({
    status: allOk ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  }, { status: allOk ? 200 : 503 })
}
