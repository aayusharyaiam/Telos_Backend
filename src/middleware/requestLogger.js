import morgan from 'morgan'

const logFormat = ':method :url :status :res[content-length] - :response-time ms'

const stream = {
  write: (message) => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${message.trim()}`)
  },
}

const skip = () => {
  const env = process.env.NODE_ENV || 'development'
  return env !== 'development' && env !== 'production'
}

export const requestLogger = morgan(logFormat, {
  stream,
  skip,
})