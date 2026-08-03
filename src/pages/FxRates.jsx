import { useState } from 'react'
import { useDb, currentFxWeek } from '../lib/store'
import { fmtDate, num, uid } from '../lib/format'
import { Card, CardHead, Button, PageHeader, Badge, Modal, Field, Input, NumInput, Icon } from '../components/ui'

export default function FxRates() {
  const { db, update, toast } = useDb()
  const current = currentFxWeek(db)
  const [adding, setAdding] = useState(null)

  const openAdd = () => {
    const last = db.fxWeeks[0]
    const start = new Date(new Date(last.start).getTime() + 7 * 864e5)
    const end = new Date(start.getTime() + 6 * 864e5)
    setAdding({
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      cmcNo: '',
      rates: { ...last.rates },
    })
  }

  const save = () => {
    update((d) => { d.fxWeeks.unshift({ ...adding, id: uid() }) })
    toast('FX week published')
    setAdding(null)
  }

  return (
    <div>
      <PageHeader
        title="BOC Exchange Rates"
        sub="Weekly CMC rates (Sat–Fri), derived from the BSP reference bulletin — the rate at date of lodgement applies"
        right={<Button icon="plus" onClick={openAdd}>Publish next week</Button>}
      />

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-xs text-gold-600">
        <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
        <span>
          No official API exists — in production this table is fed by a scheduled fetch of the BSP Reference
          Exchange Rate Bulletin with admin confirmation (per CMO 14-2019). Demo data seeded.
        </span>
      </div>

      <div className="space-y-4">
        {db.fxWeeks.map((w) => {
          const isCurrent = w.id === current?.id
          return (
            <Card key={w.id} className={isCurrent ? 'ring-2 ring-gold-500/60' : ''}>
              <CardHead
                title={<span className="flex items-center gap-2">{fmtDate(w.start)} – {fmtDate(w.end)} {isCurrent && <Badge tone="gold">Current week</Badge>}</span>}
                sub={w.cmcNo}
              />
              <div className="px-5 pb-4 grid grid-cols-5 lg:grid-cols-10 gap-2">
                {db.settings.currencies.map((c) => (
                  <div key={c} className="rounded-xl bg-slate-50 border border-slate-200/70 px-2.5 py-2 text-center">
                    <p className="text-[10px] font-bold text-slate-400">{c}</p>
                    <p className="tnum text-sm font-semibold text-navy-800">{num(w.rates[c] ?? 0, w.rates[c] < 1 ? 4 : 2)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      <Modal open={!!adding} onClose={() => setAdding(null)} title="Publish weekly BOC rate" wide
        footer={<><Button tone="ghost" onClick={() => setAdding(null)}>Cancel</Button><Button onClick={save} disabled={!adding?.cmcNo}>Publish</Button></>}>
        {adding && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Effective from (Sat)"><Input type="date" value={adding.start} onChange={(e) => setAdding({ ...adding, start: e.target.value })} /></Field>
              <Field label="To (Fri)"><Input type="date" value={adding.end} onChange={(e) => setAdding({ ...adding, end: e.target.value })} /></Field>
              <Field label="CMC reference"><Input value={adding.cmcNo} placeholder="CMC No. 212-2026" onChange={(e) => setAdding({ ...adding, cmcNo: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {db.settings.currencies.map((c) => (
                <Field key={c} label={`${c} → ₱`}>
                  <NumInput value={adding.rates[c] ?? 0} step="0.0001"
                    onChange={(v) => setAdding({ ...adding, rates: { ...adding.rates, [c]: v } })} />
                </Field>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
