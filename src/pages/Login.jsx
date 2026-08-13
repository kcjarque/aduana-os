import { useState } from 'react'
import { useAuth, DEMO_USERS } from '../lib/auth'
import { Icon } from '../components/ui'

export default function Login() {
  const { login } = useAuth()
  const [busy, setBusy] = useState(false)

  const enter = (u) => {
    setBusy(true)
    // tiny delay so the button press reads as an action
    setTimeout(() => login(u), 180)
  }

  return (
    <div className="min-h-screen flex items-stretch">
      {/* left — brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] sidebar-gradient text-slate-300 p-10">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="w-10 h-10 rounded-xl" />
          <div>
            <p className="font-display font-bold text-white text-lg leading-tight">AduanaOS</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">Quote → Clearance</p>
          </div>
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-white leading-tight">
            Quote-to-clearance,<br />the whole way through.
          </h1>
          <p className="mt-3 text-sm text-slate-400 max-w-sm">
            Duties &amp; taxes estimator, instant quotations, and shipment clearance tracking —
            built on H.R. Villa's own worksheets.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {['BOC D&T engine', 'Multi-item entries', '70/30 billing', 'Clearance board'].map((t) => (
              <span key={t} className="text-[11px] font-medium text-slate-300 bg-white/10 border border-white/10 rounded-full px-3 py-1">{t}</span>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-slate-500">H.R. Villa Customs Brokerage · demo workspace</p>
      </div>

      {/* right — login card */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-100">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <img src="/favicon.svg" alt="" className="w-10 h-10 rounded-xl" />
            <div>
              <p className="font-display font-bold text-navy-900 text-lg leading-tight">AduanaOS</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Quote → Clearance</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl card-shadow-lg border border-slate-200 p-7">
            <h2 className="font-display text-xl font-bold text-slate-900">Sign in</h2>
            <p className="text-sm text-slate-500 mt-1">Demo workspace — one tap to enter.</p>

            <button
              onClick={() => enter(DEMO_USERS[0])}
              disabled={busy}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-white font-semibold py-3 transition-colors"
            >
              <Icon name="lock" size={16} />
              Enter demo workspace
            </button>

            <div className="flex items-center gap-3 my-5">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] uppercase tracking-wide text-slate-400">or sign in as</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.name}
                  onClick={() => enter(u)}
                  disabled={busy}
                  className="w-full flex items-center gap-3 rounded-xl border border-slate-200 hover:border-navy-600 hover:bg-navy-50 disabled:opacity-60 p-3 text-left transition-colors"
                >
                  <span className="w-9 h-9 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs font-bold shrink-0">{u.initials}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 truncate">{u.name}</span>
                    <span className="block text-[11px] text-slate-400">{u.role}</span>
                  </span>
                  <Icon name="chev" size={15} className="ml-auto text-slate-300" />
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-4">
            No password required · keyless in-browser demo · data stays on this device.
          </p>
        </div>
      </div>
    </div>
  )
}
