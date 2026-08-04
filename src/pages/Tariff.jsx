import { useMemo, useState } from 'react'
import { useDb } from '../lib/store'
import { uid } from '../lib/format'
import { Card, Button, PageHeader, SearchInput, Badge, Modal, Field, Input, NumInput, Icon, EmptyState } from '../components/ui'

const emptyLine = { code: '', description: '', mfn: 0, atiga: 0, acfta: 0, rcep: 0, note: '', source: 'FAVORITES' }
const P = ({ v }) => <span className="tnum">{(v * 100).toFixed(v * 100 % 1 ? 1 : 0)}%</span>

export default function Tariff() {
  const { db, update, toast } = useDb()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return db.tariffLines
      .filter((t) => !s || t.code.toLowerCase().includes(s) || t.description.toLowerCase().includes(s))
      .sort((a, b) => (a.source === 'FAVORITES' ? 0 : 1) - (b.source === 'FAVORITES' ? 0 : 1))
  }, [db.tariffLines, q])

  const save = () => {
    update((d) => {
      if (editing.id) Object.assign(d.tariffLines.find((t) => t.id === editing.id), editing)
      else d.tariffLines.unshift({ ...editing, id: uid() })
    })
    toast('Tariff line saved')
    setEditing(null)
  }

  const pctField = (key, label) => (
    <Field label={label}>
      <NumInput value={+(editing[key] * 100).toFixed(2)} step="0.5" onChange={(v) => setEditing({ ...editing, [key]: (v || 0) / 100 })} />
    </Field>
  )

  return (
    <div>
      <PageHeader
        title="Tariff Library — AHTN 2022"
        sub="MFN + preferential schedules · duty rates auto-fill the estimator"
        right={<>
          <SearchInput value={q} onChange={setQ} placeholder="Search code or commodity…" />
          <Button icon="plus" onClick={() => setEditing({ ...emptyLine })}>Add line</Button>
        </>}
      />

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-navy-100 bg-navy-50 px-4 py-3 text-xs text-navy-800">
        <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
        <span>
          Seeded from the brokerage's own <b>"Frequently Used Tariff Headings" list ({db.tariffLines.length} lines)</b> —
          T.R. as MFN; preferential columns default to <b>0% (Form-E/D practice)</b> and must be verified per line.
          Full dataset: request the public-domain AHTN 2022 schedule from the <b>Tariff Commission</b>{' '}
          (TC.Assist@mail.tariffcommission.gov.ph); rates change by Executive Order.
        </span>
      </div>

      <Card>
        {rows.length === 0 ? <EmptyState icon="book" title="No tariff lines match" /> : (
          <div className="max-h-[62vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white shadow-[0_1px_0_#E2E8F0]">
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-semibold">AHTN code</th>
                  <th className="px-3 py-3 font-semibold">Description</th>
                  <th className="px-3 py-3 font-semibold text-right">MFN</th>
                  <th className="px-3 py-3 font-semibold text-right">ATIGA</th>
                  <th className="px-3 py-3 font-semibold text-right">ACFTA</th>
                  <th className="px-3 py-3 font-semibold text-right">RCEP</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 tnum font-semibold text-navy-700">
                      <span className="inline-flex items-center gap-1.5">
                        {t.source === 'FAVORITES' && <span className="text-gold-500" title="Frequently used">★</span>}
                        {t.code}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {t.description}
                      {t.note && <Badge tone="amber" className="ml-2">{t.note}</Badge>}
                      {t.source === 'TARIFF_BOOK_2022' && <Badge tone="slate" className="ml-2">book</Badge>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold"><P v={t.mfn} /></td>
                    <td className="px-3 py-2.5 text-right text-emerald-700"><P v={t.atiga} /></td>
                    <td className="px-3 py-2.5 text-right text-slate-600"><P v={t.acfta} /></td>
                    <td className="px-3 py-2.5 text-right text-slate-600"><P v={t.rcep} /></td>
                    <td className="px-5 py-2.5 text-right">
                      <button className="text-slate-300 hover:text-navy-700" onClick={() => setEditing({ ...t })}><Icon name="cog" size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${editing.code}` : 'Add tariff line'}
        footer={<><Button tone="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save} disabled={!editing?.code}>Save</Button></>}>
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="AHTN code (8-digit)"><Input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="8471.30.10" /></Field>
            <Field label="Note / flag"><Input value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} placeholder="e.g. MAV in-quota" /></Field>
            <Field label="Description" className="col-span-2"><Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
            {pctField('mfn', 'MFN %')}
            {pctField('atiga', 'ATIGA %')}
            {pctField('acfta', 'ACFTA %')}
            {pctField('rcep', 'RCEP %')}
          </div>
        )}
      </Modal>
    </div>
  )
}
