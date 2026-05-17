import axios from 'axios'

const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL
const ENABLE_TEAMS_NOTIFICATIONS = process.env.ENABLE_TEAMS_NOTIFICATIONS === 'true'
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://telos-frontend.vercel.app'

const TIMEOUT_MS = 10000

const THEME_COLOR = '3525cd'

async function sendTeamsNotification({ title, summary, facts, deepLink, color }) {
  if (!ENABLE_TEAMS_NOTIFICATIONS) {
    return { success: false, reason: 'Teams notifications disabled' }
  }

  if (!TEAMS_WEBHOOK_URL) {
    console.warn('[Teams] Webhook URL not configured')
    return { success: false, reason: 'Webhook URL not configured' }
  }

  const payload = {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    themeColor: color || THEME_COLOR,
    summary: summary || title,
    sections: [
      {
        activityTitle: title,
        facts: facts || [],
        markdown: true,
      },
    ],
  }

  if (deepLink) {
    payload.potentialAction = [
      {
        '@type': 'OpenUri',
        name: 'Open in Telos AtomQuest',
        targets: [
          {
            os: 'default',
            uri: deepLink,
          },
        ],
      },
    ]
  }

  try {
    const response = await axios.post(TEAMS_WEBHOOK_URL, payload, {
      timeout: TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log(`[Teams] Notification sent: ${title}`)
    return { success: true }
  } catch (error) {
    console.error(`[Teams] Failed to send notification: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function notifyGoalSheetSubmitted({ employeeName, cycleName, submittedAt, sheetId }) {
  return sendTeamsNotification({
    title: `📝 Goal Sheet Submitted`,
    summary: `${employeeName} submitted their goal sheet`,
    facts: [
      { name: 'Employee', value: employeeName },
      { name: 'Cycle', value: cycleName },
      { name: 'Submitted', value: new Date(submittedAt).toLocaleString() },
      { name: 'Status', value: 'Submitted' },
    ],
    deepLink: `${APP_BASE_URL}/manager/approve/${sheetId}`,
    color: 'f59e0b',
  })
}

async function notifyGoalSheetApproved({ employeeName, managerName, approvedAt, sheetId }) {
  return sendTeamsNotification({
    title: `✅ Goal Sheet Approved`,
    summary: `${employeeName}'s goal sheet was approved`,
    facts: [
      { name: 'Employee', value: employeeName },
      { name: 'Manager', value: managerName },
      { name: 'Approved', value: new Date(approvedAt).toLocaleString() },
      { name: 'Status', value: 'Approved' },
    ],
    deepLink: `${APP_BASE_URL}/goals/sheet/${sheetId}`,
    color: '10b981',
  })
}

async function notifyEscalationTriggered({ ruleName, employeeName, phase, triggerDays }) {
  return sendTeamsNotification({
    title: `⚠️ Escalation Triggered`,
    summary: `Escalation triggered for ${employeeName}`,
    facts: [
      { name: 'Escalation Rule', value: ruleName },
      { name: 'Employee', value: employeeName },
      { name: 'Phase', value: phase },
      { name: 'Trigger Days', value: triggerDays },
      { name: 'Status', value: 'Escalated' },
    ],
    deepLink: `${APP_BASE_URL}/admin/escalations`,
    color: 'ef4444',
  })
}

export {
  sendTeamsNotification,
  notifyGoalSheetSubmitted,
  notifyGoalSheetApproved,
  notifyEscalationTriggered,
}