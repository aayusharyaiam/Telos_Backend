import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'

import healthRouter from './routes/health.routes.js'
import authRouter from './routes/auth.routes.js'
import goalsRouter from './routes/goals.routes.js'
import goalSheetsRouter from './routes/goalSheets.routes.js'
import checkinsRouter from './routes/checkins.routes.js'
import usersRouter from './routes/users.routes.js'
import cyclesRouter from './routes/cycles.routes.js'
import notificationsRouter from './routes/notifications.routes.js'
import reportsRouter from './routes/reports.routes.js'
import sharedGoalsRouter from './routes/sharedGoals.routes.js'
import adminRouter from './routes/admin.routes.js'
import { requestLogger } from './middleware/requestLogger.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(helmet())
app.use(requestLogger)

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://telos-frontend.vercel.app',
]

function normalizeOrigin(value) {
  if (!value) return null

  const trimmed = value.trim()
  const markdownLink = trimmed.match(/\]\((https?:\/\/[^)]+)\)$/)
  const candidate = (markdownLink?.[1] || trimmed).replace(/^\[|\]$/g, '')

  if (candidate === '*') return '*'

  try {
    return new URL(candidate).origin
  } catch {
    console.warn(`Ignoring invalid CORS origin: ${trimmed}`)
    return null
  }
}

const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGINS,
  process.env.CLIENT_URL,
]
  .filter(Boolean)
  .flatMap((value) => value.split(','))

const allowedOrigins = [
  ...new Set([...defaultAllowedOrigins, ...configuredOrigins].map(normalizeOrigin).filter(Boolean)),
]

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*')) {
      callback(null, true)
      return
    }

    const normalized = normalizeOrigin(origin)
    if (allowedOrigins.includes(normalized)) {
      callback(null, true)
    } else {
      console.warn(`CORS blocked origin: ${origin}`)
      callback(null, false)
    }
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health',
  })
)

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

app.use('/health', healthRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/goals', goalsRouter)
app.use('/api/v1/goal-sheets', goalSheetsRouter)
app.use('/api/v1/checkins', checkinsRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/cycles', cyclesRouter)
app.use('/api/v1/notifications', notificationsRouter)
app.use('/api/v1/reports', reportsRouter)
app.use('/api/v1/shared-goals', sharedGoalsRouter)
app.use('/api/v1/admin', adminRouter)

app.use(notFoundHandler)
app.use(errorHandler)

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Telos API running on port ${port}`)
  console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`)
})

if (process.env.ENABLE_ESCALATION_JOB === 'true') {
  import('./jobs/escalation.job.js')
}