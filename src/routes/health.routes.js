import { Router } from 'express'
import { sendSuccess } from '../utils/response.js'

const router = Router()

router.get('/', (req, res) => {
  return sendSuccess(res, { status: 'ok', time: new Date().toISOString() })
})

export default router
