import { Resend } from 'resend'

let resend = null
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
}

/**
 * Send an email via Resend. Gracefully skips if not configured.
 * @param {{ to: string, subject: string, html: string }} opts
 */
export async function sendEmail({ to, subject, html }) {
  if (!resend || !process.env.RESEND_FROM_EMAIL) {
    console.log(`[Email] Skipped (Resend not configured): to=${to} subject="${subject}"`)
    return null
  }

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to,
      subject,
      html,
    })
    console.log(`[Email] Sent to ${to}: "${subject}"`)
    return result
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err.message)
    return null
  }
}

/**
 * Send a notification email for common Telos events.
 * @param {{ to: string, eventType: string, data: object }} opts
 */
export async function sendNotificationEmail({ to, eventType, data = {} }) {
  const templates = {
    GOAL_SHEET_SUBMITTED: {
      subject: 'Telos: Goal sheet submitted for review',
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <h2 style="color:#4F46E5">Goal Sheet Submitted</h2>
        <p>${data.employeeName || 'An employee'} has submitted their goal sheet for review.</p>
        <a href="${data.link || '#'}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4F46E5;color:white;text-decoration:none;border-radius:8px">Review Now</a>
        <p style="margin-top:24px;color:#6b7280;font-size:12px">— Telos Goal Portal</p>
      </div>`,
    },
    GOAL_SHEET_APPROVED: {
      subject: 'Telos: Your goal sheet has been approved',
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <h2 style="color:#10B981">Goal Sheet Approved ✓</h2>
        <p>Your goal sheet has been approved. Goals are now locked.</p>
        <a href="${data.link || '#'}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10B981;color:white;text-decoration:none;border-radius:8px">View Goals</a>
        <p style="margin-top:24px;color:#6b7280;font-size:12px">— Telos Goal Portal</p>
      </div>`,
    },
    GOAL_SHEET_RETURNED: {
      subject: 'Telos: Your goal sheet was returned',
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <h2 style="color:#EF4444">Goal Sheet Returned</h2>
        <p>Your goal sheet was returned with the following reason:</p>
        <blockquote style="border-left:4px solid #EF4444;padding-left:12px;color:#374151">${data.reason || ''}</blockquote>
        <a href="${data.link || '#'}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4F46E5;color:white;text-decoration:none;border-radius:8px">Revise Now</a>
        <p style="margin-top:24px;color:#6b7280;font-size:12px">— Telos Goal Portal</p>
      </div>`,
    },
    SHARED_GOAL_PUSHED: {
      subject: `Telos: Shared goal "${data.goalTitle || ''}" added to your sheet`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <h2 style="color:#4F46E5">New Shared Goal</h2>
        <p>A shared goal "<strong>${data.goalTitle || ''}</strong>" has been added to your goal sheet.</p>
        <a href="${data.link || '#'}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4F46E5;color:white;text-decoration:none;border-radius:8px">View Goal Sheet</a>
        <p style="margin-top:24px;color:#6b7280;font-size:12px">— Telos Goal Portal</p>
      </div>`,
    },
    CHECKIN_WINDOW_OPENED: {
      subject: `Telos: ${data.quarter || 'Quarterly'} check-in window is open`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <h2 style="color:#4F46E5">Telos Check-in Window Open</h2>
        <p>${data.message || 'A quarterly check-in window is now open.'}</p>
        <a href="${data.link || '#'}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4F46E5;color:white;text-decoration:none;border-radius:8px">Open Telos</a>
        <p style="margin-top:24px;color:#6b7280;font-size:12px">Telos Goal Portal</p>
      </div>`,
    },
    ESCALATION: {
      subject: `Telos: Escalation — ${data.ruleName || 'Action required'}`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <h2 style="color:#F59E0B">⚠ Escalation Alert</h2>
        <p>${data.message || 'An escalation has been triggered.'}</p>
        <a href="${data.link || '#'}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#F59E0B;color:white;text-decoration:none;border-radius:8px">Open Telos</a>
        <p style="margin-top:24px;color:#6b7280;font-size:12px">— Telos Goal Portal</p>
      </div>`,
    },
  }

  const template = templates[eventType]
  if (!template) {
    console.log(`[Email] No template for event type: ${eventType}`)
    return null
  }

  return sendEmail({ to, subject: template.subject, html: template.html })
}
