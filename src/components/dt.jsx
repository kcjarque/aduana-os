import { useMemo, useState } from 'react'
import { useDb, currentFxWeek } from '../lib/store'
import { peso, num } from '../lib/format'
import { stdFreightUsd, defaultDtItem } from '../lib/compute'
import { Field, Input, NumInput, Select, Toggle, Badge, Icon, Button } from './ui'

// rank favorites first, then tariff-book rows
function searchTariff(lines, q) {
  const s = (q || '').trim().toLowerCase()
  const base = s
    ? lines.filter((t) => t.code.toLowerCase().includes(s) || t.description.toLowerCase().includes(s))
    : lines
  return [...base]
    .sort((a, b) => (a.source === 'FAVORITES' ? 0 : 1) - (b.source === 'FAVORITES' ? 0 : 1))
    .slice(0, 8)
}

// ---------------- per-row H.S. search ----------------
function HsSearch({ item, onPick, placeholder }) {
  const { db } = useDb()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const results = useMemo(() => searchTariff(db.tariffLines, q), [db.tariffLines, q])

  return (
    <div className="relative">
      <Input
        className="!py-1.5 !text-xs"
        value={open ? q : (item.ahtnCode ? `${item.ahtnCode} — ${item.description}` : (item.description || ''))}
        placeholder={placeholder || 'Search H.S. code or commodity…'}
        onFocus={() => { setOpen(true); setQ('') }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQ(e.target.value)}
      />
      {open && (
        <div className="absolute z-40 mt-1 w-full min-w-[280px] bg-white border border-slate-200 rounded-xl card-shadow-lg overflow-hidden">
          {results.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">No matching tariff lines.</p>}
          {results.map((t) => (
            <button key={t.id} type="button"
              onMouseDown={(e) => { e.preventDefault(); onPick(t); setOpen(false); setQ('') }}
              className="w-full text-left px-3 py-2 hover:bg-navy-50 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-800 truncate">
                <span className="tnum font-semibold text-navy-800">{t.code}</span>
                <span className="text-slate-500"> · {t.description}</span>
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                {t.source === 'FAVORITES' && <Badge tone="gold" className="!text-[9px] !px-1.5">★</Badge>}
                <span className="tnum text-[10px] text-slate-500">{(t.mfn * 100).toFixed(0)}%</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------- items editor (1..18 tariff lines) ----------------
export function ItemsEditor({ inputs, onPatch, disabled, compact }) {
  const { db } = useDb()
  const items = inputs.items && inputs.items.length ? inputs.items : [defaultDtItem()]
  const patchItem = (id, p) => onPatch({ items: items.map((it) => it.id === id ? { ...it, ...p } : it) })
  const addItem = () => { if (items.length < 18) onPatch({ items: [...items, defaultDtItem()] }) }
  const removeItem = (id) => onPatch({ items: items.length > 1 ? items.filter((it) => it.id !== id) : items })
  const pick = (id, t) => patchItem(id, {
    ahtnCode: t.code,
    description: items.find((x) => x.id === id)?.description?.trim() ? items.find((x) => x.id === id).description : t.description,
    dutyRate: t[items.find((x) => x.id === id)?.basis || 'mfn'] ?? t.mfn,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Tariff line items {items.length > 1 && <span className="text-navy-700">({items.length})</span>}
        </span>
        <span className="text-[10px] text-slate-400">{items.length}/18</span>
      </div>
      <fieldset disabled={disabled} className="space-y-2">
        {items.map((it, idx) => (
          <div key={it.id} className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/40">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="tnum text-[10px] font-bold text-slate-400 w-4">{idx + 1}</span>
              <div className="flex-1"><HsSearch item={it} onPick={(t) => pick(it.id, t)} /></div>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(it.id)} className="text-slate-300 hover:text-red-500 shrink-0">
                  <Icon name="trash" size={14} />
                </button>
              )}
            </div>
            <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-4'} gap-2 pl-6`}>
              <label className="block">
                <span className="block text-[9px] font-semibold uppercase text-slate-400">Basis</span>
                <Select className="!py-1 !text-xs" value={it.basis || 'mfn'}
                  onChange={(e) => {
                    const basis = e.target.value
                    const t = db.tariffLines.find((x) => x.code === it.ahtnCode)
                    patchItem(it.id, t ? { basis, dutyRate: t[basis] ?? t.mfn } : { basis })
                  }}>
                  <option value="mfn">MFN</option><option value="acfta">Form E</option>
                  <option value="atiga">Form D</option><option value="rcep">RCEP</option>
                </Select>
              </label>
              <label className="block">
                <span className="block text-[9px] font-semibold uppercase text-slate-400">Rate %</span>
                <NumInput className="!py-1 !text-xs" value={it.dutyRate === '' ? '' : +(it.dutyRate * 100).toFixed(4)} step="0.5"
                  onChange={(v) => patchItem(it.id, { dutyRate: v === '' ? 0 : v / 100 })} />
              </label>
              <label className="block">
                <span className="block text-[9px] font-semibold uppercase text-slate-400">Value ({inputs.currency})</span>
                <NumInput className="!py-1 !text-xs" value={it.value} onChange={(v) => patchItem(it.id, { value: v })} />
              </label>
              {!compact && (
                <label className="block">
                  <span className="block text-[9px] font-semibold uppercase text-slate-400">Packages</span>
                  <NumInput className="!py-1 !text-xs" value={it.packages || 0} onChange={(v) => patchItem(it.id, { packages: v })} />
                </label>
              )}
            </div>
          </div>
        ))}
        <Button tone="ghost" size="sm" icon="plus" onClick={addItem} disabled={items.length >= 18}>
          Add tariff line {items.length >= 18 && '(max 18)'}
        </Button>
      </fieldset>
    </div>
  )
}

// ---------------- shipment-level D&T inputs ----------------
export function DtForm({ inputs, onPatch, compact = false }) {
  const { db } = useDb()
  const week = currentFxWeek(db)
  const s = db.settings
  const setCurrency = (currency) => onPatch({ currency, fxRate: week?.rates?.[currency] ?? inputs.fxRate })
  const applyStdFreight = () => onPatch({ freight: stdFreightUsd(inputs, s) })

  return (
    <div className="space-y-4">
      <ItemsEditor inputs={inputs} onPatch={onPatch} compact={compact} />

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
        <Field label="Dutiable freight" hint={inputs.incoterm === 'CIF' ? 'Included in CIF value' : inputs.incoterm === 'CFR' ? 'In value; insurance added' : `Std: LCL $${s.stdFreight.LCL}/AIR $${s.stdFreight.AIR}/20 $${s.stdFreight['20FT']}/40 $${s.stdFreight['40FT']}`}>
          <div className="flex gap-1.5">
            <NumInput value={inputs.freight} disabled={['CIF', 'CFR'].includes(inputs.incoterm)} onChange={(v) => onPatch({ freight: v })} />
            {!['CIF', 'CFR'].includes(inputs.incoterm) && (
              <Button tone="ghost" size="sm" className="shrink-0 !px-2" onClick={applyStdFreight}>Std</Button>
            )}
          </div>
        </Field>
        <Field label="Dutiable insurance">
          <Select value={inputs.insuranceMode} onChange={(e) => onPatch({ insuranceMode: e.target.value })}>
            <option value="general">2% of value — gen.</option>
            <option value="dg">4% of value — DG</option>
            <option value="actual">Actual premium</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {inputs.insuranceMode === 'actual' && (
          <Field label={`Premium (${inputs.currency})`}>
            <NumInput value={inputs.insuranceActual} onChange={(v) => onPatch({ insuranceActual: v })} />
          </Field>
        )}
        <Field label="Bank charge (₱)" hint="If via L/C">
          <NumInput value={inputs.bankCharges} onChange={(v) => onPatch({ bankCharges: v })} />
        </Field>
        {!compact && (
          <Field label="Excise tax (₱)" hint="If any (ATRIG)">
            <NumInput value={inputs.excise} onChange={(v) => onPatch({ excise: v })} />
          </Field>
        )}
      </div>

      <Toggle checked={!!inputs.vatExempt} onChange={(v) => onPatch({ vatExempt: v })} label="VAT-exempt importation" />
    </div>
  )
}

// ---------------- breakdown ----------------
const Row = ({ label, hint, value, strong, tone }) => (
  <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? 'border-t border-slate-200 mt-1 pt-2.5' : ''}`}>
    <div>
      <span className={`${strong ? 'font-semibold text-slate-900' : 'text-slate-600'} text-sm`}>{label}</span>
      {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
    </div>
    <span className={`tnum text-sm ${strong ? 'font-bold text-base' : ''} ${tone === 'gold' ? 'text-gold-600' : tone === 'navy' ? 'text-navy-800' : 'text-slate-800'}`}>{value}</span>
  </div>
)

export function DtBreakdown({ dt, inputs, settings }) {
  if (!dt) return null
  const fp = settings.feePolicy
  const cntrs = dt.mode === 'FCL' ? `${dt.n20}×20FT${dt.n40 ? ` + ${dt.n40}×40FT` : ''}` : dt.mode

  return (
    <div>
      {dt.multi && (
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Per-item breakdown ({dt.itemCount} lines)</p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 text-slate-500">
                <tr><th className="text-left px-2 py-1 font-semibold">#</th><th className="text-left px-2 py-1 font-semibold">Item</th><th className="text-right px-2 py-1 font-semibold">DV</th><th className="text-right px-2 py-1 font-semibold">Duty</th><th className="text-right px-2 py-1 font-semibold">VAT</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dt.lines.map((l, i) => (
                  <tr key={l.id}>
                    <td className="px-2 py-1 text-slate-400 tnum">{i + 1}</td>
                    <td className="px-2 py-1 text-slate-700 truncate max-w-[120px]">{l.ahtnCode || l.description || '—'}</td>
                    <td className="px-2 py-1 text-right tnum">{peso(l.dv, 0)}</td>
                    <td className="px-2 py-1 text-right tnum">{peso(l.duty, 0)}</td>
                    <td className="px-2 py-1 text-right tnum">{peso(l.vat, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Customs computation & assessment</p>
      <Row label="Total invoice value" value={`${num(dt.totalValue)} ${inputs.currency}`} />
      {dt.freight > 0 && <Row label="+ Freight" value={`${num(dt.freight)} ${inputs.currency}`} />}
      {dt.insurance > 0 && <Row label="+ Insurance" hint={inputs.insuranceMode === 'dg' ? '4% — DG' : inputs.insuranceMode === 'general' ? '2% — gen.' : 'actual'} value={`${num(dt.insurance)} ${inputs.currency}`} />}
      <Row label="× Exchange rate" value={`₱${num(dt.fx, 4)}`} />
      <Row label="Dutiable value (PHP)" strong value={peso(dt.dv)} />
      <Row label={dt.multi ? 'Total customs duty (Σ lines)' : 'Customs duty'} value={peso(dt.duty)} />

      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-4">Landed cost (VAT base)</p>
      <Row label="Brokerage fee" hint={settings.brokerageSchedule?.mode === 'brackets' ? 'CAO 1-2001 bracket table' : `DV × ${(settings.brokerageSchedule.formula.rate * 100).toFixed(3)}% + ${num(settings.brokerageSchedule.formula.base, 0)}`} value={peso(dt.brokerage)} />
      {dt.bank > 0 && <Row label="Bank charge" value={peso(dt.bank)} />}
      <Row label="Port wharfage" hint={cntrs} value={peso(dt.wharfage)} />
      <Row label="Port arrastre" hint={cntrs} value={peso(dt.arrastre)} />
      <Row label="Customs docs stamp" value={peso(dt.cds)} />
      <Row label="Import processing fee" hint={fp.ipfLegacySplit ? 'legacy: in landed cost' : ''} value={peso(dt.ipfLanded)} />
      {dt.excise > 0 && <Row label="Excise tax" value={peso(dt.excise)} />}
      <Row label="Landed cost" strong value={peso(dt.landedCost)} />
      <Row label={dt.multi ? `VAT (Σ per-line, ${(settings.vatRate * 100).toFixed(0)}%)` : `× VAT ${inputs.vatExempt ? '(exempt)' : `${(settings.vatRate * 100).toFixed(0)}%`}`} value={peso(dt.vat)} />

      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-4">Summary — payable to BOC</p>
      <Row label="Value added tax" value={peso(dt.vat)} />
      <Row label="Customs duty" value={peso(dt.duty)} />
      <Row label="IPF" value={peso(dt.ipfSummary)} />
      {fp.cdsInSummary && <Row label="CDS" value={peso(dt.cds)} />}
      {(dt.n20 > 0 || dt.n40 > 0) && <Row label="CSF" hint={`$${settings.csfUsd['20FT']}/20FT · $${settings.csfUsd['40FT']}/40FT × E.R.`} value={peso(dt.csf)} />}
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
