import { useMemo, useState } from 'react'
import { useDb, currentFxWeek } from '../lib/store'
import { peso, num } from '../lib/format'
import { stdFreightUsd } from '../lib/compute'
import { Field, Input, NumInput, Select, Toggle, Badge, Icon, Button } from './ui'

// ---------------- AHTN combobox ----------------
export function AhtnPicker({ inputs, onPatch }) {
  const { db } = useDb()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

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
    <div className="relative">
      <Field label="Commodity / H.S. code (AHTN 2022)">
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
              <span className="tnum text-xs text-slate-500 shrink-0">T.R. {(t.mfn * 100).toFixed(0)}%</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------- D&T input form (mirrors the client's MAIN DATA block) ----------------
export function DtForm({ inputs, onPatch, compact = false }) {
  const { db } = useDb()
  const week = currentFxWeek(db)
  const s = db.settings
  const tariff = db.tariffLines.find((t) => t.code === inputs.ahtnCode)

  const setBasis = (basis) => {
    const patch = { basis }
    if (tariff) patch.dutyRate = tariff[basis] ?? tariff.mfn
    onPatch(patch)
  }
  const setCurrency = (currency) => onPatch({ currency, fxRate: week?.rates?.[currency] ?? inputs.fxRate })
  const applyStdFreight = () => onPatch({ freight: stdFreightUsd(inputs, s) })

  return (
    <div className="space-y-4">
      <AhtnPicker inputs={inputs} onPatch={onPatch} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Duty basis">
          <Select value={inputs.basis} onChange={(e) => setBasis(e.target.value)}>
            <option value="mfn">MFN (no C.O.)</option>
            <option value="acfta">ACFTA — Form E</option>
            <option value="atiga">ATIGA — Form D</option>
            <option value="rcep">RCEP</option>
          </Select>
        </Field>
        <Field label="Tariff rate %" hint={tariff ? `Book: T.R. ${(tariff.mfn * 100).toFixed(0)}% · 0% if with Form-E (verify)` : 'Editable override'}>
          <NumInput value={inputs.dutyRate === '' ? '' : +(inputs.dutyRate * 100).toFixed(4)} step="0.5"
            onChange={(v) => onPatch({ dutyRate: v === '' ? '' : v / 100 })} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Incoterms">
          <Select value={inputs.incoterm} onChange={(e) => onPatch({ incoterm: e.target.value })}>
            {['EXWORKS', 'FOB', 'FCA', 'CFR', 'CIF', 'DDP'].map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Currency">
          <Select value={inputs.currency} onChange={(e) => setCurrency(e.target.value)}>
            {s.currencies.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Exchange rate (₱)" hint={week ? week.cmcNo : ''}>
          <NumInput value={inputs.fxRate} step="0.01" onChange={(v) => onPatch({ fxRate: v })} />
        </Field>
      </div>

      {!compact && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Shipment mode">
            <Select value={inputs.mode} onChange={(e) => onPatch({ mode: e.target.value })}>
              <option value="FCL">FCL (containerized)</option>
              <option value="LCL">LCL (consolidation)</option>
              <option value="AIR">Via Air</option>
            </Select>
          </Field>
          <Field label="No. of 20FT cntr.">
            <NumInput value={inputs.n20} min="0" disabled={inputs.mode !== 'FCL'} onChange={(v) => onPatch({ n20: v })} />
          </Field>
          <Field label="No. of 40FT cntr.">
            <NumInput value={inputs.n40} min="0" disabled={inputs.mode !== 'FCL'} onChange={(v) => onPatch({ n40: v })} />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label={`Total value (${inputs.currency})`}>
          <NumInput value={inputs.value} onChange={(v) => onPatch({ value: v })} />
        </Field>
        <Field label={`Dutiable freight (${inputs.currency})`}
          hint={inputs.incoterm === 'CIF' ? 'Included in CIF value' : `Standard: LCL $${s.stdFreight.LCL} / AIR $${s.stdFreight.AIR} / 20FT $${s.stdFreight['20FT']} / 40FT $${s.stdFreight['40FT']}`}>
          <div className="flex gap-1.5">
            <NumInput value={inputs.freight} disabled={inputs.incoterm === 'CIF'} onChange={(v) => onPatch({ freight: v })} />
            {inputs.incoterm !== 'CIF' && (
              <Button tone="ghost" size="sm" className="shrink-0 !px-2" title="Apply standard dutiable freight" onClick={applyStdFreight}>Std</Button>
            )}
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Dutiable insurance">
          <Select value={inputs.insuranceMode} onChange={(e) => onPatch({ insuranceMode: e.target.value })}>
            <option value="general">2% of value — gen. cargo</option>
            <option value="dg">4% of value — dangerous cargo</option>
            <option value="actual">Actual premium</option>
          </Select>
        </Field>
        {inputs.insuranceMode === 'actual' ? (
          <Field label={`Premium (${inputs.currency})`}>
            <NumInput value={inputs.insuranceActual} onChange={(v) => onPatch({ insuranceActual: v })} />
          </Field>
        ) : (
          <Field label="Bank charge (₱)" hint="If via L/C">
            <NumInput value={inputs.bankCharges} onChange={(v) => onPatch({ bankCharges: v })} />
          </Field>
        )}
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-3">
          {inputs.insuranceMode === 'actual' && (
            <Field label="Bank charge (₱)" hint="If via L/C">
              <NumInput value={inputs.bankCharges} onChange={(v) => onPatch({ bankCharges: v })} />
            </Field>
          )}
          <Field label="Excise tax (₱)" hint="If any (ATRIG goods)">
            <NumInput value={inputs.excise} onChange={(v) => onPatch({ excise: v })} />
          </Field>
        </div>
      )}

      <Toggle checked={!!inputs.vatExempt} onChange={(v) => onPatch({ vatExempt: v })} label="VAT-exempt importation" />
    </div>
  )
}

// ---------------- breakdown — mirrors the client's computation sheet ----------------
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
  const cntrs = dt.mode === 'FCL' ? `${dt.n20}×20FT${dt.n40 ? ` + ${dt.n40}×40FT` : ''}` : dt.mode
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Customs actual computation & assessment</p>
      <Row label="Customs value" hint={`${num(Number(inputs.value) || 0)} ${inputs.currency}`} value={`${num(Number(inputs.value) || 0)} ${inputs.currency}`} />
      {inputs.incoterm !== 'CIF' && <Row label="+ Freight" value={`${num(Number(inputs.freight) || 0)} ${inputs.currency}`} />}
      {dt.insurance > 0 && <Row label="+ Insurance" hint={inputs.insuranceMode === 'dg' ? '4% of value — dangerous' : inputs.insuranceMode === 'general' ? '2% of value — gen. cargo' : 'Actual premium'} value={`${num(dt.insurance)} ${inputs.currency}`} />}
      <Row label="Customs value (CIF)" value={`${num(dt.dutiableFx)} ${inputs.currency}`} />
      <Row label="× Exchange rate" value={`₱${num(dt.fx, 4)}`} />
      <Row label="Dutiable value (PHP)" strong value={peso(dt.dv)} />
      <Row label="× Tariff rate of duty" hint={`${(inputs.basis || 'mfn').toUpperCase()}`} value={`${(Number(inputs.dutyRate || 0) * 100).toFixed(2)}%`} />
      <Row label="Customs duty" strong value={peso(dt.duty)} />

      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-4">Landed cost (VAT base)</p>
      <Row label="Dutiable value" value={peso(dt.dv)} />
      <Row label="Customs duty" value={peso(dt.duty)} />
      <Row label="Brokerage fee" hint={`CAO 1-2001: DV × ${(settings.brokerageRate * 100).toFixed(3)}% + ${num(settings.brokerageBase, 0)}`} value={peso(dt.brokerage)} />
      {dt.bank > 0 && <Row label="Bank charge" value={peso(dt.bank)} />}
      <Row label="Port wharfage" hint={cntrs} value={peso(dt.wharfage)} />
      <Row label="Port arrastre" hint={cntrs} value={peso(dt.arrastre)} />
      <Row label="Customs docs stamp" hint="Standard" value={peso(dt.cds)} />
      <Row label="Import processing fee" hint="Standard" value={peso(dt.ipf)} />
      {dt.excise > 0 && <Row label="Excise tax" value={peso(dt.excise)} />}
      <Row label="Landed cost" strong value={peso(dt.landedCost)} />
      <Row label={`× VAT ${inputs.vatExempt ? '(exempt)' : ''}`} value={`${(settings.vatRate * 100).toFixed(0)}%`} />
      <Row label="Value added tax" strong value={peso(dt.vat)} />

      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-4">Summary</p>
      <Row label="Value added tax" value={peso(dt.vat)} />
      <Row label="Customs duty" value={peso(dt.duty)} />
      <Row label="IPF" value={peso(dt.ipf)} />
      <Row label="CDS" value={peso(dt.cds)} />
      {(dt.n20 > 0 || dt.n40 > 0) && (
        <Row label="CSF" hint={`$${settings.csfUsd['20FT']}/20FT · $${settings.csfUsd['40FT']}/40FT × E.R.`} value={peso(dt.csf)} />
      )}
      {dt.excise > 0 && <Row label="Excise tax" value={peso(dt.excise)} />}
      <Row label="Customs total duties, taxes & other charges" strong tone="gold" value={peso(dt.totalBoc)} />
      <Row label="Grand total incl. brokerage & port charges" hint="+ brokerage, arrastre, wharfage, bank" strong tone="navy" value={peso(dt.totalCharges)} />
    </div>
  )
}

export function DtDisclaimer() {
  return (
    <p className="flex items-start gap-1.5 text-[11px] text-slate-400 mt-3">
      <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
      Computation follows the brokerage's standard worksheet and is subject to BOC final assessment.
      Fee constants are editable in Settings — verify against current CAO/CMO and port tariffs.
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
