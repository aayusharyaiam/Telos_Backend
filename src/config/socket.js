import { Server } from 'socket.io'
import firebaseAdmin from '../config/firebase.js'
import prisma from './prisma.js'

let io = null

export function initializeSocket(server) {
  if (io) return io

  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:5173', 'https://telos-frontend.vercel.app'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token

      if (!token) {
        return next(new Error('Authentication required'))
      }

      // Verify Firebase token
      let decodedToken
      try {
        decodedToken = await firebaseAdmin.auth().verifyIdToken(token)
      } catch (authError) {
        console.error('Socket auth error:', authError.message)
        return next(new Error('Invalid token'))
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { firebaseUid: decodedToken.uid },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      })

      if (!user) {
        return next(new Error('User not found'))
      }

      if (!user.isActive) {
        return next(new Error('User account is disabled'))
      }

      // Attach user to socket
      socket.user = user
      next()
    } catch (error) {
      console.error('Socket authentication error:', error)
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.user
    console.log(`🔌 User connected: ${user.name} (${user.id})`)

    // Join user-specific room
    socket.join(`user:${user.id}`)

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`🔌 User disconnected: ${user.name} (${reason})`)
      socket.leave(`user:${user.id}`)
    })

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${user.id}:`, error)
    })
  })

  console.log('✅ Socket.IO server initialized')
  return io
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.')
  }
  return io
}

export function emitNotification(userId, notification) {
  if (!io) {
    console.warn('⚠️ Socket.IO not initialized, notification not emitted')
    return
  }

  const room = `user:${userId}`
  io.to(room).emit('notification:new', notification)
  console.log(`📢 Notification emitted to user:${userId}`)
}