import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDb, currentFxWeek, nextNo } from '../lib/store'
import { computeDT, quoteTotals, dtInputsForCol, defaultDtInputs } from '../lib/compute'
import { chargeTemplate } from '../lib/seed'
import { uid, addDays, isoDate } from '../lib/format'
import { Card, CardHead, Button, PageHeader, Field, NumInput, Badge } from '../components/ui'
import { DtForm, DtBreakdown, DtDisclaimer } from '../components/dt'

export default function Estimator() {
  const { db, update, toast } = useDb()
  const nav = useNavigate()
  const week = currentFxWeek(db)
  const [inputs, setInputs] = useState(() => ({ ...defaultDtInputs(), fxRate: week?.rates?.USD ?? 0 }))

  const patch = (p) => setInputs((i) => ({ ...i, ...p }))
  const dt = useMemo(() => computeDT(inputs, db.settings), [inputs, db.settings])
  const totalValue = inputs.items.reduce((a, it) => a + (Number(it.value) || 0), 0)

  const createQuote = () => {
    const id = uid()
    const cols = inputs.mode === 'LCL' ? ['LCL']
      : inputs.mode === 'AIR' ? ['AIR']
      : (inputs.n20 > 0 && inputs.n40 > 0) ? ['20FT', '40FT']
      : (inputs.n40 > 0) ? ['40FT'] : ['20FT']
    update((d) => {
      const lines = chargeTemplate.map((t) => ({
        key: t.key, label: t.label, remark: t.remark, locked: !!t.locked, refundable: !!t.refundable,
        values: t.locked ? undefined : Object.fromEntries(cols.map((c) => [c, c === '40FT' ? (t.d40 ?? 0) : (t.d20 ?? 0)])),
      }))
      const q = {
        id, no: nextNo(d, 'quote'), clientId: d.clients[0]?.id ?? null,
        origin: '', originCountry: '', pickupAddr: '', pol: '', pod: 'Manila (South Harbor)', dest: 'Manila (South Harbor)',
        grossWeight: 0, volume: 0, deliveryProvince: '', deliveryCity: '', deliveryStreet: '', deliveryAddr: '',
        commodity: inputs.items[0]?.description || 'Imported goods',
        columns: cols, lines, dtInputs: { ...inputs, qtyPerCol: Math.max(inputs.n20, inputs.n40, 1) },
        status: 'draft', createdAt: new Date().toISOString(), sentAt: null, approvedAt: null, lostAt: null,
        validUntil: isoDate(addDays(new Date(), d.settings.quoteValidityDays)),
        presentation: 'itemized', signature: null, notes: '', chosenCol: null, finalQuote: {},
      }
      const dtByCol = Object.fromEntries(cols.map((c) => [c, computeDT(dtInputsForCol(q.dtInputs, c), d.settings)]))
      const t = quoteTotals(q, dtByCol)
      cols.forEach((c) => { q.finalQuote[c] = Math.round((t[c].expenses + d.settings.profitFloor) / 1000) * 1000 })
      d.quotes.unshift(q)
      d.counters.quote += 1
    })
    toast('Draft quotation created from estimate')
    nav(`/quotes/${id}`)
  }

  return (
    <div>
      <PageHeader
        title="Duties & Taxes Estimator"
        sub="The computation sheet, digitized — now multi-item (up to 18 tariff lines with prorated freight & insurance)"
        right={dt.multi ? <Badge tone="blue">{dt.itemCount} tariff lines</Badge> : null}
      />
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <Card>
          <CardHead title="Main data" sub={week ? `Applying ${week.cmcNo} — editable` : ''} />
          <div className="p-5">
            <DtForm inputs={inputs} onPatch={patch} />
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
              <Field label="Arrastre override (₱)" hint="Blank = schedule">
                <NumInput value={inputs.arrastreOverride ?? ''} placeholder="auto" onChange={(v) => patch({ arrastreOverride: v === '' ? null : v })} />
              </Field>
              <Field label="Wharfage override (₱)" hint="Blank = schedule">
                <NumInput value={inputs.wharfageOverride ?? ''} placeholder="auto" onChange={(v) => patch({ wharfageOverride: v === '' ? null : v })} />
              </Field>
              <Field label="Brokerage override (₱)" hint="Blank = schedule">
                <NumInput value={inputs.brokerageOverride ?? ''} placeholder="auto" onChange={(v) => patch({ brokerageOverride: v === '' ? null : v })} />
              </Field>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHead title="Customs computation & assessment" sub="Subject to Customs final assessment — line-for-line with the Excel sheet" />
            <div className="px-5 pb-4">
              <DtBreakdown dt={dt} inputs={inputs} settings={db.settings} />
              <DtDisclaimer />
            </div>
          </Card>
          <div className="flex gap-2 justify-end">
            <Button tone="ghost" onClick={() => setInputs({ ...defaultDtInputs(), fxRate: week?.rates?.USD ?? 0 })}>Reset</Button>
            <Button tone="gold" icon="arrow" onClick={createQuote} disabled={!totalValue || !inputs.fxRate}>
              Create quotation from estimate
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
