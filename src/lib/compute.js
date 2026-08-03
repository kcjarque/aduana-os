// ---------------------------------------------------------------------------
// BOC Duties & Taxes computation engine — replicates the brokerage's own
// Excel tools exactly ("COMPUTATION OF DUTIES & TAXES.xlsx" and the legacy
// "DT CALCULATOR & DOCUMENTATION.xls"). All parameters live in Settings.
// ---------------------------------------------------------------------------

// Client convention (both Excel tools): BROKERAGE = DV × 0.125% + 5,050
// (flat CAO 1-2001 formula applied to the full dutiable value)
export function brokerageFee(dv, s) {
  if (dv <= 0) return 0
  return s.brokerageBase + s.brokerageRate * dv
}

// Standard dutiable freight defaults from the client's sheet:
// LCL $400 / AIR $300 / 20FT $800 / 40FT $1,200
export function stdFreightUsd(inputs, s) {
  if (inputs.mode === 'AIR') return s.stdFreight.AIR
  if (inputs.mode === 'LCL') return s.stdFreight.LCL
  const n20 = Number(inputs.n20) || 0
  const n40 = Number(inputs.n40) || 0
  return n20 * s.stdFreight['20FT'] + n40 * s.stdFreight['40FT']
}

export const defaultDtInputs = () => ({
  incoterm: 'FOB',            // EXWORKS | FOB | FCA | CFR | CIF | DDP
  currency: 'USD',
  fxRate: 0,                  // BOC weekly rate; editable like the sheet's cell
  value: 0,                   // total invoice value in foreign currency
  freight: 0,                 // dutiable ocean/air freight (foreign currency)
  insuranceMode: 'general',   // general (2%) | dg (4%) | actual
  insuranceActual: 0,
  ahtnCode: '',
  description: '',
  basis: 'mfn',               // mfn | atiga | acfta | rcep (Form D / Form E)
  dutyRate: 0,
  bankCharges: 0,             // PHP (L/C)
  excise: 0,                  // PHP, manual (ATRIG goods)
  vatExempt: false,
  mode: 'FCL',                // FCL | LCL | AIR
  n20: 1,                     // number of 20FT containers
  n40: 0,                     // number of 40FT containers
  arrastreOverride: null,     // PHP total
  wharfageOverride: null,
  brokerageOverride: null,
})

export function computeDT(inputs, settings) {
  const i = { ...defaultDtInputs(), ...inputs }
  const s = settings
  const fx = Number(i.fxRate) || 0
  const value = Number(i.value) || 0
  const freight = Number(i.freight) || 0
  const n20 = i.mode === 'FCL' ? Number(i.n20) || 0 : 0
  const n40 = i.mode === 'FCL' ? Number(i.n40) || 0 : 0

  // Insurance: 2% of value (general) / 4% (dangerous) — per the client sheet
  let insurance
  if (i.insuranceMode === 'actual') insurance = Number(i.insuranceActual) || 0
  else insurance = value * (i.insuranceMode === 'dg' ? s.insuranceDG : s.insuranceGeneral)

  // Customs value (CIF) by incoterm — CIF already includes freight+insurance
  let dutiableFx
  if (i.incoterm === 'CIF') { dutiableFx = value; insurance = 0 }
  else if (i.incoterm === 'CFR') dutiableFx = value + insurance
  else dutiableFx = value + freight + insurance // EXWORKS / FOB / FCA / DDP

  const dv = dutiableFx * fx                       // DUTIABLE VALUE (PHP)
  const duty = dv * (Number(i.dutyRate) || 0)      // CUSTOMS DUTY

  const brokerage = i.brokerageOverride != null && i.brokerageOverride !== ''
    ? Number(i.brokerageOverride) : brokerageFee(dv, s)

  // Port charges per container type (client figures: sheet cells D35–D38)
  const arrastre = i.arrastreOverride != null && i.arrastreOverride !== ''
    ? Number(i.arrastreOverride)
    : i.mode === 'FCL' ? n20 * s.arrastre['20FT'] + n40 * s.arrastre['40FT'] : s.arrastre.LCL
  const wharfage = i.wharfageOverride != null && i.wharfageOverride !== ''
    ? Number(i.wharfageOverride)
    : i.mode === 'FCL' ? n20 * s.wharfage['20FT'] + n40 * s.wharfage['40FT'] : s.wharfage.LCL

  const cds = s.cds                                // flat, per sheet ("STANDARD")
  const ipf = s.ipf                                // flat, per sheet ("STANDARD")
  const bank = Number(i.bankCharges) || 0
  const excise = Number(i.excise) || 0

  // LANDED COST = DV + duty + brokerage + bank + wharfage + arrastre + CDS + IPF
  const landedCost = dv + duty + brokerage + bank + wharfage + arrastre + cds + ipf + excise
  const vat = i.vatExempt ? 0 : landedCost * s.vatRate

  // CSF (container security fee): $5 × ER per 20FT / $10 × ER per 40FT
  const csf = (n20 * s.csfUsd['20FT'] + n40 * s.csfUsd['40FT']) * fx

  // Client's SUMMARY block: VAT + duty + IPF + CDS + CSF (+ excise) = customs total
  const totalBoc = vat + duty + ipf + cds + csf + excise
  const totalCharges = totalBoc + brokerage + arrastre + wharfage + bank

  return {
    fx, dutiableFx, insurance, dv, duty, brokerage, arrastre, wharfage,
    cds, ipf, bank, excise, csf, landedCost, vat, totalBoc, totalCharges,
    n20, n40, mode: i.mode,
  }
}

// ---------------------------------------------------------------------------
// Quotation math — mirrors the client's INQUIRY TOOL exactly:
// 16 expense lines per container column, TOTAL EXPENSES, a manually set
// FINAL QUOTATION, GROSS INCOME = final − expenses, container-deposit refund
// added back, NET INCOME = gross + refund.
// ---------------------------------------------------------------------------
export function dtInputsForCol(dtInputs, col) {
  if (col === '40FT') return { ...dtInputs, mode: 'FCL', n20: 0, n40: Math.max(1, Number(dtInputs.qtyPerCol) || 1) }
  if (col === '20FT') return { ...dtInputs, mode: 'FCL', n20: Math.max(1, Number(dtInputs.qtyPerCol) || 1), n40: 0 }
  if (col === 'AIR') return { ...dtInputs, mode: 'AIR', n20: 0, n40: 0 }
  return { ...dtInputs, mode: 'LCL', n20: 0, n40: 0 } // LCL
}

export function quoteTotals(quote, dtByCol) {
  const totals = {}
  for (const col of quote.columns) {
    let expenses = 0, refund = 0
    for (const ln of quote.lines) {
      const amt = ln.key === 'dt'
        ? (dtByCol[col]?.totalBoc ?? 0)
        : Number(ln.values?.[col]) || 0
      expenses += amt
      if (ln.refundable) refund += amt
    }
    const finalQuote = Number(quote.finalQuote?.[col]) || 0
    const gross = finalQuote - expenses
    const net = gross + refund
    totals[col] = { expenses, finalQuote, gross, refund, net }
  }
  return totals
}

export function runSelectivity() {
  const r = Math.random()
  if (r < 0.7) return 'green'
  if (r < 0.9) return 'yellow'
  return 'red'
}
