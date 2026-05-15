import 'dotenv/config'
import admin from 'firebase-admin'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function initFirebaseAdmin() {
  const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']
  const missing = required.filter((k) => !process.env[k])
  if (missing.length) {
    console.error('Missing Firebase env vars:', missing.join(', '))
    console.error('Set these in .env and ensure SKIP_FIREBASE_AUTH is not true to run this script.')
    process.exit(1)
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    })
  }
}

const demoPassword = process.env.DEMO_PASSWORD || 'Demo@1234'

const demoUsers = [
  { name: 'Arjun Sharma', email: 'employee@telos.demo', role: 'EMPLOYEE' },
  { name: 'Sana Patel', email: 'employee2@telos.demo', role: 'EMPLOYEE' },
  { name: 'Maya Iyer', email: 'employee3@telos.demo', role: 'EMPLOYEE' },

  { name: 'Priya Menon', email: 'manager@telos.demo', role: 'MANAGER' },
  { name: 'Rakesh Kumar', email: 'manager2@telos.demo', role: 'MANAGER' },
  { name: 'Neha Singh', email: 'manager3@telos.demo', role: 'MANAGER' },

  { name: 'Rahul Gupta', email: 'admin@telos.demo', role: 'ADMIN' },
  { name: 'Amit Verma', email: 'admin2@telos.demo', role: 'ADMIN' },
  { name: 'Sunita Rao', email: 'admin3@telos.demo', role: 'ADMIN' },
]

async function ensureFirebaseUser(u) {
  try {
    const user = await admin.auth().getUserByEmail(u.email)
    return user
  } catch (err) {
    // create
    return admin.auth().createUser({
      email: u.email,
      emailVerified: true,
      password: demoPassword,
      displayName: u.name,
    })
  }
}

async function main() {
  await initFirebaseAdmin()

  const created = []
  for (const u of demoUsers) {
    const fbUser = await ensureFirebaseUser(u)

    const pu = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        firebaseUid: fbUser.uid,
        name: u.name,
        role: u.role,
        isActive: true,
      },
      create: {
        firebaseUid: fbUser.uid,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: true,
      },
    })

    created.push({ prisma: pu, firebaseUid: fbUser.uid, email: u.email, role: u.role })
    console.log(`Created/updated user: ${u.email} (${u.role})`)
  }

  // Assign reporting relationships: Managers report to first admin; employees report to first manager
  const admins = created.filter((c) => c.role === 'ADMIN')
  const managers = created.filter((c) => c.role === 'MANAGER')
  const employees = created.filter((c) => c.role === 'EMPLOYEE')

  if (admins.length && managers.length) {
    const primaryAdminId = admins[0].prisma.id
    for (const m of managers) {
      await prisma.user.update({ where: { id: m.prisma.id }, data: { reportingManagerId: primaryAdminId } })
    }
  }

  if (managers.length && employees.length) {
    const primaryManagerId = managers[0].prisma.id
    for (const e of employees) {
      await prisma.user.update({ where: { id: e.prisma.id }, data: { reportingManagerId: primaryManagerId } })
    }
  }

  console.log('Seed users complete.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
