import { useState } from 'react'
import { useDb } from '../lib/store'
import { peso, uid } from '../lib/format'
import { Card, CardHead, Button, PageHeader, Field, Input, NumInput, Select, Toggle, Badge, Icon, Modal } from '../components/ui'

const emptyTruck = { province: '', cityMunicipality: '', equipment: '20FT', rate: 0 }

export default function Settings() {
  const { db, update, reset, toast } = useDb()
  const s = db.settings
  const fp = s.feePolicy
  const bs = s.brokerageSchedule
  const [advanced, setAdvanced] = useState(fp.ipfLegacySplit)
  const [truck, setTruck] = useState(null)

  const patch = (path, v) => update((d) => {
    const keys = path.split('.')
    let obj = d.settings
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
    obj[keys[keys.length - 1]] = v
  })

  const saveTruck = () => {
    update((d) => {
      const today = new Date().toISOString().slice(0, 10)
      const to = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10)
      if (truck.id) Object.assign(d.truckingRates.find((r) => r.id === truck.id), truck)
      else d.truckingRates.push({ ...truck, id: uid(), validFrom: today, validTo: to })
    })
    toast(truck.id ? 'Trucking rate updated' : 'Trucking rate added'); setTruck(null)
  }
  const delTruck = (id) => { update((d) => { d.truckingRates = d.truckingRates.filter((r) => r.id !== id) }); toast('Trucking rate removed', 'err') }

  return (
    <div>
      <PageHeader title="Settings" sub="Company profile + every fee constant from the brokerage's Excel tools — update as circulars change" />
      <div className="grid xl:grid-cols-2 gap-5 items-start">
        <div className="space-y-5">
          <Card>
            <CardHead title="Company profile" sub="Appears on quotation letterhead" />
            <div className="p-5 grid grid-cols-2 gap-3">
              <Field label="Company name" className="col-span-2"><Input value={s.company.name} onChange={(e) => patch('company.name', e.target.value)} /></Field>
              <Field label="Tagline" className="col-span-2"><Input value={s.company.tagline} onChange={(e) => patch('company.tagline', e.target.value)} /></Field>
              <Field label="Address" className="col-span-2"><Input value={s.company.address} onChange={(e) => patch('company.address', e.target.value)} /></Field>
              <Field label="TIN"><Input value={s.company.tin} onChange={(e) => patch('company.tin', e.target.value)} /></Field>
              <Field label="License / accreditation"><Input value={s.company.ccb} onChange={(e) => patch('company.ccb', e.target.value)} /></Field>
              <Field label="Phone"><Input value={s.company.phone} onChange={(e) => patch('company.phone', e.target.value)} /></Field>
              <Field label="Email"><Input value={s.company.email} onChange={(e) => patch('company.email', e.target.value)} /></Field>
              <Field label="Authorized representative" className="col-span-2"><Input value={s.company.rep} onChange={(e) => patch('company.rep', e.target.value)} /></Field>
            </div>
          </Card>

          <Card>
            <CardHead title="Commercial policy" sub={`Profit range ₱${(s.profitFloor / 1000).toFixed(0)}K–${(s.profitTarget / 1000).toFixed(0)}K per shipment`} />
            <div className="p-5 grid grid-cols-2 gap-3">
              <Field label="Quote validity (days)"><NumInput value={s.quoteValidityDays} onChange={(v) => patch('quoteValidityDays', v || 0)} /></Field>
              <Field label="Downpayment %" hint="Balance due before release"><NumInput value={+(s.dpSplit * 100).toFixed(0)} onChange={(v) => patch('dpSplit', (v || 0) / 100)} /></Field>
              <Field label="Profit floor (₱)"><NumInput value={s.profitFloor} onChange={(v) => patch('profitFloor', v || 0)} /></Field>
              <Field label="Profit target (₱)"><NumInput value={s.profitTarget} onChange={(v) => patch('profitTarget', v || 0)} /></Field>
            </div>
          </Card>

          <Card>
            <CardHead title="Standard dutiable freight (USD)" sub='"LCL-$400 / AIR-$300 / 20FT-$800 / 40FT-$1,200"' />
            <div className="p-5 grid grid-cols-4 gap-3">
              {['LCL', 'AIR', '20FT', '40FT'].map((k) => <Field key={k} label={k}><NumInput value={s.stdFreight[k]} onChange={(v) => patch(`stdFreight.${k}`, v || 0)} /></Field>)}
            </div>
          </Card>

          <Card className="border-red-200">
            <CardHead title="Demo data" />
            <div className="p-5 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Restore the original seeded dataset (quotes, shipments, tariff, FX, trucking, consolidation).</p>
              <Button tone="danger" icon="trash" onClick={() => { reset(); toast('Demo data reset') }}>Reset demo data</Button>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          {/* BROKERAGE SCHEDULE (P1-4) */}
          <Card>
            <CardHead title="Brokerage fee schedule" sub="CAO 1-2001 — choose the schedule your live entries use" />
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => patch('brokerageSchedule.mode', 'formula')}
                  className={`rounded-xl border-2 p-3 text-left ${bs.mode === 'formula' ? 'border-navy-600 bg-navy-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <p className="text-sm font-semibold text-slate-800">Current practice</p>
                  <p className="text-[11px] text-slate-500">DV × {(bs.formula.rate * 100).toFixed(3)}% + ₱{bs.formula.base.toLocaleString()}</p>
                  <Badge tone="green" className="mt-1">matches both workbooks</Badge>
                </button>
                <button onClick={() => patch('brokerageSchedule.mode', 'brackets')}
                  className={`rounded-xl border-2 p-3 text-left ${bs.mode === 'brackets' ? 'border-navy-600 bg-navy-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <p className="text-sm font-semibold text-slate-800">CAO 1-2001 brackets</p>
                  <p className="text-[11px] text-slate-500">Piecewise table by dutiable value</p>
                  <Badge tone="red" className="mt-1">VERIFY before enabling</Badge>
                </button>
              </div>
              {bs.mode === 'formula' ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Base (₱)"><NumInput value={bs.formula.base} onChange={(v) => patch('brokerageSchedule.formula.base', v || 0)} /></Field>
                  <Field label="Rate" hint="0.00125 = 0.125%"><NumInput step="0.0001" value={bs.formula.rate} onChange={(v) => patch('brokerageSchedule.formula.rate', v || 0)} /></Field>
                </div>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 text-[11px] text-red-700">
                  <p className="font-semibold mb-1">Bracket table active (unverified figures)</p>
                  {bs.brackets.map((b, i) => (
                    <div key={i} className="flex justify-between tnum">
                      <span>{b.upTo == null ? '> ₱200,000' : `≤ ${peso(b.upTo, 0)}`}</span>
                      <span>{typeof b.fee === 'object' ? `₱${b.fee.base.toLocaleString()} + ${(b.fee.rateOnExcess * 100).toFixed(3)}% excess` : peso(b.fee, 0)}</span>
                    </div>
                  ))}
                  <p className="mt-1.5 text-slate-500">Confirm the client's schedule for low-value entries at demo, then keep enabled.</p>
                </div>
              )}
            </div>
          </Card>

          {/* BOC FEE POLICY (P2-6) */}
          <Card>
            <CardHead title="BOC fee policy" sub="CDS / IPF / summary quirk — flip on-screen when the client states their practice" />
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="VAT rate %"><NumInput value={+(s.vatRate * 100).toFixed(0)} onChange={(v) => patch('vatRate', (v || 0) / 100)} /></Field>
                <Field label="CDS amount (₱)" hint="Legacy ₱265 · quick tool ₱130"><NumInput value={fp.cds} onChange={(v) => patch('feePolicy.cds', v || 0)} /></Field>
                <Field label="Insurance — general %"><NumInput value={+(s.insuranceGeneral * 100).toFixed(1)} onChange={(v) => patch('insuranceGeneral', (v || 0) / 100)} /></Field>
                <Field label="Insurance — DG %"><NumInput value={+(s.insuranceDG * 100).toFixed(1)} onChange={(v) => patch('insuranceDG', (v || 0) / 100)} /></Field>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <Toggle checked={fp.cdsInSummary} onChange={(v) => patch('feePolicy.cdsInSummary', v)} label="Include CDS in the summary total (ON = current app, OFF = legacy workbook)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="IPF mode">
                  <Select value={fp.ipfMode} onChange={(e) => patch('feePolicy.ipfMode', e.target.value)}>
                    <option value="flat">Flat amount</option>
                    <option value="brackets">CAO 2-2001 brackets</option>
                  </Select>
                </Field>
                {fp.ipfMode === 'flat'
                  ? <Field label="IPF flat (₱)"><NumInput value={fp.ipfFlat} onChange={(v) => patch('feePolicy.ipfFlat', v || 0)} /></Field>
                  : <div className="text-[11px] text-slate-500 self-end pb-2">Brackets: ₱250 / ₱500 / ₱750 / ₱1,000 by DV</div>}
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <Toggle checked={advanced} onChange={(v) => { setAdvanced(v); patch('feePolicy.ipfLegacySplit', v) }} label="Advanced / legacy replication" />
                {advanced && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="IPF in landed cost (₱)" hint="Legacy: differs from summary"><NumInput value={fp.ipfLandedCost} onChange={(v) => patch('feePolicy.ipfLandedCost', v || 0)} /></Field>
                    <p className="text-[11px] text-slate-400 self-end pb-2">Reproduces the old workbook's ₱1,000-in-LC / ₱2,000-billed quirk (Fixture A).</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* PORT CHARGES */}
          <Card>
            <CardHead title="Port charges & CSF" sub="Sheet cells D35–D38" />
            <div className="p-5 grid grid-cols-3 gap-3">
              {['20FT', '40FT', 'LCL'].map((c) => (
                <div key={c} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-bold text-navy-700 mb-2">{c}</p>
                  <Field label="Arrastre ₱"><NumInput className="!py-1 !text-xs" value={s.arrastre[c]} onChange={(v) => patch(`arrastre.${c}`, v || 0)} /></Field>
                  <div className="mt-2"><Field label="Wharfage ₱"><NumInput className="!py-1 !text-xs" value={s.wharfage[c]} onChange={(v) => patch(`wharfage.${c}`, v || 0)} /></Field></div>
                  {c !== 'LCL' && <div className="mt-2"><Field label="CSF ($/cntr)"><NumInput className="!py-1 !text-xs" value={s.csfUsd[c]} onChange={(v) => patch(`csfUsd.${c}`, v || 0)} /></Field></div>}
                </div>
              ))}
            </div>
          </Card>

          {/* TRUCKING TARIFF (P0-2) */}
          <Card>
            <CardHead title="Trucking tariff" sub={`${db.truckingRates.length} rows — SAMPLE, awaiting client sheet`}
              right={<Button size="sm" icon="plus" onClick={() => setTruck({ ...emptyTruck })}>Add rate</Button>} />
            <div className="max-h-[280px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white shadow-[0_1px_0_#E2E8F0]">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2 font-semibold">Province</th><th className="px-2 py-2 font-semibold">City</th>
                    <th className="px-2 py-2 font-semibold">Equip</th><th className="px-2 py-2 font-semibold text-right">Rate</th><th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {db.truckingRates.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-1.5 text-slate-700">{r.province}</td>
                      <td className="px-2 py-1.5 text-slate-600">{r.cityMunicipality}</td>
                      <td className="px-2 py-1.5"><Badge tone="blue">{r.equipment}</Badge></td>
                      <td className="px-2 py-1.5 text-right tnum">{peso(r.rate, 0)}</td>
                      <td className="px-3 py-1.5 text-right">
                        <button className="text-slate-300 hover:text-navy-700 mr-2" onClick={() => setTruck({ ...r })}><Icon name="cog" size={14} /></button>
                        <button className="text-slate-300 hover:text-red-500" onClick={() => delTruck(r.id)}><Icon name="trash" size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={!!truck} onClose={() => setTruck(null)} title={truck?.id ? 'Edit trucking rate' : 'Add trucking rate'}
        footer={<><Button tone="ghost" onClick={() => setTruck(null)}>Cancel</Button><Button onClick={saveTruck} disabled={!truck?.province || !truck?.cityMunicipality}>Save</Button></>}>
        {truck && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Province"><Input value={truck.province} onChange={(e) => setTruck({ ...truck, province: e.target.value })} /></Field>
            <Field label="City / municipality"><Input value={truck.cityMunicipality} onChange={(e) => setTruck({ ...truck, cityMunicipality: e.target.value })} /></Field>
            <Field label="Equipment"><Select value={truck.equipment} onChange={(e) => setTruck({ ...truck, equipment: e.target.value })}>{['20FT', '40FT', 'LCL'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Rate (₱)"><NumInput value={truck.rate} onChange={(v) => setTruck({ ...truck, rate: v || 0 })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  )
}
