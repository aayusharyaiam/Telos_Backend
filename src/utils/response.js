export function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data, error: null })
}

export function sendEmpty(res, status = 204) {
  return res.status(status).send()
}
