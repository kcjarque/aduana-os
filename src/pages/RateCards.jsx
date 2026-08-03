import { useState } from 'react'
import { useDb } from '../lib/store'
import { fmtDate, daysUntil, uid } from '../lib/format'
import { Card, Button, PageHeader, Badge, Modal, Field, Input, NumInput, Select, Icon, EmptyState } from '../components/ui'

const empty = { origin: '', dest: 'Manila (South Harbor)', carrier: '', container: '20FT', buyUsd: 0, sellUsd: 0, validFrom: '', validTo: '', notes: '' }

export default function RateCards() {
  const { db, update, toast } = useDb()
  const [editing, setEditing] = useState(null) // null | {…}

  const save = () => {
    update((d) => {
      if (editing.id) Object.assign(d.rateCards.find((r) => r.id === editing.id), editing)
      else d.rateCards.unshift({ ...editing, id: uid() })
    })
    toast(editing.id ? 'Rate card updated' : 'Rate card added')
    setEditing(null)
  }
  const remove = (id) => { update((d) => { d.rateCards = d.rateCards.filter((r) => r.id !== id) }); toast('Rate card removed', 'err') }

  const rows = [...db.rateCards].sort((a, b) => new Date(a.validTo) - new Date(b.validTo))

  return (
    <div>
      <PageHeader
        title="Rate Cards"
        sub="Buy vs sell per lane — expired rates are the #1 margin-leak source"
        right={<Button icon="plus" onClick={() => setEditing({ ...empty, validFrom: new Date().toISOString().slice(0, 10), validTo: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) })}>New rate card</Button>}
      />
      <Card>
        {rows.length === 0 ? <EmptyState icon="tags" title="No rate cards yet" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                <th className="px-5 py-3 font-semibold">Lane</th>
                <th className="px-3 py-3 font-semibold">Carrier</th>
                <th className="px-3 py-3 font-semibold">Equip</th>
                <th className="px-3 py-3 font-semibold text-right">Buy (USD)</th>
                <th className="px-3 py-3 font-semibold text-right">Sell (USD)</th>
                <th className="px-3 py-3 font-semibold text-right">Spread</th>
                <th className="px-3 py-3 font-semibold">Validity</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const days = daysUntil(r.validTo)
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <span className="font-medium text-slate-800">{r.origin} → {r.dest}</span>
                      {r.notes && <span className="block text-[11px] text-slate-400">{r.notes}</span>}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{r.carrier}</td>
                    <td className="px-3 py-3"><Badge tone="blue">{r.container}</Badge></td>
                    <td className="px-3 py-3 text-right tnum">${r.buyUsd}</td>
                    <td className="px-3 py-3 text-right tnum font-semibold">${r.sellUsd}</td>
                    <td className="px-3 py-3 text-right tnum text-gold-600 font-semibold">${r.sellUsd - r.buyUsd}</td>
                    <td className="px-3 py-3">
                      <Badge tone={days < 0 ? 'red' : days <= 14 ? 'amber' : 'green'}>
                        {days < 0 ? 'Expired' : `${days}d left`}
                      </Badge>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{fmtDate(r.validFrom)} – {fmtDate(r.validTo)}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button className="text-slate-400 hover:text-navy-700 mr-2" onClick={() => setEditing({ ...r })}><Icon name="cog" size={15} /></button>
                      <button className="text-slate-400 hover:text-red-500" onClick={() => remove(r.id)}><Icon name="trash" size={15} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit rate card' : 'New rate card'}
        footer={<><Button tone="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Origin"><Input value={editing.origin} onChange={(e) => setEditing({ ...editing, origin: e.target.value })} /></Field>
            <Field label="Destination"><Input value={editing.dest} onChange={(e) => setEditing({ ...editing, dest: e.target.value })} /></Field>
            <Field label="Carrier"><Input value={editing.carrier} onChange={(e) => setEditing({ ...editing, carrier: e.target.value })} /></Field>
            <Field label="Equipment">
              <Select value={editing.container} onChange={(e) => setEditing({ ...editing, container: e.target.value })}>
                {['20FT', '40FT', 'LCL'].map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Buy rate (USD)"><NumInput value={editing.buyUsd} onChange={(v) => setEditing({ ...editing, buyUsd: v })} /></Field>
            <Field label="Sell rate (USD)"><NumInput value={editing.sellUsd} onChange={(v) => setEditing({ ...editing, sellUsd: v })} /></Field>
            <Field label="Valid from"><Input type="date" value={editing.validFrom} onChange={(e) => setEditing({ ...editing, validFrom: e.target.value })} /></Field>
            <Field label="Valid to"><Input type="date" value={editing.validTo} onChange={(e) => setEditing({ ...editing, validTo: e.target.value })} /></Field>
            <Field label="Notes" className="col-span-2"><Input value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Surcharges included, transshipment, etc." /></Field>
          </div>
        )}
      </Modal>
    </div>
  )
}
