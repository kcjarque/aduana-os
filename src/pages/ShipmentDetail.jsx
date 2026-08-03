import { useParams, Link } from 'react-router-dom'
import { useDb, clientById, quoteById } from '../lib/store'
import { runSelectivity } from '../lib/compute'
import { STAGES } from '../lib/seed'
import { peso, fmtDate, fmtDateTime } from '../lib/format'
import { Card, CardHead, Button, PageHeader, LaneBadge, Badge, Icon, Field, Input, EmptyState } from '../components/ui'

export default function ShipmentDetail() {
  const { id } = useParams()
  const { db, update, toast } = useDb()
  const sh = db.shipments.find((x) => x.id === id)

  if (!sh) return <EmptyState icon="ship" title="Shipment not found" action={<Link to="/shipments"><Button tone="ghost">Back to board</Button></Link>} />

  const client = clientById(db, sh.clientId)
  const quote = quoteById(db, sh.quoteId)
  const stageIdx = STAGES.findIndex((s) => s.id === sh.stage)

  const patch = (p) => update((d) => { Object.assign(d.shipments.find((x) => x.id === id), p) })
  const addEvent = (label) => update((d) => {
    d.shipments.find((x) => x.id === id).events.push({ ts: new Date().toISOString(), label })
  })

  const toggleDoc = (key) => update((d) => {
    const doc = d.shipments.find((x) => x.id === id).docs[key]
    doc.done = !doc.done
    doc.date = doc.done ? new Date().toISOString().slice(0, 10) : null
  })

  const reRunLane = () => {
    const lane = runSelectivity()
    update((d) => {
      const x = d.shipments.find((y) => y.id === id)
      x.lane = lane
      x.events.push({ ts: new Date().toISOString(), label: `Selectivity re-run: ${lane.toUpperCase()} lane` })
    })
    toast(`Selectivity: ${lane.toUpperCase()} lane`)
  }

  const recordDp = () => {
    update((d) => { d.shipments.find((x) => x.id === id).billing.dpPaidAt = new Date().toISOString() })
    addEvent(`70% downpayment received — ${peso(sh.billing.dpAmt)}`)
    toast('Downpayment recorded')
  }
  const recordBal = () => {
    update((d) => { d.shipments.find((x) => x.id === id).billing.balPaidAt = new Date().toISOString() })
    addEvent(`30% balance received — ${peso(sh.billing.balAmt)}`)
    toast('Balance recorded — cleared for release')
  }

  const doneDocs = Object.values(sh.docs).filter((d) => d.done).length
  const docKeys = Object.keys(sh.docs)

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-3">{sh.refNo} <LaneBadge lane={sh.lane} /></span>}
        sub={`${client?.name} · ${sh.containerLabel} · from ${quote?.origin || '—'} to ${quote?.dest || '—'}`}
        right={<>
          <Link to="/shipments"><Button tone="ghost" size="sm">← Board</Button></Link>
          {quote && <Link to={`/quotes/${quote.id}`}><Button tone="soft" size="sm" icon="file">Quotation {quote.no}</Button></Link>}
          <Button tone="ghost" size="sm" icon="fx" onClick={reRunLane}>Re-run selectivity</Button>
        </>}
      />

      {/* stage stepper */}
      <Card className="mb-5 p-5">
        <div className="flex items-center">
          {STAGES.map((st, i) => (
            <div key={st.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => patch({ stage: st.id })}
                className="flex flex-col items-center gap-1.5 group"
                title={`Set stage: ${st.label}`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < stageIdx ? 'bg-emerald-500 text-white' : i === stageIdx ? 'bg-navy-800 text-white ring-4 ring-navy-100' : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300'
                }`}>
                  {i < stageIdx ? <Icon name="check" size={14} /> : i + 1}
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${i === stageIdx ? 'text-navy-800' : 'text-slate-400'}`}>{st.label}</span>
              </button>
              {i < STAGES.length - 1 && <div className={`h-0.5 flex-1 mx-1 mb-5 ${i < stageIdx ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 space-y-5">
          {/* docs checklist */}
          <Card>
            <CardHead
              title="Document checklist"
              sub="PCA-ready record keeping — every entry document versioned to this shipment"
              right={<Badge tone={doneDocs === docKeys.length ? 'green' : 'blue'}>{doneDocs}/{docKeys.length} complete</Badge>}
            />
            <div className="p-5 grid sm:grid-cols-2 gap-2">
              {docKeys.map((k) => {
                const doc = sh.docs[k]
                return (
                  <button
                    key={k}
                    onClick={() => toggleDoc(k)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      doc.done ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 hover:border-navy-600/40'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${doc.done ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300'}`}>
                      {doc.done && <Icon name="check" size={13} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-sm font-medium truncate ${doc.done ? 'text-emerald-800' : 'text-slate-700'}`}>{k}</span>
                      {doc.date && <span className="block text-[10px] text-slate-400">{fmtDate(doc.date)}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* timeline */}
          <Card>
            <CardHead title="Activity timeline" />
            <div className="p-5">
              <ol className="relative border-l-2 border-slate-100 ml-2 space-y-4">
                {[...sh.events].reverse().map((ev, i) => (
                  <li key={i} className="ml-4">
                    <span className={`absolute -left-[7px] w-3 h-3 rounded-full ${i === 0 ? 'bg-gold-500 ring-4 ring-gold-100' : 'bg-slate-300'}`} style={{ marginTop: 4 }} />
                    <p className="text-sm text-slate-700">{ev.label}</p>
                    <p className="text-[11px] text-slate-400">{fmtDateTime(ev.ts)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          {/* billing 70/30 */}
          <Card>
            <CardHead title="Billing · 70/30 terms" />
            <div className="p-5 space-y-3">
              <div className="rounded-xl bg-navy-900 text-white p-4">
                <p className="text-[10px] uppercase tracking-widest text-slate-300">Contract total</p>
                <p className="tnum text-2xl font-bold mt-0.5">{peso(sh.billing.total)}</p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3">
                <div>
                  <p className="text-xs font-semibold text-slate-700">70% Downpayment</p>
                  <p className="tnum text-sm font-bold text-slate-900">{peso(sh.billing.dpAmt)}</p>
                </div>
                {sh.billing.dpPaidAt
                  ? <Badge tone="green"><Icon name="check" size={12} /> {fmtDate(sh.billing.dpPaidAt)}</Badge>
                  : <Button size="sm" tone="gold" onClick={recordDp}>Record payment</Button>}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3">
                <div>
                  <p className="text-xs font-semibold text-slate-700">30% Balance (before release)</p>
                  <p className="tnum text-sm font-bold text-slate-900">{peso(sh.billing.balAmt)}</p>
                </div>
                {sh.billing.balPaidAt
                  ? <Badge tone="green"><Icon name="check" size={12} /> {fmtDate(sh.billing.balPaidAt)}</Badge>
                  : <Button size="sm" tone="gold" onClick={recordBal} disabled={!sh.billing.dpPaidAt}>Record payment</Button>}
              </div>
              {!sh.billing.balPaidAt && stageIdx >= 5 && (
                <p className="flex items-start gap-1.5 text-[11px] text-red-600"><Icon name="alert" size={13} className="mt-0.5" /> Shipment at Release with unpaid balance — hold gate pass.</p>
              )}
            </div>
          </Card>

          {/* vessel details */}
          <Card>
            <CardHead title="Vessel & references" />
            <div className="p-5 space-y-3">
              <Field label="B/L number"><Input value={sh.blNo} onChange={(e) => patch({ blNo: e.target.value })} /></Field>
              <Field label="Vessel / voyage"><Input value={sh.vessel || ''} onChange={(e) => patch({ vessel: e.target.value })} /></Field>
              <Field label="ETA"><Input type="date" value={sh.eta || ''} onChange={(e) => patch({ eta: e.target.value })} /></Field>
              <Field label="Notes">
                <textarea
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:ring-2 focus:ring-navy-600/30"
                  value={sh.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                />
              </Field>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
