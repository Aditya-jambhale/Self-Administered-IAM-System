import { request } from './client'

export const login = async (email, password) => {
  const data = await request('/api/auth/login', { method: 'POST', body: { email, password } })
  return data.user
}

export const register = (payload) => request('/api/auth/register', { method: 'POST', body: payload })

export const logout = async () => {
  await request('/api/auth/logout', { method: 'POST' })
}

export const me = () => request('/api/auth/me')
