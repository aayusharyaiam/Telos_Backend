import admin from 'firebase-admin'

const requiredEnv = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']
const missing = requiredEnv.filter((key) => !process.env[key])

let firebaseAdmin = admin

if (missing.length && process.env.SKIP_FIREBASE_AUTH === 'true') {
  console.warn(`Firebase not fully configured; missing env: ${missing.join(', ')}`)
  console.warn('SKIP_FIREBASE_AUTH=true - using stubbed Firebase auth for development')

  firebaseAdmin = {
    auth: () => ({
      verifyIdToken: async () => ({
        uid: process.env.DEV_FIREBASE_UID || 'dev-uid',
        email: process.env.DEV_FIREBASE_EMAIL || 'dev@example.com',
        name: process.env.DEV_FIREBASE_NAME || 'Dev User',
      }),
    }),
  }
} else if (missing.length) {
  console.warn(`Firebase not fully configured; missing env: ${missing.join(', ')}`)
  throw new Error(`Missing required Firebase env vars: ${missing.join(', ')}`)
} else {
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

export default firebaseAdmin
