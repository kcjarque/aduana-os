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
  { name: 'Rowena D. Santos, LCB', role: 'Licensed Customs Broker', initials: 'RS' },
  { name: 'Marco Encoder', role: 'Entry Encoder / Ops', initials: 'ME' },
  { name: 'Ana Reyes', role: 'Sales / Client Relations', initials: 'AR' },
]
