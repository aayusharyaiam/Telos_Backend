import admin from '../config/firebase.js'
import prisma from '../config/prisma.js'

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'No token provided' },
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.firebaseUser = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || decoded.email?.split('@')[0] || 'User',
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    })

    if (user && !user.isActive) {
      return res.status(401).json({
        success: false,
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'User is deactivated' },
      })
    }

    req.user = user || null
    next()
  } catch (err) {
    return res.status(401).json({
      success: false,
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
    })
  }
}
