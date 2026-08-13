import { createContext, useContext, useMemo, useState } from 'react'

const KEY = 'aduana-auth'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return null
}

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(load)

  const api = useMemo(() => ({
    user,
    login: (u) => {
      const rec = { ...u, at: new Date().toISOString() }
      localStorage.setItem(KEY, JSON.stringify(rec))
      setUser(rec)
    },
    logout: () => {
      localStorage.removeItem(KEY)
      setUser(null)
    },
  }), [user])

  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)

// demo accounts — one-tap, no password (keyless in-browser demo)
export const DEMO_USERS = [
  { name: 'Marc Castro, LCB', role: 'Licensed Customs Broker', initials: 'MC' },
  { name: 'Joan dela Cruz', role: 'Entry Encoder / Ops', initials: 'JC' },
  { name: 'Ana Reyes', role: 'Sales / Client Relations', initials: 'AR' },
]
