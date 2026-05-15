import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

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
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  })
)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

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
})

if (process.env.ENABLE_ESCALATION_JOB === 'true') {
  import('./jobs/escalation.job.js')
}
