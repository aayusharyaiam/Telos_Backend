import { ForbiddenError, UnauthorizedError } from '../utils/errors.js'

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('User not found'))
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Access denied'))
    }

    next()
  }
}
