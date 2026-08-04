import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useDb, clientById, quoteById, nextNo } from '../lib/store'
import { computeDT, quoteTotals, dtInputsForCol } from '../lib/compute'
import { DOC_KEYS, chargeTemplate } from '../lib/seed'
import { completeness } from '../lib/completeness'
import { followupMessage } from '../lib/followup'
import { provincesOf, citiesOf, truckingLookup } from '../lib/trucking'
import { peso, fmtDate, uid } from '../lib/format'
import {
  Card, CardHead, Button, PageHeader, Field, Input, NumInput, Select, Toggle,
  QuoteStatusBadge, IncomeChip, Badge, Icon, Modal, EmptyState,
} from '../components/ui'
import { DtForm, DtDisclaimer } from '../components/dt'

const COLS_OPTS = [
  { id: '20FT', label: 'FCL — 20FT only' },
  { id: '40FT', label: 'FCL — 40FT only' },
  { id: 'BOTH', label: 'FCL — 20FT vs 40FT comparison' },
  { id: 'LCL', label: 'LCL (consolidation)' },
  { id: 'AIR', label: 'Via Air' },
]

export default function QuoteEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db, update, toast } = useDb()
  const quote = quoteById(db, id)
  const [convertOpen, setConvertOpen] = useState(false)
  const [rateOpen, setRateOpen] = useState(false)
  const [checkOpen, setCheckOpen] = useState(false)

  if (!quote) {
    return <EmptyState icon="file" title="Quotation not found" action={<Link to="/quotes"><Button tone="ghost">Back to quotations</Button></Link>} />
  }

  const s = db.settings
  const editable = ['draft', 'sent'].includes(quote.status)
  const patchQ = (p) => update((d) => { Object.assign(d.quotes.find((x) => x.id === id), p) })
  const patchDt = (p) => update((d) => { Object.assign(d.quotes.find((x) => x.id === id).dtInputs, p) })

  const dtByCol = useMemo(
    () => Object.fromEntries(quote.columns.map((c) => [c, computeDT(dtInputsForCol(quote.dtInputs, c), s)])),
    [quote.dtInputs, quote.columns, s],
  )
  const totals = useMemo(() => quoteTotals(quote, dtByCol), [quote, dtByCol])
  const check = useMemo(() => completeness(quote), [quote])
  const belowFloor = quote.columns.some((c) => totals[c].net < s.profitFloor)
  const client = clientById(db, quote.clientId)

  const setColumns = (mode) => {
    update((d) => {
      const qq = d.quotes.find((x) => x.id === id)
      const cols = mode === 'BOTH' ? ['20FT', '40FT'] : [mode]
      qq.columns = cols
      qq.dtInputs.mode = mode === 'LCL' ? 'LCL' : mode === 'AIR' ? 'AIR' : 'FCL'
      qq.lines.forEach((ln) => {
        if (ln.locked) return
        const prev = ln.values || {}
        const tpl = chargeTemplate.find((t) => t.key === ln.key)
        ln.values = Object.fromEntries(cols.map((c) => [c, prev[c] ?? (c === '40FT' ? (tpl?.d40 ?? 0) : (tpl?.d20 ?? 0))]))
      })
      qq.finalQuote = Object.fromEntries(cols.map((c) => [c, qq.finalQuote?.[c] ?? 0]))
      if (qq.chosenCol && !cols.includes(qq.chosenCol)) qq.chosenCol = null
    })
  }

  const setLineVal = (key, col, v) => update((d) => {
    const qq = d.quotes.find((x) => x.id === id)
    qq.lines.find((l) => l.key === key).values[col] = v === '' ? 0 : v
    if (key === 'trucking') qq.truckingAuto = false // manual override
  })
  const setFinal = (col, v) => update((d) => { d.quotes.find((x) => x.id === id).finalQuote[col] = v === '' ? 0 : v })

  // ---- trucking autofill on delivery city ----
  const applyDelivery = (province, city) => update((d) => {
    const qq = d.quotes.find((x) => x.id === id)
    qq.deliveryProvince = province
    qq.deliveryCity = city
    qq.deliveryAddr = [qq.deliveryStreet, city, province].filter(Boolean).join(', ')
    const ln = qq.lines.find((l) => l.key === 'trucking')
    if (ln && city) {
      let any = false
      qq.columns.forEach((c) => {
        const rate = truckingLookup(d.truckingRates, province, city, c)
        if (rate != null) { ln.values[c] = rate; any = true }
      })
      qq.truckingAuto = any
    }
  })

  const addLine = () => update((d) => {
    const qq = d.quotes.find((x) => x.id === id)
    qq.lines.push({ key: uid(), label: 'Custom charge', remark: '', locked: false, refundable: false, values: Object.fromEntries(qq.columns.map((c) => [c, 0])) })
  })
  const removeLine = (key) => update((d) => { const qq = d.quotes.find((x) => x.id === id); qq.lines = qq.lines.filter((l) => l.key !== key) })

  const markSent = () => {
    if (!check.complete) { setCheckOpen(true); toast('Inquiry incomplete — see missing details', 'err'); return }
    patchQ({ status: 'sent', sentAt: new Date().toISOString() }); toast('Quotation marked as sent')
  }
  const markLost = () => { patchQ({ status: 'lost', lostAt: new Date().toISOString() }); toast('Marked lost', 'err') }
  const deleteDraft = () => { update((d) => { d.quotes = d.quotes.filter((x) => x.id !== id) }); toast('Draft deleted', 'err'); nav('/quotes') }

  const copyFollowup = async () => {
    const msg = followupMessage(quote, client?.contact || client?.name, check.missing)
    try { await navigator.clipboard.writeText(msg); toast('Follow-up copied to clipboard') }
    catch { toast('Copy failed — select & copy manually', 'err') }
  }

  const convert = (col) => {
    const shId = uid()
    update((d) => {
      const qq = d.quotes.find((x) => x.id === id)
      qq.status = 'booked'; qq.chosenCol = col
      const total = Number(qq.finalQuote[col]) || 0
      const dpAmt = Math.round(total * d.settings.dpSplit)
      d.shipments.unshift({
        id: shId, refNo: nextNo(d, 'shipment'), quoteId: qq.id, clientId: qq.clientId,
        containerLabel: col === 'LCL' ? 'LCL' : col === 'AIR' ? 'AIR' : `1×${col}`, col,
        stage: 'booked', lane: null, carrier: '', blNo: '', vessel: '', eta: '', notes: '',
        docs: Object.fromEntries(DOC_KEYS.map((k) => [k, { done: false, date: null }])),
        billing: { total, dpAmt, balAmt: total - dpAmt, dpPaidAt: null, balPaidAt: null },
        events: [{ ts: new Date().toISOString(), label: `Booking confirmed from ${qq.no} (${col})` }],
      })
      d.counters.shipment += 1
    })
    setConvertOpen(false); toast('Shipment created — 70% DP now due'); nav(`/shipments/${shId}`)
  }

  const applyRate = (r) => {
    update((d) => {
      const qq = d.quotes.find((x) => x.id === id)
      const fx = qq.dtInputs.fxRate || 0
      const ln = qq.lines.find((l) => l.key === 'freight')
      if (!ln) return
      for (const c of qq.columns) if (r.container === c || qq.columns.length === 1) ln.values[c] = Math.round(r.sellUsd * fx)
      if (!qq.origin) qq.origin = r.origin
    })
    setRateOpen(false); toast(`Freight filled from ${r.carrier} rate card @ E.R.`)
  }

  const provinces = provincesOf(db.truckingRates)
  const cities = quote.deliveryProvince ? citiesOf(db.truckingRates, quote.deliveryProvince) : []
  const truckingMissing = quote.deliveryCity && quote.columns.some((c) => truckingLookup(db.truckingRates, quote.deliveryProvince, quote.deliveryCity, c) == null)
  const checkTone = check.complete ? 'green' : check.done / check.total >= 0.7 ? 'amber' : 'red'

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-3">{quote.no} <QuoteStatusBadge status={quote.status} />
          <button onClick={() => setCheckOpen(true)} title="Inquiry completeness">
            <Badge tone={checkTone}><Icon name={check.complete ? 'check' : 'alert'} size={12} /> {check.done}/{check.total} complete</Badge>
          </button>
        </span>}
        sub={`Created ${fmtDate(quote.createdAt)}${quote.sentAt ? ` · sent ${fmtDate(quote.sentAt)}` : ''}${quote.approvedAt ? ` · signed ${fmtDate(quote.approvedAt)}` : ''}`}
        right={<>
          <Link to="/quotes"><Button tone="ghost" size="sm">← All quotes</Button></Link>
          {editable && <Button tone="ghost" size="sm" icon="tags" onClick={() => setRateOpen(true)}>Pull freight rate</Button>}
          <Link to={`/print/quote/${quote.id}`}><Button tone="soft" size="sm" icon="print">Print / client sign-off</Button></Link>
          {quote.status === 'draft' && <Button size="sm" icon="arrow" onClick={markSent}>Mark sent</Button>}
          {quote.status === 'sent' && <Button tone="danger" size="sm" onClick={markLost}>Mark lost</Button>}
          {quote.status === 'approved' && <Button tone="gold" size="sm" icon="ship" onClick={() => setConvertOpen(true)}>Convert to shipment</Button>}
          {quote.status === 'booked' && (
            <Link to={`/shipments/${db.shipments.find((sh) => sh.quoteId === quote.id)?.id || ''}`}>
              <Button tone="gold" size="sm" icon="ship">Open shipment</Button>
            </Link>
          )}
        </>}
      />

      {belowFloor && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <Icon name="alert" size={16} />
          Net income below the ₱{(s.profitFloor / 1000).toFixed(0)}K floor (target ₱{(s.profitFloor / 1000).toFixed(0)}K–{(s.profitTarget / 1000).toFixed(0)}K) — raise the final quotation or trim expenses.
        </div>
      )}

      <div className="grid xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 space-y-5">
          <Card>
            <CardHead title="Inquiry & shipment details" sub={client ? `${client.contact || ''} · ${client.phone || ''} · ${client.email || ''}` : ''} />
            <div className="p-5 grid sm:grid-cols-2 gap-3">
              <Field label="Client">
                <Select value={quote.clientId || ''} disabled={!editable} onChange={(e) => patchQ({ clientId: e.target.value })}>
                  {db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Commodity (summary)">
                <Input value={quote.commodity} disabled={!editable} onChange={(e) => patchQ({ commodity: e.target.value })} placeholder="e.g. Commercial refrigerator" />
              </Field>
              <Field label="Country of origin">
                <Input value={quote.originCountry || ''} disabled={!editable} onChange={(e) => patchQ({ originCountry: e.target.value })} />
              </Field>
              <Field label="Shipment option">
                <Select value={quote.columns.length === 2 ? 'BOTH' : quote.columns[0]} disabled={!editable} onChange={(e) => setColumns(e.target.value)}>
                  {COLS_OPTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </Select>
              </Field>
              {quote.dtInputs.incoterm === 'EXWORKS' && (
                <Field label="Pickup address (EXWORKS)" className="sm:col-span-2">
                  <Input value={quote.pickupAddr || ''} disabled={!editable} onChange={(e) => patchQ({ pickupAddr: e.target.value })} />
                </Field>
              )}
              <Field label="Port of loading">
                <Input value={quote.pol || quote.origin || ''} disabled={!editable} onChange={(e) => patchQ({ pol: e.target.value, origin: e.target.value })} />
              </Field>
              <Field label="Port of destination">
                <Input value={quote.pod || quote.dest || ''} disabled={!editable} onChange={(e) => patchQ({ pod: e.target.value, dest: e.target.value })} />
              </Field>
              <Field label="Gross weight (kgs)"><NumInput value={quote.grossWeight || 0} disabled={!editable} onChange={(v) => patchQ({ grossWeight: v })} /></Field>
              <Field label="Total volume (CBM)"><NumInput value={quote.volume || 0} disabled={!editable} onChange={(v) => patchQ({ volume: v })} /></Field>

              {/* delivery — cascading province → city drives trucking line 11 */}
              <Field label="Delivery province">
                <Select value={quote.deliveryProvince || ''} disabled={!editable} onChange={(e) => applyDelivery(e.target.value, '')}>
                  <option value="">— Select —</option>
                  {provinces.map((p) => <option key={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="Delivery city / municipality" hint={quote.truckingAuto ? 'Trucking line auto-filled from tariff' : undefined}>
                <Select value={quote.deliveryCity || ''} disabled={!editable || !quote.deliveryProvince} onChange={(e) => applyDelivery(quote.deliveryProvince, e.target.value)}>
                  <option value="">— Select —</option>
                  {cities.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Delivery street / bldg." className="sm:col-span-1">
                <Input value={quote.deliveryStreet || ''} disabled={!editable}
                  onChange={(e) => patchQ({ deliveryStreet: e.target.value, deliveryAddr: [e.target.value, quote.deliveryCity, quote.deliveryProvince].filter(Boolean).join(', ') })} />
              </Field>
              <Field label="Valid until">
                <Input type="date" value={quote.validUntil || ''} disabled={!editable} onChange={(e) => patchQ({ validUntil: e.target.value })} />
              </Field>
              {truckingMissing && (
                <div className="sm:col-span-2 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-700">
                  <Icon name="alert" size={13} /> No trucking tariff row for {quote.deliveryCity} — enter the rate manually on line 11 (or add it in Settings → Trucking).
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHead title="Computations — inquiry tool expense lines" sub="16 lines; Duties & Taxes auto-computed; Trucking auto-fills from the tariff by city"
              right={<Toggle checked={quote.presentation === 'allin'} onChange={(v) => patchQ({ presentation: v ? 'allin' : 'itemized' })} label="All-in presentation" />}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                    <th className="px-5 py-2.5 font-semibold">Expense line</th>
                    {quote.columns.map((c) => <th key={c} className="px-3 py-2.5 font-semibold text-right w-36 text-navy-700">{c} (₱)</th>)}
                    <th className="px-3 py-2.5 font-semibold w-52">Remarks</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {quote.lines.map((ln) => (
                    <tr key={ln.key} className="group">
                      <td className="px-5 py-2">
                        {ln.locked ? (
                          <span className="flex items-center gap-1.5 text-slate-700"><Icon name="lock" size={13} className="text-slate-300" />{ln.label}</span>
                        ) : (
                          <span className="text-slate-800">{ln.label}
                            {ln.refundable && <Badge tone="gold" className="ml-2">refundable</Badge>}
                            {ln.key === 'trucking' && quote.truckingAuto && <Badge tone="blue" className="ml-2">from tariff</Badge>}
                            {ln.key === 'trucking' && quote.truckingAuto === false && quote.deliveryCity && <Badge tone="amber" className="ml-2">manual</Badge>}
                          </span>
                        )}
                      </td>
                      {quote.columns.map((c) => ln.locked ? (
                        <td key={c} className="px-3 py-2 text-right tnum font-semibold text-navy-800">{peso(dtByCol[c]?.totalBoc ?? 0, 0)}</td>
                      ) : (
                        <td key={c} className="px-3 py-1.5">
                          <NumInput className="!w-full !px-2 !py-1 !text-xs !rounded-lg" value={ln.values?.[c] ?? 0} disabled={!editable} onChange={(v) => setLineVal(ln.key, c, v)} />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-[11px] text-slate-400">{ln.remark}</td>
                      <td className="pr-3">
                        {!ln.locked && !chargeTemplate.find((t) => t.key === ln.key) && editable && (
                          <button onClick={() => removeLine(ln.key)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"><Icon name="trash" size={14} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50/60">
                    <td className="px-5 py-3 font-semibold text-slate-900">TOTAL EXPENSES</td>
                    {quote.columns.map((c) => <td key={c} className="px-3 py-3 text-right tnum font-bold text-slate-800">{peso(totals[c].expenses, 0)}</td>)}
                    <td colSpan={2} />
                  </tr>
                  <tr className="bg-gold-50/70">
                    <td className="px-5 py-3 font-bold text-gold-600 uppercase text-xs tracking-wide">Final Quotation</td>
                    {quote.columns.map((c) => (
                      <td key={c} className="px-3 py-2">
                        <NumInput className="!w-full !px-2 !py-1.5 !text-sm !font-bold !rounded-lg !border-gold-500/60 !bg-white" value={quote.finalQuote?.[c] ?? 0} disabled={!editable} onChange={(v) => setFinal(c, v)} />
                      </td>
                    ))}
                    <td colSpan={2} className="px-3 text-[11px] text-gold-600">Profit guide: ₱{(s.profitFloor / 1000).toFixed(0)}K–{(s.profitTarget / 1000).toFixed(0)}K</td>
                  </tr>
                  <tr><td className="px-5 py-2 text-xs font-semibold text-slate-500">GROSS INCOME</td>
                    {quote.columns.map((c) => <td key={c} className="px-3 py-2 text-right tnum font-semibold text-slate-700">{peso(totals[c].gross, 0)}</td>)}<td colSpan={2} /></tr>
                  <tr><td className="px-5 py-2 text-xs font-semibold text-slate-500">CNTR. DEPOSIT REFUND</td>
                    {quote.columns.map((c) => <td key={c} className="px-3 py-2 text-right tnum text-slate-600">{peso(totals[c].refund, 0)}</td>)}
                    <td colSpan={2} className="px-3 text-[11px] text-slate-400">Returned on clean empty return</td></tr>
                  <tr className="border-t border-slate-200 bg-navy-50/50">
                    <td className="px-5 py-3 font-bold text-navy-900">NET INCOME</td>
                    {quote.columns.map((c) => (
                      <td key={c} className="px-3 py-3 text-right">
                        <span className="tnum font-bold text-navy-900 mr-2">{peso(totals[c].net, 0)}</span>
                        <IncomeChip net={totals[c].net} floor={s.profitFloor} target={s.profitTarget} />
                      </td>
                    ))}
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
            {editable && <div className="px-5 py-3 border-t border-slate-100"><Button tone="ghost" size="sm" icon="plus" onClick={addLine}>Add custom line</Button></div>}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHead title="Duties & taxes inputs" sub="Multi-item; drives the locked D&T expense line" />
            <div className="p-5">
              <fieldset disabled={!editable}><DtForm inputs={quote.dtInputs} onPatch={patchDt} compact /></fieldset>
              <div className="mt-4 rounded-xl bg-navy-50 p-3 space-y-1">
                {quote.columns.map((c) => (
                  <div key={c} className="flex justify-between text-sm">
                    <span className="text-slate-600">D&T payable to BOC · {c}</span>
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
                Payment terms: {(s.dpSplit * 100).toFixed(0)}% downpayment upon signed acceptance · {(100 - s.dpSplit * 100).toFixed(0)}% before cargo release. Valid until {fmtDate(quote.validUntil)}.
              </div>
              <textarea className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-[90px] focus:outline-none focus:ring-2 focus:ring-navy-600/30" placeholder="Internal notes…" value={quote.notes} onChange={(e) => patchQ({ notes: e.target.value })} />
              {quote.status === 'draft' && <Button tone="danger" size="sm" icon="trash" onClick={deleteDraft}>Delete draft</Button>}
            </div>
          </Card>
        </div>
      </div>

      {/* completeness modal */}
      <Modal open={checkOpen} onClose={() => setCheckOpen(false)} title="Inquiry completeness — check kung kompleto"
        footer={<><Button tone="ghost" onClick={() => setCheckOpen(false)}>Close</Button><Button tone="gold" icon="copy" onClick={copyFollowup} disabled={check.complete}>Copy follow-up (Taglish)</Button></>}>
        <div className="space-y-1.5">
          {check.items.map((it) => (
            <div key={it.key} className="flex items-center gap-2 text-sm">
              <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${it.ok ? 'bg-emerald-500 text-white' : 'border-2 border-amber-300 bg-amber-50'}`}>
                {it.ok ? <Icon name="check" size={12} /> : <Icon name="x" size={11} className="text-amber-500" />}
              </span>
              <span className={it.ok ? 'text-slate-600' : 'text-slate-900 font-medium'}>{it.label}</span>
            </div>
          ))}
        </div>
        {!check.complete && <p className="mt-3 text-[11px] text-slate-400">"Mark sent" stays blocked until complete. Drafts always save.</p>}
      </Modal>

      {/* convert modal */}
      <Modal open={convertOpen} onClose={() => setConvertOpen(false)} title="Convert to shipment" footer={<Button tone="ghost" onClick={() => setConvertOpen(false)}>Cancel</Button>}>
        <p className="text-sm text-slate-600 mb-4">Which option did {client?.name} confirm? Billing ({(s.dpSplit * 100).toFixed(0)}/{(100 - s.dpSplit * 100).toFixed(0)}) uses that column's final quotation.</p>
        <div className="grid grid-cols-2 gap-3">
          {quote.columns.map((c) => (
            <button key={c} onClick={() => convert(c)} className="rounded-xl border-2 border-slate-200 hover:border-navy-600 hover:bg-navy-50 p-4 text-left transition-colors">
              <p className="font-display font-bold text-navy-800">{c}</p>
              <p className="tnum text-lg font-bold text-slate-900 mt-1">{peso(totals[c].finalQuote, 0)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">DP {peso(totals[c].finalQuote * s.dpSplit, 0)} on booking</p>
            </button>
          ))}
        </div>
      </Modal>

      {/* rate card picker */}
      <Modal open={rateOpen} onClose={() => setRateOpen(false)} title="Pull ocean freight from rate card" wide>
        <div className="divide-y divide-slate-100">
          {db.rateCards.filter((r) => new Date(r.validTo) >= new Date()).map((r) => (
            <button key={r.id} onClick={() => applyRate(r)} className="w-full flex items-center justify-between gap-3 py-2.5 px-2 hover:bg-navy-50 rounded-lg text-left">
              <div><p className="text-sm font-semibold text-slate-800">{r.origin} → {r.dest}</p><p className="text-xs text-slate-500">{r.carrier} · {r.container} · valid to {fmtDate(r.validTo)}</p></div>
              <div className="text-right tnum text-sm"><span className="text-slate-500">buy ${r.buyUsd}</span><span className="font-bold text-navy-800 ml-3">sell ${r.sellUsd}</span></div>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">Sell rate × the quote's exchange rate fills the Air/Ocean Freight line for matching columns.</p>
      </Modal>
    </div>
  )
}
