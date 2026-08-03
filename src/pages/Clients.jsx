import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDb } from '../lib/store'
import { peso, uid } from '../lib/format'
import { computeDT, quoteTotals } from '../lib/compute'
import { Card, Button, PageHeader, Badge, Modal, Field, Input, QuoteStatusBadge } from '../components/ui'

const empty = { name: '', tin: '', address: '', contact: '', email: '', phone: '' }

export default function Clients() {
  const { db, update, toast } = useDb()
  const [editing, setEditing] = useState(null)

  const save = () => {
    update((d) => {
      if (editing.id) Object.assign(d.clients.find((c) => c.id === editing.id), editing)
      else d.clients.unshift({ ...editing, id: uid() })
    })
    toast('Client saved')
    setEditing(null)
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        sub="Importers on record — CPRS-registered consignees"
        right={<Button icon="plus" onClick={() => setEditing({ ...empty })}>New client</Button>}
      />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {db.clients.map((c) => {
          const quotes = db.quotes.filter((q) => q.clientId === c.id)
          const booked = quotes.filter((q) => q.status === 'booked')
          const revenue = booked.reduce((sum, q) => {
            const dtByCol = Object.fromEntries(q.columns.map((cc) => [cc, computeDT(q.dtInputs, cc, db.settings)]))
            const col = q.chosenCol || q.columns[0]
            return sum + quoteTotals(q, dtByCol)[col].sell
          }, 0)
          return (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.address}</p>
                  <p className="text-xs text-slate-400">TIN {c.tin}</p>
                </div>
                <button className="text-xs font-semibold text-navy-700 hover:underline shrink-0" onClick={() => setEditing({ ...c })}>Edit</button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{c.contact}</span> · {c.phone}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <Badge tone="blue">{quotes.length} quote{quotes.length === 1 ? '' : 's'}</Badge>
                  <Badge tone="green">{booked.length} booked</Badge>
                </div>
                <span className="tnum text-sm font-bold text-navy-800">{peso(revenue, 0)}</span>
              </div>
              {quotes.slice(0, 2).map((q) => (
                <Link key={q.id} to={`/quotes/${q.id}`} className="mt-2 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 rounded-lg px-2 py-1.5 -mx-2">
                  <span className="tnum font-semibold text-slate-600">{q.no}</span>
                  <span className="truncate flex-1 text-slate-500">{q.commodity}</span>
                  <QuoteStatusBadge status={q.status} />
                </Link>
              ))}
            </Card>
          )
        })}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit client' : 'New client'}
        footer={<><Button tone="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save} disabled={!editing?.name}>Save</Button></>}>
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company name" className="col-span-2"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="TIN"><Input value={editing.tin} onChange={(e) => setEditing({ ...editing, tin: e.target.value })} /></Field>
            <Field label="Contact person"><Input value={editing.contact} onChange={(e) => setEditing({ ...editing, contact: e.target.value })} /></Field>
            <Field label="Address" className="col-span-2"><Input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></Field>
            <Field label="Email"><Input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  )
}
