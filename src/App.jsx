import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { useDb } from './lib/store'
import { useAuth } from './lib/auth'
import { Icon, Toasts } from './components/ui'
import { FxChip } from './components/dt'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Estimator from './pages/Estimator'
import Quotes from './pages/Quotes'
import QuoteEditor from './pages/QuoteEditor'
import QuotePrint from './pages/QuotePrint'
import Shipments from './pages/Shipments'
import ShipmentDetail from './pages/ShipmentDetail'
import Consolidation from './pages/Consolidation'
import RateCards from './pages/RateCards'
import Tariff from './pages/Tariff'
import FxRates from './pages/FxRates'
import Clients from './pages/Clients'
import Settings from './pages/Settings'

const NAV = [
  { to: '/', icon: 'home', label: 'Dashboard' },
  { to: '/estimator', icon: 'calc', label: 'D&T Estimator' },
  { to: '/quotes', icon: 'file', label: 'Quotations' },
  { to: '/shipments', icon: 'ship', label: 'Shipments' },
  { to: '/consolidation', icon: 'layers', label: 'Consolidation' },
  { to: '/rates', icon: 'tags', label: 'Rate Cards' },
  { to: '/tariff', icon: 'book', label: 'Tariff Library' },
  { to: '/fx', icon: 'fx', label: 'FX Rates' },
  { to: '/clients', icon: 'users', label: 'Clients' },
  { to: '/settings', icon: 'cog', label: 'Settings' },
]

function Shell({ children }) {
  const { db, toasts } = useDb()
  const { user, logout } = useAuth()
  return (
    <div className="min-h-full flex">
      <aside className="w-60 shrink-0 sidebar-gradient text-slate-300 flex flex-col fixed inset-y-0 z-40">
        <div className="px-5 pt-6 pb-5 flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="w-9 h-9 rounded-xl" />
          <div>
            <p className="font-display font-bold text-white leading-tight">AduanaOS</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">Quote → Clearance</p>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors relative ${
                  isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gold-500" />}
                  <Icon name={n.icon} size={17} className={isActive ? 'text-gold-400' : 'text-slate-400'} />
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {db.settings.company.name}<br />
            <span className="text-slate-500">{db.settings.company.ccb.split('·')[0]}</span>
          </p>
        </div>
      </aside>

      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <header className="h-14 bg-white/85 backdrop-blur border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <FxChip />
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-100 rounded-full px-2.5 py-1">Demo workspace</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs font-bold">{user?.initials || 'RS'}</div>
              <div className="leading-tight hidden sm:block">
                <p className="text-xs font-semibold text-slate-800">{user?.name || db.settings.company.rep}</p>
                <p className="text-[10px] text-slate-400">{user?.role || 'Licensed Customs Broker'}</p>
              </div>
            </div>
            <button onClick={logout} title="Sign out" className="ml-1 text-slate-400 hover:text-red-500 flex items-center gap-1 text-xs font-medium">
              <Icon name="lock" size={15} /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>
        <main className="flex-1 px-6 py-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
      <Toasts toasts={toasts} />
    </div>
  )
}

export default function App() {
  const { user } = useAuth()
  if (!user) return <Login />
  return (
    <BrowserRouter>
      <Routed />
    </BrowserRouter>
  )
}

function Routed() {
  const loc = useLocation()
  if (loc.pathname.startsWith('/print/')) {
    return (
      <Routes>
        <Route path="/print/quote/:id" element={<QuotePrint />} />
      </Routes>
    )
  }
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/estimator" element={<Estimator />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/quotes/:id" element={<QuoteEditor />} />
        <Route path="/shipments" element={<Shipments />} />
        <Route path="/shipments/:id" element={<ShipmentDetail />} />
        <Route path="/consolidation" element={<Consolidation />} />
        <Route path="/rates" element={<RateCards />} />
        <Route path="/tariff" element={<Tariff />} />
        <Route path="/fx" element={<FxRates />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}
