import { useMemo, useState } from 'react'
import { useDb, currentFxWeek } from '../lib/store'
import { peso, uid } from '../lib/format'
import { Card, CardHead, Button, PageHeader, Badge, Icon, NumInput, Input, Select } from '../components/ui'

// Client's "CONSOLIDATION CALCU FOR LCL & FCL.xlsx": rows of
// rate × qty × (E.R. or days) grouped by Origin / Destination / Warehouse,
// with 12% VAT applied to the flagged rows of a group.
const rowAmount = (r) => (Number(r.rate) || 0) * (Number(r.qty) || 0) * (Number(r.fx) || 1)

export default function Consolidation() {
  const { db, update, toast } = useDb()
  const [tab, setTab] = useState('LCL')
  const week = currentFxWeek(db)
  const groups = db.consolidation?.[tab] ?? []

  const totals = useMemo(() => {
    let grand = 0
    const byGroup = groups.map((g) => {
      const sub = g.rows.reduce((a, r) => a + rowAmount(r), 0)
      const vat = g.vatOnGroup ? g.rows.filter((r) => r.vatable).reduce((a, r) => a + rowAmount(r), 0) * db.settings.vatRate : 0
      grand += sub + vat
      return { id: g.id, title: g.title, sub, vat, total: sub + vat }
    })
    return { byGroup, grand }
  }, [groups, db.settings.vatRate])

  const patchRow = (gid, rid, p) => update((d) => {
    const r = d.consolidation[tab].find((g) => g.id === gid).rows.find((x) => x.id === rid)
    Object.assign(r, p)
  })
  const addRow = (gid) => update((d) => {
    d.consolidation[tab].find((g) => g.id === gid).rows.push({
      id: uid(), label: 'New charge', currency: 'PHP', rate: 0, qty: 1, unit: 'SET', fx: 1, vatable: false,
    })
  })
  const removeRow = (gid, rid) => update((d) => {
    const g = d.consolidation[tab].find((x) => x.id === gid)
    g.rows = g.rows.filter((r) => r.id !== rid)
  })
  const syncFx = () => {
    update((d) => {
      d.consolidation[tab].forEach((g) => g.rows.forEach((r) => { if (r.currency === 'USD') r.fx = week?.rates?.USD ?? r.fx }))
    })
    toast(`USD rows synced to E.R. ₱${week?.rates?.USD}`)
  }

  return (
    <div>
      <PageHeader
        title="Consolidation Calculator"
        sub="The LCL & FCL costing worksheet, digitized — rate × qty × E.R./days per charge, VAT applied per group"
        right={<>
          <Button tone="ghost" size="sm" icon="fx" onClick={syncFx}>Sync USD rows to current E.R.</Button>
          <div className="flex rounded-xl border border-slate-300 overflow-hidden">
            {['LCL', 'FCL'].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-navy-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {t}
              </button>
            ))}
          </div>
        </>}
      />

      <div className="grid xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 space-y-5">
          {groups.map((g) => (
            <Card key={g.id}>
              <CardHead
                title={g.title}
                right={g.vatOnGroup ? <Badge tone="gold">VAT 12% on flagged rows</Badge> : null}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                      <th className="px-5 py-2 font-semibold">Charge</th>
                      <th className="px-2 py-2 font-semibold w-20">Curr.</th>
                      <th className="px-2 py-2 font-semibold w-24 text-right">Rate</th>
                      <th className="px-2 py-2 font-semibold w-20 text-right">Qty</th>
                      <th className="px-2 py-2 font-semibold w-24">Unit</th>
                      <th className="px-2 py-2 font-semibold w-24 text-right">E.R. / Days</th>
                      <th className="px-2 py-2 font-semibold w-16 text-center">VAT?</th>
                      <th className="px-3 py-2 font-semibold w-28 text-right">Amount (₱)</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {g.rows.map((r) => (
                      <tr key={r.id} className="group">
                        <td className="px-5 py-1.5">
                          <input className="w-full bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1 -mx-1 text-slate-800"
                            value={r.label} onChange={(e) => patchRow(g.id, r.id, { label: e.target.value })} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Select className="!px-2 !py-1 !text-xs !rounded-lg" value={r.currency}
                            onChange={(e) => {
                              const currency = e.target.value
                              patchRow(g.id, r.id, { currency, fx: currency === 'USD' ? (week?.rates?.USD ?? 1) : 1 })
                            }}>
                            <option>PHP</option><option>USD</option>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5"><NumInput className="!px-2 !py-1 !text-xs !rounded-lg" value={r.rate} onChange={(v) => patchRow(g.id, r.id, { rate: v })} /></td>
                        <td className="px-2 py-1.5"><NumInput className="!px-2 !py-1 !text-xs !rounded-lg" value={r.qty} onChange={(v) => patchRow(g.id, r.id, { qty: v })} /></td>
                        <td className="px-2 py-1.5">
                          <Input className="!px-2 !py-1 !text-xs !rounded-lg" value={r.unit} onChange={(e) => patchRow(g.id, r.id, { unit: e.target.value })} />
                        </td>
                        <td className="px-2 py-1.5"><NumInput className="!px-2 !py-1 !text-xs !rounded-lg" step="0.01" value={r.fx} onChange={(v) => patchRow(g.id, r.id, { fx: v })} /></td>
                        <td className="px-2 py-1.5 text-center">
                          <input type="checkbox" className="accent-navy-700 w-4 h-4" checked={!!r.vatable}
                            disabled={!g.vatOnGroup}
                            onChange={(e) => patchRow(g.id, r.id, { vatable: e.target.checked })} />
                        </td>
                        <td className="px-3 py-1.5 text-right tnum font-semibold text-slate-800">{peso(rowAmount(r), 2)}</td>
                        <td className="pr-3">
                          <button onClick={() => removeRow(g.id, r.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500">
                            <Icon name="trash" size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {g.vatOnGroup && (
                      <tr className="border-t border-slate-100">
                        <td colSpan={7} className="px-5 py-2 text-xs text-slate-500">VAT 12% (on flagged rows)</td>
                        <td className="px-3 py-2 text-right tnum text-slate-600">{peso(totals.byGroup.find((x) => x.id === g.id)?.vat ?? 0, 2)}</td>
                        <td />
                      </tr>
                    )}
                    <tr className="border-t border-slate-200 bg-slate-50/60">
                      <td colSpan={7} className="px-5 py-2.5 font-semibold text-slate-900">{g.title} subtotal</td>
                      <td className="px-3 py-2.5 text-right tnum font-bold text-navy-800">{peso(totals.byGroup.find((x) => x.id === g.id)?.total ?? 0, 2)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="px-5 py-2.5 border-t border-slate-100">
                <Button tone="ghost" size="sm" icon="plus" onClick={() => addRow(g.id)}>Add charge</Button>
              </div>
            </Card>
          ))}
        </div>

        {/* estimated summary */}
        <Card className="sticky top-20">
          <CardHead title={`Estimated — ${tab}`} sub="Mirrors the sheet's summary block" />
          <div className="p-5 space-y-2">
            {totals.byGroup.map((g) => (
              <div key={g.id} className="flex justify-between text-sm">
                <span className="text-slate-600">{g.title}</span>
                <span className="tnum font-semibold text-slate-800">{peso(g.total, 2)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 mt-2 border-t border-slate-200">
              <span className="font-bold text-navy-900">TOTAL ESTIMATE</span>
              <span className="tnum font-bold text-lg text-navy-900">{peso(totals.grand, 2)}</span>
            </div>
            <p className="flex items-start gap-1.5 text-[11px] text-slate-400 pt-2">
              <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
              Cost estimate for consolidation shipments — duties & taxes are computed separately in the
              D&T Estimator and quoted via the inquiry tool.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
