const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function request(path, options) {
  const url = `${API_BASE_URL}/api${path}`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const errorDetails = Array.isArray(data.errors) && data.errors.length ? data.errors.join(', ') : null
    const message = errorDetails ? `${data.message || 'Validation failed'}: ${errorDetails}` : (data.message || 'The server could not complete the request.')
    throw new Error(message)
  }

  return data
}

export async function getSessions() {
  const data = await request('/sessions')
  return data.sessions
}

export async function createSession(session) {
  const data = await request('/sessions', {
    method: 'POST',
    body: JSON.stringify(session),
  })
  return data.session
}