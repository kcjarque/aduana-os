import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDb, clientById, nextNo, currentFxWeek } from '../lib/store'
import { computeDT, quoteTotals, dtInputsForCol, defaultDtInputs } from '../lib/compute'
import { chargeTemplate } from '../lib/seed'
import { peso, fmtDate, uid, addDays, isoDate } from '../lib/format'
import { Card, Button, PageHeader, SearchInput, QuoteStatusBadge, IncomeChip, EmptyState, Select } from '../components/ui'

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
        return [x.no, c, x.commodity, x.originCountry, x.origin, x.dest].join(' ').toLowerCase().includes(s)
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((x) => {
        const dtByCol = Object.fromEntries(x.columns.map((c) => [c, computeDT(dtInputsForCol(x.dtInputs, c), db.settings)]))
        const t = quoteTotals(x, dtByCol)[x.chosenCol || x.columns[0]]
        return { ...x, t }
      })
  }, [db, q, filter])

  const newQuote = () => {
    const id = uid()
    const week = currentFxWeek(db)
    update((d) => {
      const lines = chargeTemplate.map((t) => ({
        key: t.key, label: t.label, remark: t.remark, locked: !!t.locked, refundable: !!t.refundable,
        values: t.locked ? undefined : { '20FT': t.d20 ?? 0 },
      }))
      d.quotes.unshift({
        id, no: nextNo(d, 'quote'), clientId: d.clients[0]?.id ?? null,
        origin: '', originCountry: '', pickupAddr: '', pol: '', pod: 'Manila (South Harbor)', dest: 'Manila (South Harbor)',
        grossWeight: 0, volume: 0, deliveryAddr: '', commodity: '',
        columns: ['20FT'], lines,
        dtInputs: { ...defaultDtInputs(), fxRate: week?.rates?.USD ?? 0, qtyPerCol: 1 },
        status: 'draft', createdAt: new Date().toISOString(), sentAt: null, approvedAt: null, lostAt: null,
        validUntil: isoDate(addDays(new Date(), d.settings.quoteValidityDays)),
        presentation: 'itemized', signature: null, notes: '', chosenCol: null,
        finalQuote: { '20FT': 0 },
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
        sub="Digitized inquiry tool — 16 expense lines · final quotation · net income per the 30K–50K profit guide"
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
                <th className="px-3 py-3 font-semibold text-right">Final quotation</th>
                <th className="px-3 py-3 font-semibold">Net income</th>
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
                    <span className="block text-[11px] text-slate-400 truncate max-w-[240px]">{x.commodity || 'No commodity yet'}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500">{x.pol || x.origin || '—'} → {x.pod || x.dest}</td>
                  <td className="px-3 py-3 text-right tnum font-semibold">{peso(x.t.finalQuote, 0)}</td>
                  <td className="px-3 py-3"><IncomeChip net={x.t.net} floor={db.settings.profitFloor} target={db.settings.profitTarget} /></td>
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
