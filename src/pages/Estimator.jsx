import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDb, currentFxWeek, nextNo } from '../lib/store'
import { computeDT, defaultDtInputs } from '../lib/compute'
import { chargeTemplate } from '../lib/seed'
import { uid, addDays, isoDate } from '../lib/format'
import { Card, CardHead, Button, PageHeader, Field, Select, NumInput } from '../components/ui'
import { DtForm, DtBreakdown, DtDisclaimer } from '../components/dt'

export default function Estimator() {
  const { db, update, toast } = useDb()
  const nav = useNavigate()
  const week = currentFxWeek(db)
  const [container, setContainer] = useState('20FT')
  const [inputs, setInputs] = useState(() => ({
    ...defaultDtInputs(),
    fxRate: week?.rates?.USD ?? 0,
  }))

  const patch = (p) => setInputs((i) => ({ ...i, ...p }))
  const dt = useMemo(() => computeDT(inputs, container, db.settings), [inputs, container, db.settings])

  const createQuote = () => {
    const id = uid()
    update((d) => {
      const lines = chargeTemplate.map((t) => ({
        id: t.key, label: t.label, kind: t.kind, bocKey: t.bocKey,
        values: t.kind === 'service' ? { [container]: { buy: 0, sell: 0 } } : undefined,
      }))
      d.quotes.unshift({
        id, no: nextNo(d, 'quote'), clientId: d.clients[0]?.id ?? null,
        origin: '', dest: 'Manila (South Harbor)', commodity: inputs.description || 'Imported goods',
        columns: [container], lines, dtInputs: { ...inputs },
        status: 'draft', createdAt: new Date().toISOString(), sentAt: null, approvedAt: null, lostAt: null,
        validUntil: isoDate(addDays(new Date(), d.settings.quoteValidityDays)),
        presentation: 'itemized', signature: null, notes: '', chosenCol: null,
      })
      d.counters.quote += 1
    })
    toast('Draft quotation created from estimate')
    nav(`/quotes/${id}`)
  }

  return (
    <div>
      <PageHeader
        title="Duties & Taxes Estimator"
        sub="BOC formula per CMTA — dutiable value → duty → fees → landed cost → VAT"
      />
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <Card>
          <CardHead title="Shipment inputs" sub={week ? `Applying ${week.cmcNo} (${week.start} – ${week.end})` : ''} />
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Container / lot">
                <Select value={container} onChange={(e) => setContainer(e.target.value)}>
                  <option value="20FT">1×20FT FCL</option>
                  <option value="40FT">1×40FT FCL</option>
                  <option value="LCL">LCL / loose cargo</option>
                </Select>
              </Field>
              <Field label="Arrastre override (₱)" hint="Blank = schedule">
                <NumInput value={inputs.arrastreOverride ?? ''} placeholder="auto"
                  onChange={(v) => patch({ arrastreOverride: v === '' ? null : v })} />
              </Field>
            </div>
            <DtForm inputs={inputs} onPatch={patch} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHead title="Computation" sub="Transparent, line-by-line — every figure editable via inputs" />
            <div className="px-5 pb-4">
              <DtBreakdown dt={dt} inputs={inputs} settings={db.settings} />
              <DtDisclaimer />
            </div>
          </Card>
          <div className="flex gap-2 justify-end">
            <Button tone="ghost" onClick={() => { setInputs({ ...defaultDtInputs(), fxRate: week?.rates?.USD ?? 0 }) }}>
              Reset
            </Button>
            <Button tone="gold" icon="arrow" onClick={createQuote} disabled={!inputs.value || !inputs.fxRate}>
              Create quotation from estimate
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
