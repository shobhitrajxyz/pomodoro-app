function isIsoDate(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && !Number.isNaN(Date.parse(value))
}

export function validateSessionPayload(payload) {
  const { type, duration, startedAt, completedAt, deviceId } = payload ?? {}
  const errors = []

  if (deviceId !== undefined && (typeof deviceId !== 'string' || !deviceId.trim())) {
    errors.push('deviceId must be a non-empty string')
  }
  if (type !== 'focus') errors.push('type must be focus')
  if (!Number.isInteger(duration) || duration < 1 || duration > 120) {
    errors.push('duration must be an integer between 1 and 120')
  }
  if (!isIsoDate(startedAt)) errors.push('startedAt must be an ISO date string')
  if (!isIsoDate(completedAt)) errors.push('completedAt must be an ISO date string')
  if (isIsoDate(startedAt) && isIsoDate(completedAt) && Date.parse(completedAt) < Date.parse(startedAt)) {
    errors.push('completedAt must be on or after startedAt')
  }
  if (isIsoDate(completedAt) && Date.parse(completedAt) > Date.now() + 60000) {
    errors.push('completedAt cannot be in the future')
  }

  return errors
}