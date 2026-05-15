import admin from 'firebase-admin'

const requiredEnv = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']

const missing = requiredEnv.filter((k) => !process.env[k])
if (missing.length) {
  console.warn(`Firebase not fully configured; missing env: ${missing.join(', ')}`)
  if (process.env.SKIP_FIREBASE_AUTH === 'true') {
    console.warn('SKIP_FIREBASE_AUTH=true — using stubbed Firebase auth for development')
    const stub = {
      auth: () => ({
        verifyIdToken: async () => ({
          uid: process.env.DEV_FIREBASE_UID || 'dev-uid',
          email: process.env.DEV_FIREBASE_EMAIL || 'dev@example.com',
          name: process.env.DEV_FIREBASE_NAME || 'Dev User',
        }),
      }),
    }
    export default stub
  } else {
    // In production we want to fail fast when Firebase is misconfigured
    throw new Error(`Missing required Firebase env vars: ${missing.join(', ')}`)
  }
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

export default admin
