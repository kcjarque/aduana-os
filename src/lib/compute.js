// ---------------------------------------------------------------------------
// BOC Duties & Taxes computation engine (CMTA / CAO 1-2001 / CAO 2-2001 lineage)
// Pure functions — all fee parameters come from settings so the brokerage can
// tune them as BOC circulars change.
// ---------------------------------------------------------------------------

// Brokerage fee per CAO 1-2001 schedule; above the top bracket:
// base + rate × (DV − threshold)   (default 5,050 + 0.125% of excess over 200k)
export function brokerageFee(dv, s) {
  if (dv <= 0) return 0
  for (const b of s.brokerageBrackets) {
    if (dv <= b.upTo) return b.fee
  }
  return s.brokerageExcessBase + s.brokerageExcessRate * (dv - s.brokerageExcessOver)
}

// Import Processing Fee per CAO 2-2001 brackets
export function ipfFee(dv, s) {
  if (dv <= 0) return 0
  for (const b of s.ipfBrackets) {
    if (dv <= b.upTo) return b.fee
  }
  return s.ipfMax
}

export const defaultDtInputs = () => ({
  incoterm: 'FOB',            // EXW | FOB | FCA | CFR | CIF | DDP-quote
  currency: 'USD',
  fxRate: 0,                  // filled from current FX week at compute time if 0
  value: 0,                   // invoice value in foreign currency
  freight: 0,                 // foreign currency
  insuranceMode: 'general',   // general (2%) | dg (4%) | actual
  insuranceActual: 0,         // foreign currency, when mode = actual
  ahtnCode: '',
  description: '',
  basis: 'mfn',               // mfn | atiga | acfta | rcep
  dutyRate: 0,                // decimal, editable override
  bankCharges: 0,             // PHP (L/C)
  excise: 0,                  // PHP, manual
  vatExempt: false,
  qty: 1,                     // number of containers (or lots for LCL)
  arrastreOverride: null,     // PHP per container
  wharfageOverride: null,
  brokerageOverride: null,
})

// containerType: '20FT' | '40FT' | 'LCL'
export function computeDT(inputs, containerType, settings) {
  const i = { ...defaultDtInputs(), ...inputs }
  const s = settings
  const fx = Number(i.fxRate) || 0
  const value = Number(i.value) || 0
  const freight = Number(i.freight) || 0

  // Insurance (foreign currency): % of FOB value unless actual premium given
  let insurance
  if (i.insuranceMode === 'actual') insurance = Number(i.insuranceActual) || 0
  else insurance = value * (i.insuranceMode === 'dg' ? s.insuranceDG : s.insuranceGeneral)

  // Dutiable value basis by incoterm (CIF already includes freight+insurance)
  let dutiableFx
  if (i.incoterm === 'CIF') { dutiableFx = value; insurance = 0 }
  else if (i.incoterm === 'CFR') dutiableFx = value + insurance
  else dutiableFx = value + freight + insurance // EXW / FOB / FCA

  const dv = dutiableFx * fx
  const duty = dv * (Number(i.dutyRate) || 0)

  const qty = Math.max(1, Number(i.qty) || 1)
  const brokerage = i.brokerageOverride != null && i.brokerageOverride !== ''
    ? Number(i.brokerageOverride) : brokerageFee(dv, s)
  const ipf = ipfFee(dv, s)
  const cds = s.cds
  const arrastre = (i.arrastreOverride != null && i.arrastreOverride !== ''
    ? Number(i.arrastreOverride) : (s.arrastre[containerType] ?? 0)) * qty
  const wharfage = (i.wharfageOverride != null && i.wharfageOverride !== ''
    ? Number(i.wharfageOverride) : (s.wharfage[containerType] ?? 0)) * qty
  const bank = Number(i.bankCharges) || 0
  const excise = Number(i.excise) || 0

  // Total landed cost = VAT base (Sec. 107 NIRC as amended)
  const landedCost = dv + duty + bank + brokerage + arrastre + wharfage + cds + ipf + excise
  const vat = i.vatExempt ? 0 : landedCost * s.vatRate

  const totalBoc = duty + vat + excise + cds + ipf        // paid to BOC (SSDT)
  const totalCharges = totalBoc + brokerage + arrastre + wharfage + bank

  return {
    fx, dutiableFx, insurance, dv, duty, brokerage, ipf, cds,
    arrastre, wharfage, bank, excise, landedCost, vat, totalBoc, totalCharges,
    containerType, qty,
  }
}

// ---------------------------------------------------------------------------
// Quotation math
// ---------------------------------------------------------------------------

// A quote line: { id, label, kind: 'boc'|'service', bocKey?, values: { [col]: {buy, sell} } }
// BOC pass-through lines derive from the D&T engine each render — never stored stale.
export function bocLineAmount(bocKey, dt) {
  if (!dt) return 0
  return dt[bocKey] ?? 0
}

export function quoteTotals(quote, dtByCol) {
  const totals = {}
  for (const col of quote.columns) {
    let buy = 0, sell = 0, passSell = 0
    for (const ln of quote.lines) {
      if (ln.kind === 'boc') {
        const amt = bocLineAmount(ln.bocKey, dtByCol[col])
        // brokerage is broker revenue: cost 0; all other BOC lines are pure
        // pass-through advances (duty, VAT, port charges) — reimbursed at cost
        if (ln.bocKey === 'brokerage') { sell += amt }
        else { buy += amt; sell += amt; passSell += amt }
      } else {
        buy += Number(ln.values?.[col]?.buy) || 0
        sell += Number(ln.values?.[col]?.sell) || 0
      }
    }
    const margin = sell - buy
    // margin % is measured on service revenue (total less pass-through
    // advances) — advances dilute the ratio without carrying any margin
    const svcSell = sell - passSell
    totals[col] = { buy, sell, passSell, svcSell, margin, marginPct: svcSell > 0 ? margin / svcSell : 0 }
  }
  return totals
}

export function runSelectivity() {
  const r = Math.random()
  if (r < 0.7) return 'green'
  if (r < 0.9) return 'yellow'
  return 'red'
}
