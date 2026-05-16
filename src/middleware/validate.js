import { ValidationError } from '../utils/errors.js'

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    })

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      const path = firstIssue?.path?.join('.') || ''
      const reason = firstIssue?.message || 'Invalid input'
      const message = path ? `${path}: ${reason}` : reason
      return next(new ValidationError(message, result.error.issues))
    }

    req.validated = result.data
    next()
  }
}
