import { useMemo, useRef, useState } from 'react'
import { useDb, currentFxWeek } from '../lib/store'
import { peso, num } from '../lib/format'
import { Field, Input, NumInput, Select, Toggle, Badge, Icon } from './ui'

// ---------------- AHTN combobox ----------------
export function AhtnPicker({ inputs, onPatch }) {
  const { db } = useDb()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const boxRef = useRef(null)

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return db.tariffLines.slice(0, 8)
    return db.tariffLines
      .filter((t) => t.code.toLowerCase().includes(s) || t.description.toLowerCase().includes(s))
      .slice(0, 8)
  }, [db.tariffLines, q])

  const pick = (t) => {
    const basis = inputs.basis || 'mfn'
    onPatch({ ahtnCode: t.code, description: t.description, dutyRate: t[basis] ?? t.mfn })
    setOpen(false)
    setQ('')
  }

  return (
    <div className="relative" ref={boxRef}>
      <Field label="Commodity / AHTN 2022 code">
        <Input
          value={open ? q : (inputs.ahtnCode ? `${inputs.ahtnCode} — ${inputs.description}` : '')}
          placeholder="Search description or 8-digit code…"
          onFocus={() => { setOpen(true); setQ('') }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => setQ(e.target.value)}
        />
      </Field>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl card-shadow-lg overflow-hidden">
          {results.length === 0 && <p className="px-3 py-2.5 text-sm text-slate-500">No matching tariff lines.</p>}
          {results.map((t) => (
            <button
              key={t.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(t) }}
              className="w-full text-left px-3 py-2 hover:bg-navy-50 flex items-center justify-between gap-3"
            >
              <span className="text-sm text-slate-800 truncate">
                <span className="tnum font-semibold text-navy-800">{t.code}</span>
                <span className="text-slate-500"> · {t.description}</span>
              </span>
              <span className="tnum text-xs text-slate-500 shrink-0">MFN {(t.mfn * 100).toFixed(0)}%</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------- D&T input form ----------------
export function DtForm({ inputs, onPatch, compact = false }) {
  const { db } = useDb()
  const week = currentFxWeek(db)
  const tariff = db.tariffLines.find((t) => t.code === inputs.ahtnCode)

  const setBasis = (basis) => {
    const patch = { basis }
    if (tariff) patch.dutyRate = tariff[basis] ?? tariff.mfn
    onPatch(patch)
  }
  const setCurrency = (currency) => onPatch({ currency, fxRate: week?.rates?.[currency] ?? inputs.fxRate })

  return (
    <div className="space-y-4">
      <AhtnPicker inputs={inputs} onPatch={onPatch} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Duty basis">
          <Select value={inputs.basis} onChange={(e) => setBasis(e.target.value)}>
            <option value="mfn">MFN</option>
            <option value="atiga">ATIGA (Form D)</option>
            <option value="acfta">ACFTA (Form E)</option>
            <option value="rcep">RCEP</option>
          </Select>
        </Field>
        <Field label="Duty rate %" hint={tariff ? `Book: MFN ${(tariff.mfn * 100).toFixed(0)} / ATIGA ${(tariff.atiga * 100).toFixed(0)} / ACFTA ${(tariff.acfta * 100).toFixed(0)} / RCEP ${(tariff.rcep * 100).toFixed(0)}` : 'Editable override'}>
          <NumInput value={inputs.dutyRate === '' ? '' : +(inputs.dutyRate * 100).toFixed(4)} step="0.5"
            onChange={(v) => onPatch({ dutyRate: v === '' ? '' : v / 100 })} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Incoterm">
          <Select value={inputs.incoterm} onChange={(e) => onPatch({ incoterm: e.target.value })}>
            {['EXW', 'FOB', 'FCA', 'CFR', 'CIF'].map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Currency">
          <Select value={inputs.currency} onChange={(e) => setCurrency(e.target.value)}>
            {db.settings.currencies.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="BOC rate (₱)" hint={week ? `${week.cmcNo}` : ''}>
          <NumInput value={inputs.fxRate} step="0.01" onChange={(v) => onPatch({ fxRate: v })} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={`Invoice value (${inputs.currency})`}>
          <NumInput value={inputs.value} onChange={(v) => onPatch({ value: v })} />
        </Field>
        <Field label={`Freight (${inputs.currency})`} hint={inputs.incoterm === 'CIF' ? 'Included in CIF value' : ''}>
          <NumInput value={inputs.freight} disabled={inputs.incoterm === 'CIF'} onChange={(v) => onPatch({ freight: v })} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Insurance">
          <Select value={inputs.insuranceMode} onChange={(e) => onPatch({ insuranceMode: e.target.value })}>
            <option value="general">2% of FOB — general cargo</option>
            <option value="dg">4% of FOB — dangerous cargo</option>
            <option value="actual">Actual premium</option>
          </Select>
        </Field>
        {inputs.insuranceMode === 'actual' ? (
          <Field label={`Premium (${inputs.currency})`}>
            <NumInput value={inputs.insuranceActual} onChange={(v) => onPatch({ insuranceActual: v })} />
          </Field>
        ) : (
          <Field label="Bank charges (₱)" hint="If via L/C">
            <NumInput value={inputs.bankCharges} onChange={(v) => onPatch({ bankCharges: v })} />
          </Field>
        )}
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-3">
          {inputs.insuranceMode === 'actual' && (
            <Field label="Bank charges (₱)" hint="If via L/C">
              <NumInput value={inputs.bankCharges} onChange={(v) => onPatch({ bankCharges: v })} />
            </Field>
          )}
          <Field label="Excise tax (₱)" hint="Manual, if excisable (ATRIG)">
            <NumInput value={inputs.excise} onChange={(v) => onPatch({ excise: v })} />
          </Field>
          <Field label="No. of containers">
            <NumInput value={inputs.qty} min="1" onChange={(v) => onPatch({ qty: v })} />
          </Field>
        </div>
      )}

      <Toggle checked={!!inputs.vatExempt} onChange={(v) => onPatch({ vatExempt: v })} label="VAT-exempt importation" />
    </div>
  )
}

// ---------------- breakdown waterfall ----------------
const Row = ({ label, hint, value, strong, tone }) => (
  <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? 'border-t border-slate-200 mt-1 pt-2.5' : ''}`}>
    <div>
      <span className={`${strong ? 'font-semibold text-slate-900' : 'text-slate-600'} text-sm`}>{label}</span>
      {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
    </div>
    <span className={`tnum text-sm ${strong ? 'font-bold text-base' : ''} ${tone === 'gold' ? 'text-gold-600' : tone === 'navy' ? 'text-navy-800' : 'text-slate-800'}`}>
      {value}
    </span>
  </div>
)

export function DtBreakdown({ dt, inputs, settings }) {
  if (!dt) return null
  return (
    <div>
      <Row label={`Dutiable value (${inputs.incoterm} basis)`}
        hint={`${num(dt.dutiableFx)} ${inputs.currency} × ₱${num(dt.fx, 4)}${dt.insurance ? ` · insurance ${num(dt.insurance)} ${inputs.currency}` : ''}`}
        value={peso(dt.dv)} />
      <Row label="Customs duty" hint={`DV × ${(Number(inputs.dutyRate || 0) * 100).toFixed(2)}% (${(inputs.basis || 'mfn').toUpperCase()})`} value={peso(dt.duty)} />
      <Row label="Brokerage fee" hint="CAO 1-2001 schedule" value={peso(dt.brokerage)} />
      <Row label="Arrastre" hint={`${dt.qty}×${dt.containerType}`} value={peso(dt.arrastre)} />
      <Row label="Wharfage" hint={`${dt.qty}×${dt.containerType}`} value={peso(dt.wharfage)} />
      <Row label="Import Processing Fee" hint="CAO 2-2001 bracket" value={peso(dt.ipf)} />
      <Row label="Customs Documentary Stamp" value={peso(dt.cds)} />
      {dt.bank > 0 && <Row label="Bank charges" value={peso(dt.bank)} />}
      {dt.excise > 0 && <Row label="Excise tax" value={peso(dt.excise)} />}
      <Row label="Total landed cost (VAT base)" strong value={peso(dt.landedCost)} />
      <Row label={`VAT ${inputs.vatExempt ? '(exempt)' : `(${(settings.vatRate * 100).toFixed(0)}%)`}`} hint="Landed cost × 12%" value={peso(dt.vat)} />
      <Row label="Payable to BOC" hint="Duty + VAT + excise + CDS + IPF (SSDT)" strong tone="gold" value={peso(dt.totalBoc)} />
      <Row label="Total incl. port & brokerage" hint="+ arrastre, wharfage, brokerage, bank" strong tone="navy" value={peso(dt.totalCharges)} />
    </div>
  )
}

export function DtDisclaimer() {
  return (
    <p className="flex items-start gap-1.5 text-[11px] text-slate-400 mt-3">
      <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
      Estimate only. Port charges and fee schedules are configurable in Settings and must be verified
      against current BOC CAO/CMO and PPA tariffs. Final assessment per BOC e2m/CPS.
    </p>
  )
}

export function FxChip() {
  const { db } = useDb()
  const week = currentFxWeek(db)
  if (!week) return null
  return (
    <Badge tone="blue" className="!text-xs">
      <Icon name="fx" size={13} />
      USD {num(week.rates.USD, 2)} · {week.cmcNo}
    </Badge>
  )
}
