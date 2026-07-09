import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { navigateTo } from '../utils/navigation'
import AuthContext from './authContextObject'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.me()
      setUser(currentUser)
      return currentUser
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadCurrentUser = async () => {
      try {
        const currentUser = await authApi.me()
        if (active) setUser(currentUser)
      } catch {
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadCurrentUser()

    const handleExpired = () => {
      setUser(null)
      navigateTo('/login')
    }
    window.addEventListener('auth:expired', handleExpired)
    return () => {
      active = false
      window.removeEventListener('auth:expired', handleExpired)
    }
  }, [refreshUser])

  const login = async (email, password) => {
    const loggedInUser = await authApi.login(email, password)
    setUser(loggedInUser)
    return loggedInUser
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
    navigateTo('/login')
  }

  const value = useMemo(() => ({ user, loading, login, logout, refreshUser }), [user, loading, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

