import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || '')

export async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    throw new Error('Resend is not configured')
  }

  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to,
    subject,
    html,
  })
}
