import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import makeSeed from './seed'

const KEY = 'aduana-db'
const SEED_VERSION = 6

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const db = JSON.parse(raw)
      if (db.version === SEED_VERSION) return db
    }
  } catch { /* fall through to reseed */ }
  const fresh = makeSeed()
  localStorage.setItem(KEY, JSON.stringify(fresh))
  return fresh
}

const DbCtx = createContext(null)

export function DbProvider({ children }) {
  const [db, setDb] = useState(load)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(db))
  }, [db])

  const api = useMemo(() => ({
    db,
    // update(draft => { mutate draft }) — draft is a deep clone, returned state replaces db
    update: (fn) => setDb((d) => { const c = structuredClone(d); fn(c); return c }),
    reset: () => { localStorage.removeItem(KEY); setDb(makeSeed()) },
    toast: (msg, tone = 'ok') => {
      const id = Math.random().toString(36).slice(2)
      setToasts((t) => [...t, { id, msg, tone }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
    },
    toasts,
  }), [db, toasts])

  return <DbCtx.Provider value={api}>{children}</DbCtx.Provider>
}

export const useDb = () => useContext(DbCtx)

// ---- shared selectors ----
export function currentFxWeek(db) {
  const today = new Date().toISOString().slice(0, 10)
  return db.fxWeeks.find((w) => w.start <= today && today <= w.end) || db.fxWeeks[0]
}

export const fxRateFor = (db, currency) => currentFxWeek(db)?.rates?.[currency] ?? 0

export const clientById = (db, id) => db.clients.find((c) => c.id === id)
export const quoteById = (db, id) => db.quotes.find((q) => q.id === id)
export const tariffByCode = (db, code) => db.tariffLines.find((t) => t.code === code)

export function nextNo(db, kind) {
  const n = db.counters[kind]
  return kind === 'quote' ? `AQ-2026-${String(n).padStart(4, '0')}` : `SH-2026-${String(n).padStart(4, '0')}`
}
