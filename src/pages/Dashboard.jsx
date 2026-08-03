import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import { useDb, clientById } from '../lib/store'
import { computeDT, quoteTotals } from '../lib/compute'
import { peso, compact, pct, fmtDate, daysUntil } from '../lib/format'
import { Card, CardHead, StatTile, QuoteStatusBadge, LaneBadge, Badge, Button, EmptyState } from '../components/ui'
import { STAGES } from '../lib/seed'

const LANE_COLORS = { green: '#10B981', yellow: '#F59E0B', red: '#EF4444', none: '#CBD5E1' }

export default function Dashboard() {
  const { db } = useDb()
  const s = db.settings

  const m = useMemo(() => {
    const totalsOf = (q) => {
      const dtByCol = Object.fromEntries(q.columns.map((c) => [c, computeDT(q.dtInputs, c, s)]))
      return quoteTotals(q, dtByCol)
    }
    const open = db.quotes.filter((q) => ['draft', 'sent'].includes(q.status))
    const sent30 = db.quotes.filter((q) => q.sentAt && Date.now() - new Date(q.sentAt) < 30 * 864e5)
    const won30 = sent30.filter((q) => ['approved', 'booked'].includes(q.status))
    const active = db.shipments.filter((sh) => sh.stage !== 'delivered')

    // avg margin across quoted work
    const margins = db.quotes
      .filter((q) => q.status !== 'lost')
      .map((q) => { const t = totalsOf(q); const col = q.columns[0]; return t[col].marginPct })
    const avgMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0

    // turnaround created → sent (the 1–2 day pain point)
    const turns = db.quotes.filter((q) => q.sentAt).map((q) => (new Date(q.sentAt) - new Date(q.createdAt)) / 36e5)
    const avgTurn = turns.length ? turns.reduce((a, b) => a + b, 0) / turns.length : 0

    const dtProcessed = db.shipments.reduce((sum, sh) => {
      const q = db.quotes.find((x) => x.id === sh.quoteId)
      if (!q) return sum
      return sum + computeDT(q.dtInputs, sh.col, s).totalBoc
    }, 0)

    // weekly chart (8 weeks)
    const weeks = []
    for (let i = 7; i >= 0; i--) {
      const start = new Date(Date.now() - (i + 1) * 7 * 864e5)
      const end = new Date(Date.now() - i * 7 * 864e5)
      const inWeek = db.quotes.filter((q) => q.sentAt && new Date(q.sentAt) >= start && new Date(q.sentAt) < end)
      const wonW = inWeek.filter((q) => ['approved', 'booked'].includes(q.status))
      const mVals = inWeek.map((q) => { const t = totalsOf(q); return t[q.columns[0]].marginPct })
      weeks.push({
        wk: `${end.getMonth() + 1}/${end.getDate()}`,
        sent: inWeek.length,
        won: wonW.length,
        margin: mVals.length ? +(100 * mVals.reduce((a, b) => a + b, 0) / mVals.length).toFixed(1) : null,
      })
    }

    const laneMix = ['green', 'yellow', 'red'].map((l) => ({
      name: `${l[0].toUpperCase()}${l.slice(1)} lane`, lane: l,
      value: db.shipments.filter((sh) => sh.lane === l).length,
    })).filter((d) => d.value > 0)

    const expiring = db.rateCards
      .map((r) => ({ ...r, days: daysUntil(r.validTo) }))
      .filter((r) => r.days <= 14)
      .sort((a, b) => a.days - b.days)

    return { open, sent30, won30, active, avgMargin, avgTurn, dtProcessed, weeks, laneMix, expiring, totalsOf }
  }, [db, s])

  const recent = [...db.quotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6)

  return (
    <div className="space-y-5">
      {/* hero */}
      <div className="hero-gradient rounded-2xl px-6 py-5 text-white card-shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-slate-300">Quote-to-clearance command center</p>
          <h1 className="font-display text-2xl font-bold mt-1">
            {m.open.length} open quote{m.open.length === 1 ? '' : 's'} · {m.active.length} shipment{m.active.length === 1 ? '' : 's'} in clearance
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Avg quote turnaround <span className="tnum font-semibold text-gold-400">{m.avgTurn.toFixed(1)} hrs</span> — vs 1–2 days manual
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/estimator"><Button tone="gold" icon="calc">New D&T estimate</Button></Link>
          <Link to="/quotes"><Button tone="ghost" className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20">Quotations</Button></Link>
        </div>
      </div>

      {/* stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Win rate · 30 days" value={m.sent30.length ? pct(m.won30.length / m.sent30.length, 0) : '—'}
          sub={`${m.won30.length} of ${m.sent30.length} quotes won`} accent="navy" />
        <StatTile label="Avg margin per quote" value={pct(m.avgMargin)} sub="On service revenue, active & won quotes" accent="gold" />
        <StatTile label="D&T processed" value={compact(m.dtProcessed)} sub="Duties & taxes via SSDT, all shipments" accent="green" />
        <StatTile label="Rate cards expiring" value={m.expiring.length} sub="Within 14 days — renegotiate" accent={m.expiring.length ? 'red' : 'navy'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* quotes per week */}
        <Card className="lg:col-span-2">
          <CardHead title="Quotations per week" sub="Sent vs won — last 8 weeks" />
          <div className="px-4 pb-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.weeks} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="wk" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={24} />
                <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Bar dataKey="sent" name="Sent" fill="#133A70" radius={[4, 4, 0, 0]} />
                <Bar dataKey="won" name="Won" fill="#F5A623" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* lane mix */}
        <Card>
          <CardHead title="Selectivity lane mix" sub="All shipments on record" />
          <div className="px-4 pb-4 h-56">
            {m.laneMix.length === 0 ? <EmptyState icon="ship" title="No shipments yet" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={m.laneMix} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={3}>
                    {m.laneMix.map((d) => <Cell key={d.lane} fill={LANE_COLORS[d.lane]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* recent quotes */}
        <Card className="lg:col-span-2">
          <CardHead title="Recent quotations" right={<Link to="/quotes" className="text-xs font-semibold text-navy-700 hover:underline">View all →</Link>} />
          <div className="divide-y divide-slate-100">
            {recent.map((q) => {
              const t = m.totalsOf(q)[q.columns[0]]
              return (
                <Link key={q.id} to={`/quotes/${q.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      <span className="tnum text-navy-700">{q.no}</span> · {clientById(db, q.clientId)?.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{q.commodity} · {q.origin} → {q.dest}</p>
                  </div>
                  <span className="tnum text-sm font-semibold text-slate-800 shrink-0">{peso(t.sell, 0)}</span>
                  <QuoteStatusBadge status={q.status} />
                </Link>
              )
            })}
          </div>
        </Card>

        <div className="space-y-5">
          {/* margin trend */}
          <Card>
            <CardHead title="Margin trend" sub="Avg quoted margin % per week" />
            <div className="px-4 pb-4 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={m.weeks.filter((w) => w.margin != null)}>
                  <XAxis dataKey="wk" hide />
                  <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v) => [`${v}%`, 'Margin']} />
                  <Line type="monotone" dataKey="margin" stroke="#B45309" strokeWidth={2.5} dot={{ r: 3, fill: '#F5A623' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* expiring rate cards */}
          <Card>
            <CardHead title="Rate card alerts" />
            <div className="px-5 pb-4 space-y-2.5">
              {m.expiring.length === 0 && <p className="text-sm text-slate-500">All rate cards current. 👍</p>}
              {m.expiring.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{r.origin} → {r.dest}</p>
                    <p className="text-[11px] text-slate-400">{r.carrier} · {r.container}</p>
                  </div>
                  <Badge tone={r.days < 0 ? 'red' : 'amber'}>{r.days < 0 ? 'Expired' : `${r.days}d left`}</Badge>
                </div>
              ))}
              <Link to="/rates" className="block text-xs font-semibold text-navy-700 hover:underline pt-1">Manage rate cards →</Link>
            </div>
          </Card>
        </div>
      </div>

      {/* clearance pipeline strip */}
      <Card>
        <CardHead title="Clearance pipeline" sub="Live shipment stages" right={<Link to="/shipments" className="text-xs font-semibold text-navy-700 hover:underline">Open board →</Link>} />
        <div className="px-5 pb-5 grid grid-cols-7 gap-2">
          {STAGES.map((st) => {
            const items = db.shipments.filter((sh) => sh.stage === st.id)
            return (
              <div key={st.id} className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 text-center">
                <p className="tnum text-xl font-bold text-navy-800">{items.length}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mt-0.5">{st.label}</p>
                {items.slice(0, 1).map((sh) => <div key={sh.id} className="mt-1.5"><LaneBadge lane={sh.lane} /></div>)}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
