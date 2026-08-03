import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useDb, clientById, quoteById, nextNo } from '../lib/store'
import { computeDT, quoteTotals, bocLineAmount } from '../lib/compute'
import { DOC_KEYS } from '../lib/seed'
import { peso, fmtDate, uid } from '../lib/format'
import {
  Card, CardHead, Button, PageHeader, Field, Input, NumInput, Select, Toggle,
  QuoteStatusBadge, MarginChip, Badge, Icon, Modal, EmptyState,
} from '../components/ui'
import { DtForm, DtDisclaimer } from '../components/dt'

const COLS_OPTS = [
  { id: '20FT', label: '20FT only' },
  { id: '40FT', label: '40FT only' },
  { id: 'LCL', label: 'LCL' },
  { id: 'BOTH', label: '20FT vs 40FT comparison' },
]

export default function QuoteEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db, update, toast } = useDb()
  const quote = quoteById(db, id)
  const [convertOpen, setConvertOpen] = useState(false)
  const [rateOpen, setRateOpen] = useState(false)

  if (!quote) {
    return <EmptyState icon="file" title="Quotation not found" action={<Link to="/quotes"><Button tone="ghost">Back to quotations</Button></Link>} />
  }

  const s = db.settings
  const editable = ['draft', 'sent'].includes(quote.status)
  const patchQ = (p) => update((d) => { Object.assign(d.quotes.find((x) => x.id === id), p) })
  const patchDt = (p) => update((d) => { Object.assign(d.quotes.find((x) => x.id === id).dtInputs, p) })

  const dtByCol = useMemo(
    () => Object.fromEntries(quote.columns.map((c) => [c, computeDT(quote.dtInputs, c, s)])),
    [quote.dtInputs, quote.columns, s],
  )
  const totals = useMemo(() => quoteTotals(quote, dtByCol), [quote, dtByCol])
  const primary = quote.columns[0]
  const belowFloor = quote.columns.some((c) => totals[c].marginPct < s.marginFloor)

  const setColumns = (mode) => {
    update((d) => {
      const qq = d.quotes.find((x) => x.id === id)
      const cols = mode === 'BOTH' ? ['20FT', '40FT'] : [mode]
      qq.columns = cols
      qq.lines.forEach((ln) => {
        if (ln.kind !== 'service') return
        const prev = ln.values || {}
        const fallback = prev[Object.keys(prev)[0]] || { buy: 0, sell: 0 }
        ln.values = Object.fromEntries(cols.map((c) => [c, prev[c] ? { ...prev[c] } : { ...fallback }]))
      })
      if (qq.chosenCol && !cols.includes(qq.chosenCol)) qq.chosenCol = null
    })
  }

  const setLineVal = (lineId, col, field, v) => update((d) => {
    const ln = d.quotes.find((x) => x.id === id).lines.find((l) => l.id === lineId)
    ln.values[col][field] = v === '' ? 0 : v
  })

  const addLine = () => update((d) => {
    const qq = d.quotes.find((x) => x.id === id)
    qq.lines.push({
      id: uid(), label: 'Custom charge', kind: 'service',
      values: Object.fromEntries(qq.columns.map((c) => [c, { buy: 0, sell: 0 }])),
    })
  })

  const removeLine = (lineId) => update((d) => {
    const qq = d.quotes.find((x) => x.id === id)
    qq.lines = qq.lines.filter((l) => l.id !== lineId)
  })

  const markSent = () => { patchQ({ status: 'sent', sentAt: new Date().toISOString() }); toast('Quotation marked as sent') }
  const markLost = () => { patchQ({ status: 'lost', lostAt: new Date().toISOString() }); toast('Marked lost', 'err') }
  const deleteDraft = () => {
    update((d) => { d.quotes = d.quotes.filter((x) => x.id !== id) })
    toast('Draft deleted', 'err')
    nav('/quotes')
  }

  const convert = (col) => {
    const shId = uid()
    update((d) => {
      const qq = d.quotes.find((x) => x.id === id)
      qq.status = 'booked'
      qq.chosenCol = col
      const total = totals[col].sell
      const dpAmt = Math.round(total * d.settings.dpSplit)
      d.shipments.unshift({
        id: shId, refNo: nextNo(d, 'shipment'), quoteId: qq.id, clientId: qq.clientId,
        containerLabel: `${Math.max(1, Number(qq.dtInputs.qty) || 1)}×${col}`, col,
        stage: 'booked', lane: null, blNo: '', vessel: '',
        eta: '', notes: '',
        docs: Object.fromEntries(DOC_KEYS.map((k) => [k, { done: false, date: null }])),
        billing: { total, dpAmt, balAmt: total - dpAmt, dpPaidAt: null, balPaidAt: null },
        events: [{ ts: new Date().toISOString(), label: `Booking confirmed from ${qq.no} (${col})` }],
      })
      d.counters.shipment += 1
    })
    setConvertOpen(false)
    toast('Shipment created — 70% DP now due')
    nav(`/shipments/${shId}`)
  }

  const applyRate = (r) => {
    update((d) => {
      const qq = d.quotes.find((x) => x.id === id)
      const fx = qq.dtInputs.fxRate || 0
      const ln = qq.lines.find((l) => l.id === 'freight')
      if (!ln) return
      for (const c of qq.columns) {
        if (r.container === c || qq.columns.length === 1) {
          ln.values[c] = { buy: Math.round(r.buyUsd * fx), sell: Math.round(r.sellUsd * fx) }
        }
      }
      if (!qq.origin) qq.origin = r.origin
    })
    setRateOpen(false)
    toast(`Freight filled from ${r.carrier} rate card @ BOC rate`)
  }

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-3">{quote.no} <QuoteStatusBadge status={quote.status} /></span>}
        sub={`Created ${fmtDate(quote.createdAt)}${quote.sentAt ? ` · sent ${fmtDate(quote.sentAt)}` : ''}${quote.approvedAt ? ` · signed ${fmtDate(quote.approvedAt)}` : ''}`}
        right={<>
          <Link to="/quotes"><Button tone="ghost" size="sm">← All quotes</Button></Link>
          {editable && <Button tone="ghost" size="sm" icon="tags" onClick={() => setRateOpen(true)}>Pull freight rate</Button>}
          <Link to={`/print/quote/${quote.id}`}><Button tone="soft" size="sm" icon="print">Print / client sign-off</Button></Link>
          {quote.status === 'draft' && <Button size="sm" icon="arrow" onClick={markSent}>Mark sent</Button>}
          {quote.status === 'sent' && <Button tone="danger" size="sm" onClick={markLost}>Mark lost</Button>}
          {quote.status === 'approved' && <Button tone="gold" size="sm" icon="ship" onClick={() => setConvertOpen(true)}>Convert to shipment</Button>}
          {quote.status === 'booked' && quote.chosenCol && (
            <Link to={`/shipments/${db.shipments.find((sh) => sh.quoteId === quote.id)?.id || ''}`}>
              <Button tone="gold" size="sm" icon="ship">Open shipment</Button>
            </Link>
          )}
        </>}
      />

      {belowFloor && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <Icon name="alert" size={16} />
          Margin below the {`${(s.marginFloor * 100).toFixed(0)}%`} floor — requires checker approval before sending (maker–checker policy).
        </div>
      )}

      <div className="grid xl:grid-cols-3 gap-5 items-start">
        {/* left: header + charges */}
        <div className="xl:col-span-2 space-y-5">
          <Card>
            <CardHead title="Shipment header" />
            <div className="p-5 grid sm:grid-cols-2 gap-3">
              <Field label="Client">
                <Select value={quote.clientId || ''} disabled={!editable} onChange={(e) => patchQ({ clientId: e.target.value })}>
                  {db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Commodity summary">
                <Input value={quote.commodity} disabled={!editable} onChange={(e) => patchQ({ commodity: e.target.value })} placeholder="e.g. LED televisions — 640 units" />
              </Field>
              <Field label="Origin">
                <Input value={quote.origin} disabled={!editable} onChange={(e) => patchQ({ origin: e.target.value })} placeholder="Port, country" />
              </Field>
              <Field label="Destination">
                <Input value={quote.dest} disabled={!editable} onChange={(e) => patchQ({ dest: e.target.value })} />
              </Field>
              <Field label="Container option">
                <Select
                  value={quote.columns.length === 2 ? 'BOTH' : quote.columns[0]}
                  disabled={!editable}
                  onChange={(e) => setColumns(e.target.value)}
                >
                  {COLS_OPTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </Select>
              </Field>
              <Field label="Valid until">
                <Input type="date" value={quote.validUntil || ''} disabled={!editable} onChange={(e) => patchQ({ validUntil: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHead
              title="Charges — standard 16-line template"
              sub="BOC lines auto-computed from the D&T engine (locked); service lines carry your buy/sell margin"
              right={<Toggle checked={quote.presentation === 'allin'} onChange={(v) => patchQ({ presentation: v ? 'allin' : 'itemized' })} label="All-in presentation" />}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                    <th className="px-5 py-2.5 font-semibold">Line item</th>
                    {quote.columns.map((c) => (
                      <th key={c} className="px-3 py-2.5 font-semibold text-right" colSpan={2}>
                        <span className="text-navy-700">{c}</span>
                        <span className="block normal-case font-normal text-[10px] text-slate-400">buy · sell (₱)</span>
                      </th>
                    ))}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {quote.lines.map((ln) => (
                    <tr key={ln.id} className="group">
                      <td className="px-5 py-2">
                        {ln.kind === 'boc' ? (
                          <span className="flex items-center gap-1.5 text-slate-700">
                            <Icon name="lock" size={13} className="text-slate-300" />{ln.label}
                          </span>
                        ) : editable ? (
                          <input
                            className="w-full bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1 -mx-1 text-slate-800"
                            value={ln.label}
                            onChange={(e) => update((d) => { d.quotes.find((x) => x.id === id).lines.find((l) => l.id === ln.id).label = e.target.value })}
                          />
                        ) : <span className="text-slate-800">{ln.label}</span>}
                      </td>
                      {quote.columns.map((c) => ln.kind === 'boc' ? (
                        <td key={c} colSpan={2} className="px-3 py-2 text-right tnum text-slate-600">
                          <span className="text-slate-300 mr-3">·</span>{peso(bocLineAmount(ln.bocKey, dtByCol[c]))}
                        </td>
                      ) : (
                        <td key={c} colSpan={2} className="px-3 py-1.5">
                          <div className="flex gap-1.5 justify-end">
                            <NumInput className="!w-24 !px-2 !py-1 !text-xs !rounded-lg" value={ln.values[c]?.buy ?? 0}
                              disabled={!editable} onChange={(v) => setLineVal(ln.id, c, 'buy', v)} />
                            <NumInput className="!w-24 !px-2 !py-1 !text-xs !rounded-lg !border-navy-600/40 !bg-navy-50/40" value={ln.values[c]?.sell ?? 0}
                              disabled={!editable} onChange={(v) => setLineVal(ln.id, c, 'sell', v)} />
                          </div>
                        </td>
                      ))}
                      <td className="pr-3">
                        {ln.kind === 'service' && editable && (
                          <button onClick={() => removeLine(ln.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500">
                            <Icon name="trash" size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50/60">
                    <td className="px-5 py-3 font-semibold text-slate-900">Total quotation</td>
                    {quote.columns.map((c) => (
                      <td key={c} colSpan={2} className="px-3 py-3 text-right">
                        <span className="tnum font-bold text-base text-navy-800">{peso(totals[c].sell)}</span>
                        <span className="block text-[11px] text-slate-500 tnum">cost {peso(totals[c].buy, 0)}</span>
                      </td>
                    ))}
                    <td />
                  </tr>
                  <tr className="bg-gold-50/70">
                    <td className="px-5 py-2.5 font-semibold text-gold-600 text-xs uppercase tracking-wide">
                      Gross margin
                      <span className="block normal-case font-normal text-[10px] text-gold-600/70">% on service revenue (excl. pass-through advances)</span>
                    </td>
                    {quote.columns.map((c) => (
                      <td key={c} colSpan={2} className="px-3 py-2.5 text-right">
                        <span className="tnum font-bold text-gold-600">{peso(totals[c].margin)}</span>
                        <span className="ml-2"><MarginChip pctVal={totals[c].marginPct} floor={s.marginFloor} /></span>
                      </td>
                    ))}
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            {editable && (
              <div className="px-5 py-3 border-t border-slate-100">
                <Button tone="ghost" size="sm" icon="plus" onClick={addLine}>Add custom line</Button>
              </div>
            )}
          </Card>
        </div>

        {/* right: D&T inputs */}
        <div className="space-y-5">
          <Card>
            <CardHead title="Duties & taxes inputs" sub="Drives the locked BOC lines in the charge table" />
            <div className="p-5">
              <fieldset disabled={!editable}>
                <DtForm inputs={quote.dtInputs} onPatch={patchDt} compact />
              </fieldset>
              <div className="mt-4 rounded-xl bg-navy-50 p-3 space-y-1">
                {quote.columns.map((c) => (
                  <div key={c} className="flex justify-between text-sm">
                    <span className="text-slate-600">Payable to BOC · {c}</span>
                    <span className="tnum font-bold text-navy-800">{peso(dtByCol[c].totalBoc)}</span>
                  </div>
                ))}
              </div>
              <DtDisclaimer />
            </div>
          </Card>

          <Card>
            <CardHead title="Terms & notes" />
            <div className="p-5 space-y-3">
              <div className="rounded-xl border border-gold-200 bg-gold-50 px-3 py-2.5 text-xs text-gold-600 font-medium">
                Payment terms: {(s.dpSplit * 100).toFixed(0)}% downpayment upon signed acceptance ·{' '}
                {(100 - s.dpSplit * 100).toFixed(0)}% before cargo release. Quote valid until {fmtDate(quote.validUntil)}.
              </div>
              <textarea
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-[90px] focus:outline-none focus:ring-2 focus:ring-navy-600/30"
                placeholder="Internal notes…"
                value={quote.notes}
                onChange={(e) => patchQ({ notes: e.target.value })}
              />
              {quote.status === 'draft' && (
                <Button tone="danger" size="sm" icon="trash" onClick={deleteDraft}>Delete draft</Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* convert modal */}
      <Modal open={convertOpen} onClose={() => setConvertOpen(false)} title="Convert to shipment"
        footer={<Button tone="ghost" onClick={() => setConvertOpen(false)}>Cancel</Button>}>
        <p className="text-sm text-slate-600 mb-4">
          Which container option did {clientById(db, quote.clientId)?.name} confirm? The shipment's billing
          ({(s.dpSplit * 100).toFixed(0)}/{(100 - s.dpSplit * 100).toFixed(0)}) is based on the chosen column.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {quote.columns.map((c) => (
            <button key={c} onClick={() => convert(c)}
              className="rounded-xl border-2 border-slate-200 hover:border-navy-600 hover:bg-navy-50 p-4 text-left transition-colors">
              <p className="font-display font-bold text-navy-800">{c}</p>
              <p className="tnum text-lg font-bold text-slate-900 mt-1">{peso(totals[c].sell, 0)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">DP {peso(totals[c].sell * s.dpSplit, 0)} on booking</p>
            </button>
          ))}
        </div>
      </Modal>

      {/* rate card picker */}
      <Modal open={rateOpen} onClose={() => setRateOpen(false)} title="Pull ocean freight from rate card" wide>
        <div className="divide-y divide-slate-100">
          {db.rateCards.filter((r) => new Date(r.validTo) >= new Date()).map((r) => (
            <button key={r.id} onClick={() => applyRate(r)} className="w-full flex items-center justify-between gap-3 py-2.5 px-2 hover:bg-navy-50 rounded-lg text-left">
              <div>
                <p className="text-sm font-semibold text-slate-800">{r.origin} → {r.dest}</p>
                <p className="text-xs text-slate-500">{r.carrier} · {r.container} · valid to {fmtDate(r.validTo)}</p>
              </div>
              <div className="text-right tnum text-sm">
                <span className="text-slate-500">buy ${r.buyUsd}</span>
                <span className="font-bold text-navy-800 ml-3">sell ${r.sellUsd}</span>
              </div>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">Converted to ₱ at the quote's BOC rate. Rows matching the quote's container column(s) are filled.</p>
      </Modal>
    </div>
  )
}
