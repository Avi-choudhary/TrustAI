import { createContext, useContext, useState, useCallback } from 'react'

const KEY = 'trustai_session_v1'

const AuthContext = createContext(null)

function readSession() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession)

  const login = useCallback((profile, accessToken) => {
    const username = profile?.email
      ? profile.email.split('@')[0]
      : 'analyst'

    const session = {
      name: profile?.name || username,
      username,
      email: profile?.email,
      plan: profile?.plan || 'FREE',
      accessToken,
    }

    try {
      localStorage.setItem(KEY, JSON.stringify(session))
    } catch {
      // localStorage unavailable
    }

    setUser(session)

    return session
  }, [])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // noop
    }

    setUser(null)
  }, [])

  const upgradePlan = useCallback((plan) => {
    setUser((current) => {
      if (!current) return current

      const next = {
        ...current,
        plan,
      }

      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // noop
      }

      return next
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        upgradePlan,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error(
      'useAuth must be used inside an AuthProvider'
    )
  }

  return ctx
}