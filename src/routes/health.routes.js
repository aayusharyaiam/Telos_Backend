import { Router } from 'express'
import prisma from '../config/prisma.js'
import { sendSuccess } from '../utils/response.js'

const startTime = Date.now()

const router = Router()

router.get('/', async (req, res) => {
  let databaseStatus = 'disconnected'
  let version = 'unknown'

  try {
    await prisma.$queryRaw`SELECT 1`
    databaseStatus = 'connected'
  } catch (error) {
    databaseStatus = 'error'
  }

  try {
    const pkg = await import('../package.json', { assert: { type: 'json' } })
    version = pkg.default.version || '1.0.0'
  } catch {
    version = '1.0.0'
  }

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000)
  const uptimeFormatted = uptimeSeconds < 60
    ? `${uptimeSeconds}s`
    : uptimeSeconds < 3600
      ? `${Math.floor(uptimeSeconds / 60)}m`
      : `${Math.floor(uptimeSeconds / 3600)}h`

  return sendSuccess(res, {
    status: databaseStatus === 'connected' ? 'ok' : 'degraded',
    uptime: uptimeFormatted,
    database: databaseStatus,
    timestamp: new Date().toISOString(),
    version,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
  })
})

export default router