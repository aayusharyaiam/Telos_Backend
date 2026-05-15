import { AppError } from '../utils/errors.js'

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    data: null,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  })
}

export function errorHandler(err, req, res, next) {
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
