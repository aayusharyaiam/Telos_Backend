import { AppError, ValidationError } from '../utils/errors.js'

const PRISMA_USER_MESSAGES = {
  P2002: (err) => {
    const field = err.meta?.target?.[0] || 'field'
    return `A record with this ${field} already exists.`
  },
  P2025: () => 'The requested record was not found.',
  P2003: () => 'Operation failed because a related record is missing.',
  P2014: () => 'Cannot delete because other records depend on it.',
  P2000: () => 'The provided value is too long for the database column.',
}

function transformPrismaError(err) {
  const makeMessage = PRISMA_USER_MESSAGES[err.code]
  if (makeMessage) {
    return new ValidationError(makeMessage(err))
  }
  const userMessage = err.message?.replace(/^.*\n/, '')?.slice(0, 200) || 'Database operation failed.'
  return new AppError(userMessage, 400, 'DATABASE_ERROR')
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    data: null,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  })
}

export function errorHandler(err, req, res, next) {
  if (err.code && err.code.startsWith('P')) {
    err = transformPrismaError(err)
  }

  const statusCode = err.statusCode || 500
  const code = err.code || 'INTERNAL_ERROR'

  if (process.env.NODE_ENV !== 'production') {
    console.error(err)
  }

  res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code,
      message: err.message || 'Unexpected error',
      details: err.details || [],
    },
  })
}
