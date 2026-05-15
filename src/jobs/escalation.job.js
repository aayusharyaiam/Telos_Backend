import cron from 'node-cron'
import { checkEscalations } from '../services/escalation.service.js'

cron.schedule('0 8 * * *', async () => {
  try {
    console.log('[Escalation Job] Running daily escalation check...')
    await checkEscalations()
  } catch (err) {
    console.error('[Escalation Job] Failed', err)
  }
})
