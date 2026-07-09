const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

export const request = async (path, options = {}) => {
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }

    throw new ApiError(response.status, payload.message || 'Request failed', payload.details)
  }

  return payload.data ?? payload
}
