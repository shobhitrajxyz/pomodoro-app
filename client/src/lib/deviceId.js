const DEVICE_ID_KEY = 'pomodoro.device-id'

export function getDeviceId() {
  if (typeof window === 'undefined') return 'server_generated'
  try {
    let id = window.localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      const randomPart = Math.random().toString(36).substring(2, 10)
      id = `dev_${Date.now().toString(36)}_${randomPart}`
      window.localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return 'fallback_device_id'
  }
}
