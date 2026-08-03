export const peso = (n, dp = 2) =>
  '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: dp, maximumFractionDigits: dp })

export const num = (n, dp = 2) =>
  Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: dp, maximumFractionDigits: dp })

export const pct = (n, dp = 1) => `${(Number(n || 0) * 100).toFixed(dp)}%`

export const compact = (n) => {
  const v = Number(n || 0)
  if (Math.abs(v) >= 1_000_000) return '₱' + (v / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(v) >= 1_000) return '₱' + (v / 1_000).toFixed(1) + 'K'
  return peso(v, 0)
}

export const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const fmtDateTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export const addDays = (d, days) => {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

export const daysUntil = (d) => Math.ceil((new Date(d) - Date.now()) / 86400000)

export const isoDate = (d) => new Date(d).toISOString().slice(0, 10)

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now())
