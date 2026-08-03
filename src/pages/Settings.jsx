import { useDb } from '../lib/store'
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
            <CardHead title="Commercial policy" sub={`Inquiry-tool guidance: profit range ₱${(s.profitFloor / 1000).toFixed(0)}K–${(s.profitTarget / 1000).toFixed(0)}K per shipment`} />
            <div className="p-5 grid grid-cols-2 gap-3">
              <Field label="Quote validity (days)"><NumInput value={s.quoteValidityDays} onChange={(v) => patch('quoteValidityDays', v || 0)} /></Field>
              <Field label="Downpayment %" hint="Balance due before release">
                <NumInput value={+(s.dpSplit * 100).toFixed(0)} onChange={(v) => patch('dpSplit', (v || 0) / 100)} />
              </Field>
              <Field label="Profit floor (₱)" hint="Below this → warning banner">
                <NumInput value={s.profitFloor} onChange={(v) => patch('profitFloor', v || 0)} />
              </Field>
              <Field label="Profit target (₱)">
                <NumInput value={s.profitTarget} onChange={(v) => patch('profitTarget', v || 0)} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHead title="Standard dutiable freight (USD)" sub='From the computation sheet: "LCL-$400 / AIR-$300 / 20FT-$800 / 40FT-$1,200"' />
            <div className="p-5 grid grid-cols-4 gap-3">
              {['LCL', 'AIR', '20FT', '40FT'].map((k) => (
                <Field key={k} label={k}><NumInput value={s.stdFreight[k]} onChange={(v) => patch(`stdFreight.${k}`, v || 0)} /></Field>
              ))}
            </div>
          </Card>

          <Card className="border-red-200">
            <CardHead title="Demo data" />
            <div className="p-5 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Restore the original seeded dataset (quotes, shipments, tariff lines, FX weeks, consolidation).</p>
              <Button tone="danger" icon="trash" onClick={() => { reset(); toast('Demo data reset') }}>Reset demo data</Button>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHead title="BOC fee constants" sub="Line-for-line with the brokerage's computation sheets — verify vs current CAO/CMO" />
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Field label="VAT rate %"><NumInput value={+(s.vatRate * 100).toFixed(0)} onChange={(v) => patch('vatRate', (v || 0) / 100)} /></Field>
                <Field label="CDS (₱)" hint="Legacy tool ₱265 · quick tool ₱130">
                  <NumInput value={s.cds} onChange={(v) => patch('cds', v || 0)} />
                </Field>
                <Field label="IPF (₱)" hint="Flat std; CAO 2-2001 brackets 250–1,000">
                  <NumInput value={s.ipf} onChange={(v) => patch('ipf', v || 0)} />
                </Field>
                <Field label="Insurance — general %"><NumInput value={+(s.insuranceGeneral * 100).toFixed(1)} onChange={(v) => patch('insuranceGeneral', (v || 0) / 100)} /></Field>
                <Field label="Insurance — DG %"><NumInput value={+(s.insuranceDG * 100).toFixed(1)} onChange={(v) => patch('insuranceDG', (v || 0) / 100)} /></Field>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Brokerage fee (CAO 1-2001, as applied): DV × rate + base
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Base (₱)"><NumInput value={s.brokerageBase} onChange={(v) => patch('brokerageBase', v || 0)} /></Field>
                  <Field label="Rate" hint="0.00125 = 0.125%"><NumInput step="0.0001" value={s.brokerageRate} onChange={(v) => patch('brokerageRate', v || 0)} /></Field>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Port charges (sheet cells D35–D38) & CSF
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {['20FT', '40FT', 'LCL'].map((c) => (
                    <div key={c} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs font-bold text-navy-700 mb-2">{c}</p>
                      <Field label="Arrastre ₱"><NumInput className="!py-1 !text-xs" value={s.arrastre[c]} onChange={(v) => patch(`arrastre.${c}`, v || 0)} /></Field>
                      <div className="mt-2">
                        <Field label="Wharfage ₱"><NumInput className="!py-1 !text-xs" value={s.wharfage[c]} onChange={(v) => patch(`wharfage.${c}`, v || 0)} /></Field>
                      </div>
                      {c !== 'LCL' && (
                        <div className="mt-2">
                          <Field label="CSF (USD/cntr)"><NumInput className="!py-1 !text-xs" value={s.csfUsd[c]} onChange={(v) => patch(`csfUsd.${c}`, v || 0)} /></Field>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
                <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
                Constants imported from "COMPUTATION OF DUTIES & TAXES.xlsx" and the legacy DT Calculator:
                brokerage = DV × 0.125% + ₱5,050 · arrastre ₱3,727/₱8,551 · wharfage ₱519.35/₱779.05 ·
                CSF $5/$10 per container. BOC updates these periodically — verify before go-live.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
