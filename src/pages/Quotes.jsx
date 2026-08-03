import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDb, clientById, nextNo, currentFxWeek } from '../lib/store'
import { computeDT, quoteTotals, defaultDtInputs } from '../lib/compute'
import { chargeTemplate } from '../lib/seed'
import { peso, fmtDate, uid, addDays, isoDate } from '../lib/format'
import { Card, Button, PageHeader, SearchInput, QuoteStatusBadge, MarginChip, EmptyState, Select } from '../components/ui'

const FILTERS = ['all', 'draft', 'sent', 'approved', 'booked', 'lost']

export default function Quotes() {
  const { db, update, toast } = useDb()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return db.quotes
      .filter((x) => filter === 'all' || x.status === filter)
      .filter((x) => {
        if (!s) return true
        const c = clientById(db, x.clientId)?.name || ''
        return [x.no, c, x.commodity, x.origin, x.dest].join(' ').toLowerCase().includes(s)
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((x) => {
        const dtByCol = Object.fromEntries(x.columns.map((c) => [c, computeDT(x.dtInputs, c, db.settings)]))
        const t = quoteTotals(x, dtByCol)[x.columns[0]]
        return { ...x, t }
      })
  }, [db, q, filter])

  const newQuote = () => {
    const id = uid()
    const week = currentFxWeek(db)
    update((d) => {
      const lines = chargeTemplate.map((t) => ({
        id: t.key, label: t.label, kind: t.kind, bocKey: t.bocKey,
        values: t.kind === 'service' ? { '20FT': { buy: 0, sell: 0 } } : undefined,
      }))
      d.quotes.unshift({
        id, no: nextNo(d, 'quote'), clientId: d.clients[0]?.id ?? null,
        origin: '', dest: 'Manila (South Harbor)', commodity: '',
        columns: ['20FT'], lines,
        dtInputs: { ...defaultDtInputs(), fxRate: week?.rates?.USD ?? 0 },
        status: 'draft', createdAt: new Date().toISOString(), sentAt: null, approvedAt: null, lostAt: null,
        validUntil: isoDate(addDays(new Date(), d.settings.quoteValidityDays)),
        presentation: 'itemized', signature: null, notes: '', chosenCol: null,
      })
      d.counters.quote += 1
    })
    toast('New draft quotation created')
    nav(`/quotes/${id}`)
  }

  return (
    <div>
      <PageHeader
        title="Quotations"
        sub="16-line standard template · buy/sell margin discipline · e-sign to 70/30 terms"
        right={<>
          <SearchInput value={q} onChange={setQ} placeholder="Search no., client, commodity…" />
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="!w-32">
            {FILTERS.map((f) => <option key={f} value={f}>{f === 'all' ? 'All statuses' : f[0].toUpperCase() + f.slice(1)}</option>)}
          </Select>
          <Button icon="plus" onClick={newQuote}>New quotation</Button>
        </>}
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon="file" title="No quotations found" sub="Create one from scratch or from a D&T estimate." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                <th className="px-5 py-3 font-semibold">Quote</th>
                <th className="px-3 py-3 font-semibold">Client & cargo</th>
                <th className="px-3 py-3 font-semibold">Lane</th>
                <th className="px-3 py-3 font-semibold text-right">Total (sell)</th>
                <th className="px-3 py-3 font-semibold">Margin</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Valid until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((x) => (
                <tr key={x.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => nav(`/quotes/${x.id}`)}>
                  <td className="px-5 py-3">
                    <span className="tnum font-semibold text-navy-700">{x.no}</span>
                    <span className="block text-[11px] text-slate-400">{fmtDate(x.createdAt)} · {x.columns.join(' + ')}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-medium text-slate-800">{clientById(db, x.clientId)?.name || '—'}</span>
                    <span className="block text-[11px] text-slate-400 truncate max-w-[260px]">{x.commodity || 'No commodity yet'}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500">{x.origin || '—'} → {x.dest}</td>
                  <td className="px-3 py-3 text-right tnum font-semibold">{peso(x.t.sell, 0)}</td>
                  <td className="px-3 py-3"><MarginChip pctVal={x.t.marginPct} floor={db.settings.marginFloor} /></td>
                  <td className="px-3 py-3"><QuoteStatusBadge status={x.status} /></td>
                  <td className="px-5 py-3 text-right text-xs text-slate-500">{fmtDate(x.validUntil)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
