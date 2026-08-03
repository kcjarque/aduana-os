import { useDb } from '../lib/store'
import { peso } from '../lib/format'
import { Card, CardHead, Button, PageHeader, Field, Input, NumInput, Icon } from '../components/ui'

export default function Settings() {
  const { db, update, reset, toast } = useDb()
  const s = db.settings

  const patch = (path, v) => update((d) => {
    const keys = path.split('.')
    let obj = d.settings
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
    obj[keys[keys.length - 1]] = v
  })

  return (
    <div>
      <PageHeader title="Settings" sub="Company profile + every BOC fee parameter — update as circulars change" />
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
            <CardHead title="Commercial policy" />
            <div className="p-5 grid grid-cols-3 gap-3">
              <Field label="Quote validity (days)"><NumInput value={s.quoteValidityDays} onChange={(v) => patch('quoteValidityDays', v || 0)} /></Field>
              <Field label="Margin floor %" hint="Below this → checker approval">
                <NumInput value={+(s.marginFloor * 100).toFixed(1)} onChange={(v) => patch('marginFloor', (v || 0) / 100)} />
              </Field>
              <Field label="Downpayment %" hint="Balance due before release">
                <NumInput value={+(s.dpSplit * 100).toFixed(0)} onChange={(v) => patch('dpSplit', (v || 0) / 100)} />
              </Field>
            </div>
          </Card>

          <Card className="border-red-200">
            <CardHead title="Demo data" />
            <div className="p-5 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Restore the original seeded dataset (quotes, shipments, tariff lines, FX weeks).</p>
              <Button tone="danger" icon="trash" onClick={() => { reset(); toast('Demo data reset') }}>Reset demo data</Button>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHead title="BOC fee parameters" sub="CAO 1-2001 / CAO 2-2001 / CMO lineage — verify against current circulars" />
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Field label="VAT rate %"><NumInput value={+(s.vatRate * 100).toFixed(0)} onChange={(v) => patch('vatRate', (v || 0) / 100)} /></Field>
                <Field label="CDS (₱)"><NumInput value={s.cds} onChange={(v) => patch('cds', v || 0)} /></Field>
                <Field label="IPF max (₱)"><NumInput value={s.ipfMax} onChange={(v) => patch('ipfMax', v || 0)} /></Field>
                <Field label="Insurance — general %"><NumInput value={+(s.insuranceGeneral * 100).toFixed(1)} onChange={(v) => patch('insuranceGeneral', (v || 0) / 100)} /></Field>
                <Field label="Insurance — DG %"><NumInput value={+(s.insuranceDG * 100).toFixed(1)} onChange={(v) => patch('insuranceDG', (v || 0) / 100)} /></Field>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Brokerage fee schedule (by dutiable value)</p>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {s.brokerageBrackets.map((b, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-1.5 text-sm">
                      <span className="text-slate-500 flex-1">DV ≤ {peso(b.upTo, 0)}</span>
                      <NumInput className="!w-28 !py-1 !text-xs" value={b.fee}
                        onChange={(v) => update((d) => { d.settings.brokerageBrackets[i].fee = v || 0 })} />
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-50">
                    <span className="text-slate-500 flex-1">Above {peso(s.brokerageExcessOver, 0)}:</span>
                    <NumInput className="!w-24 !py-1 !text-xs" value={s.brokerageExcessBase} onChange={(v) => patch('brokerageExcessBase', v || 0)} />
                    <span className="text-slate-400 text-xs">+</span>
                    <NumInput className="!w-20 !py-1 !text-xs" step="0.0001" value={s.brokerageExcessRate} onChange={(v) => patch('brokerageExcessRate', v || 0)} />
                    <span className="text-slate-400 text-xs">× excess</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Import Processing Fee brackets</p>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {s.ipfBrackets.map((b, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-1.5 text-sm">
                      <span className="text-slate-500 flex-1">DV ≤ {peso(b.upTo, 0)}</span>
                      <NumInput className="!w-28 !py-1 !text-xs" value={b.fee}
                        onChange={(v) => update((d) => { d.settings.ipfBrackets[i].fee = v || 0 })} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Port charges per container (sample — verify vs PPA/terminal tariff)</p>
                <div className="grid grid-cols-3 gap-3">
                  {['20FT', '40FT', 'LCL'].map((c) => (
                    <div key={c} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs font-bold text-navy-700 mb-2">{c}</p>
                      <Field label="Arrastre ₱"><NumInput className="!py-1 !text-xs" value={s.arrastre[c]} onChange={(v) => patch(`arrastre.${c}`, v || 0)} /></Field>
                      <div className="mt-2">
                        <Field label="Wharfage ₱"><NumInput className="!py-1 !text-xs" value={s.wharfage[c]} onChange={(v) => patch(`wharfage.${c}`, v || 0)} /></Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
                <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
                Figures follow CAO 1-2001 (brokerage), CAO 2-2001 (IPF), CMO 30-2019 lineage (CDS ₱280) and PPA
                schedules. BOC updates these periodically — verify before go-live.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
