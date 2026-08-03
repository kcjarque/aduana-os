import { useEffect } from 'react'

// ---------------- icons (inline, filled-operator style) ----------------
const paths = {
  home: 'M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 19.5v-9Z',
  calc: 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm1 3v3h10V5H7Zm0 6h3v2H7v-2Zm0 4h3v2H7v-2Zm5-4h3v2h-3v-2Zm0 4h3v6h-3v-6h0Zm5-4h3v2h-3v-2Z',
  file: 'M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V9h5.5L13 3.5ZM8 13h8v1.6H8V13Zm0 4h8v1.6H8V17Z',
  ship: 'M4 17.5 3 12l9-2 9 2-1 5.5H4ZM11 4h2v2h3l1 4-5-1.1L7 10l1-4h3V4ZM2 20c1.4 0 1.4 1 2.9 1 1.4 0 1.4-1 2.9-1s1.4 1 2.9 1 1.4-1 2.9-1 1.4 1 2.9 1 1.4-1 2.8-1c1.5 0 1.5 1 2.7 1v1.8c-1.2 0-1.2-1-2.7-1-1.4 0-1.4 1-2.8 1-1.5 0-1.5-1-2.9-1s-1.4 1-2.9 1-1.5-1-2.9-1-1.5 1-2.9 1-1.5-1-2.9-1V20Z',
  tags: 'M3 5a2 2 0 0 1 2-2h6l10 10-8 8L3 11V5Zm5 2.5A1.5 1.5 0 1 0 8 8.4a1.5 1.5 0 0 0 0-1Z',
  book: 'M5 3h13a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5 3Zm1 2v11.6c.2 0 .3-.1.5-.1H18V5H6Zm2 2h8v1.6H8V7Zm0 3h8v1.6H8V10Z',
  fx: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 4h2v1.2c1.6.2 2.8 1 3 2.6h-2c-.2-.7-.8-1-1.9-1-1.2 0-1.8.4-1.8 1.1 0 .6.5.9 2.1 1.3 2 .4 3.7 1 3.7 3 0 1.6-1.2 2.6-3.1 2.8V18h-2v-1.1c-1.8-.2-3-1.2-3.2-2.9h2c.2.9 1 1.3 2.2 1.3 1.3 0 1.9-.5 1.9-1.2 0-.8-.7-1-2.4-1.4-1.9-.4-3.4-1-3.4-2.9 0-1.5 1.2-2.5 2.9-2.7V6Z',
  users: 'M8.5 11a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm7 1a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM2 19.2C2 15.9 5 14 8.5 14s6.5 1.9 6.5 5.2V21H2v-1.8Zm15 .3v-1.3c0-1.3-.5-2.4-1.3-3.3.6-.1 1.2-.2 1.8-.2 2.7 0 5 1.5 5 3.9V20h-5.5v-.5Z',
  cog: 'M10.3 2h3.4l.5 2.6c.6.2 1.1.5 1.6.9l2.5-.9 1.7 3-2 1.7a7 7 0 0 1 0 1.8l2 1.7-1.7 3-2.5-.9c-.5.4-1 .7-1.6.9l-.5 2.6h-3.4l-.5-2.6a7 7 0 0 1-1.6-.9l-2.5.9-1.7-3 2-1.7a7 7 0 0 1 0-1.8l-2-1.7 1.7-3 2.5.9c.5-.4 1-.7 1.6-.9L10.3 2ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z',
  trash: 'M9 3h6l1 2h4v2H4V5h4l1-2ZM6 8h12l-1 13H7L6 8Zm4 2v9h1.5v-9H10Zm3 0v9h1.5v-9H13Z',
  print: 'M7 3h10v4H7V3ZM5 8h14a2 2 0 0 1 2 2v6h-4v5H7v-5H3v-6a2 2 0 0 1 2-2Zm4 8v3h6v-3H9Zm8-5.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  check: 'M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 12-12L20 5.6l-10.5 10.6Z',
  x: 'M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4L12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z',
  search: 'M10 2a8 8 0 1 0 4.9 14.3l5 5 1.4-1.4-5-5A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z',
  chev: 'M9 5.4 10.4 4l8 8-8 8L9 18.6 15.6 12 9 5.4Z',
  arrow: 'M13 4l6.5 6.5L13 17l-1.4-1.4 4.1-4.1H4v-2h11.7l-4.1-4.1L13 4Z',
  sign: 'M3 17.3c2.3.3 3.4-1.5 4.2-4 .5 1.9 1.3 3 3 3 2.2 0 3-2.4 3.6-4.7.3 2.7 1 4.7 3.7 4.7H21v2h-3.5c-2.2 0-3.5-1-4.2-2.6-.7 1.7-1.8 2.6-3.2 2.6-1.5 0-2.5-.8-3.2-2-1 1.7-2.4 2.6-3.9 2.4v-2.4ZM14.1 4.9l5 5L17.7 11.3l-5-5L14.1 4.9Z',
  lock: 'M12 2a5 5 0 0 1 5 5v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5Zm3 8V7a3 3 0 1 0-6 0v3h6Z',
  alert: 'M12 2 1 21h22L12 2Zm-1 7h2v6h-2V9Zm0 8h2v2h-2v-2Z',
  copy: 'M8 2h11a1 1 0 0 1 1 1v13h-2V4H8V2ZM5 6h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm1 2v12h9V8H6Z',
  layers: 'M12 2 22 7.5 12 13 2 7.5 12 2Zm0 13.3 8.4-4.6 1.6.9L12 17.9 2 11.6l1.6-.9L12 15.3Zm0 4.4 8.4-4.6 1.6.9L12 22.3 2 16l1.6-.9L12 19.7Z',
}

export const Icon = ({ name, size = 18, className = '' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" aria-hidden="true">
    <path d={paths[name] || paths.file} fillRule="evenodd" />
  </svg>
)

// ---------------- primitives ----------------
export const Card = ({ className = '', children }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/80 card-shadow ${className}`}>{children}</div>
)

export const CardHead = ({ title, sub, right }) => (
  <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
    <div>
      <h3 className="font-display font-semibold text-[15px] text-slate-900">{title}</h3>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
    {right}
  </div>
)

export const Button = ({ children, tone = 'primary', size = 'md', className = '', icon, ...props }) => {
  const tones = {
    primary: 'bg-navy-800 hover:bg-navy-700 text-white',
    gold: 'bg-gold-500 hover:bg-gold-400 text-navy-950',
    ghost: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300',
    danger: 'bg-white hover:bg-red-50 text-red-600 border border-red-200',
    soft: 'bg-navy-50 hover:bg-navy-100 text-navy-800',
  }
  const sizes = { md: 'px-4 py-2 text-sm', sm: 'px-3 py-1.5 text-xs', lg: 'px-5 py-2.5 text-sm' }
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-xl font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none ${tones[tone]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  )
}

export const Field = ({ label, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
  </label>
)

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600/30 focus:border-navy-600'

export const Input = (props) => <input className={`${inputCls} ${props.className || ''}`} {...props} />

export const NumInput = ({ value, onChange, className = '', ...props }) => (
  <input
    type="number"
    className={`${inputCls} tnum text-right ${className}`}
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
    {...props}
  />
)

export const Select = ({ children, className = '', ...props }) => (
  <select className={`${inputCls} ${className}`} {...props}>{children}</select>
)

export const Toggle = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="inline-flex items-center gap-2 text-sm text-slate-700"
  >
    <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${checked ? 'bg-navy-700' : 'bg-slate-300'}`}>
      <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </span>
    {label}
  </button>
)

export const Badge = ({ tone = 'slate', children, className = '' }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-navy-50 text-navy-700',
    gold: 'bg-gold-100 text-gold-600',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    navy: 'bg-navy-800 text-white',
  }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]} ${className}`}>{children}</span>
}

export const QuoteStatusBadge = ({ status }) => {
  const map = {
    draft: ['slate', 'Draft'], sent: ['blue', 'Sent'], approved: ['gold', 'Approved · signed'],
    booked: ['green', 'Booked'], lost: ['red', 'Lost'],
  }
  const [tone, label] = map[status] || ['slate', status]
  return <Badge tone={tone}>{label}</Badge>
}

export const LaneBadge = ({ lane }) => {
  if (!lane) return <Badge tone="slate">No lane yet</Badge>
  const map = { green: ['green', 'GREEN lane'], yellow: ['amber', 'YELLOW lane'], red: ['red', 'RED lane'] }
  const [tone, label] = map[lane]
  return <Badge tone={tone}>{label}</Badge>
}

// Net income vs the client's "PROFIT RANGE: 30K-50K" guidance
export const IncomeChip = ({ net, floor = 30000, target = 50000 }) => {
  const tone = net >= target ? 'green' : net >= floor ? 'amber' : 'red'
  return <Badge tone={tone}>₱{Math.round(net / 1000)}K net</Badge>
}

export const StatTile = ({ label, value, sub, accent = 'navy' }) => {
  const accents = {
    navy: 'border-t-navy-700', gold: 'border-t-gold-500', green: 'border-t-emerald-500', red: 'border-t-red-500',
  }
  return (
    <Card className={`p-4 border-t-4 ${accents[accent]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="tnum text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </Card>
  )
}

export function Modal({ open, onClose, title, wide, children, footer }) {
  useEffect(() => {
    const fn = (e) => e.key === 'Escape' && onClose?.()
    if (open) window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl card-shadow-lg w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-display font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icon name="x" /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export const PageHeader = ({ title, sub, right }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
    <div>
      <h1 className="font-display text-xl font-bold text-slate-900">{title}</h1>
      {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
    </div>
    <div className="flex items-center gap-2">{right}</div>
  </div>
)

export const SearchInput = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <input
      className={`${inputCls} pl-9 w-64`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Search…'}
    />
  </div>
)

export const EmptyState = ({ icon = 'file', title, sub, action }) => (
  <div className="flex flex-col items-center justify-center py-14 text-center">
    <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center mb-3">
      <Icon name={icon} size={22} />
    </div>
    <p className="font-semibold text-slate-700">{title}</p>
    {sub && <p className="text-sm text-slate-500 mt-1 max-w-sm">{sub}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)

export const Toasts = ({ toasts }) => (
  <div className="fixed bottom-5 right-5 z-[60] space-y-2">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`px-4 py-2.5 rounded-xl text-sm font-medium card-shadow-lg text-white ${t.tone === 'err' ? 'bg-red-600' : 'bg-navy-800'}`}
      >
        {t.msg}
      </div>
    ))}
  </div>
)
