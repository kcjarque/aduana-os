// ---------------------------------------------------------------------------
// BOC Duties & Taxes computation engine — replicates the brokerage's own
// Excel tools (single-commodity "COMPUTATION OF DUTIES & TAXES.xlsx" and the
// multi-line legacy "DT CALCULATOR & DOCUMENTATION.xls"). Pure functions only.
//
// Money note: the workbooks keep peso figures and round VAT to whole pesos
// PER LINE on multi-item entries (the IEIRD convention) while the single-
// commodity quick sheet keeps centavos. We mirror that exactly:
//   • multi-item (items > 1): round each line's duty & VAT to the peso, sum.
//   • single-item: keep full precision (matches the quick sheet / Fixture C).
// Values are JS numbers; we round explicitly at each workbook rounding point
// (roundPeso) so results are centavo-accurate without a centavo-integer model.
// ---------------------------------------------------------------------------

const n = (x) => Number(x) || 0
// half-up peso rounding; tiny epsilon absorbs float representation noise
export const roundPeso = (x) => Math.round(n(x) + 1e-6)

// ---------------------------------------------------------------------------
// Brokerage fee — config-driven (Settings › brokerage schedule).
//   mode 'formula'  → DV × rate + base            (client's current practice)
//   mode 'brackets' → piecewise table on TOTAL_DV (CAO 1-2001, verify first)
// ---------------------------------------------------------------------------
export function brokerageFee(totalDv, s) {
  const dv = n(totalDv)
  if (dv <= 0) return 0
  const sch = s.brokerageSchedule || { mode: 'formula', formula: { base: 5050, rate: 0.00125 } }
  if (sch.mode === 'brackets' && Array.isArray(sch.brackets) && sch.brackets.length) {
    for (const b of sch.brackets) {
      if (b.upTo == null || dv <= b.upTo) {
        if (typeof b.fee === 'object' && b.fee) {
          return n(b.fee.base) + n(b.fee.rateOnExcess) * Math.max(0, dv - n(b.fee.over))
        }
        return n(b.fee)
      }
    }
    const last = sch.brackets[sch.brackets.length - 1]
    if (typeof last.fee === 'object' && last.fee) {
      return n(last.fee.base) + n(last.fee.rateOnExcess) * Math.max(0, dv - n(last.fee.over))
    }
    return n(last.fee)
  }
  const f = sch.formula || { base: 5050, rate: 0.00125 }
  return dv * n(f.rate) + n(f.base)
}

// Import Processing Fee — flat (default) or CAO 2-2001 brackets on TOTAL_DV
function ipfFor(totalDv, fp) {
  if (fp.ipfMode === 'brackets' && Array.isArray(fp.ipfBrackets)) {
    for (const b of fp.ipfBrackets) if (b.upTo == null || totalDv <= b.upTo) return n(b.fee)
    return n(fp.ipfBrackets[fp.ipfBrackets.length - 1]?.fee)
  }
  return n(fp.ipfFlat)
}

// Standard dutiable freight (USD): LCL $400 / AIR $300 / 20FT $800 / 40FT $1,200
export function stdFreightUsd(inputs, s) {
  if (inputs.mode === 'AIR') return s.stdFreight.AIR
  if (inputs.mode === 'LCL') return s.stdFreight.LCL
  const n20 = n(inputs.n20), n40 = n(inputs.n40)
  return n20 * s.stdFreight['20FT'] + n40 * s.stdFreight['40FT']
}

export const defaultDtItem = () => ({
  id: (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
  description: '', ahtnCode: '', basis: 'mfn', dutyRate: 0,
  value: 0, packages: 0, grossWt: 0, netWt: 0,
})

export const defaultDtInputs = () => ({
  incoterm: 'FOB', currency: 'USD', fxRate: 0,
  freight: 0, insuranceMode: 'general', insuranceActual: 0,
  bankCharges: 0, excise: 0, vatExempt: false,
  mode: 'FCL', n20: 1, n40: 0, qtyPerCol: 1,
  arrastreOverride: null, wharfageOverride: null, brokerageOverride: null,
  items: [defaultDtItem()],
})

// Incoterm → whether freight / insurance are added to the customs value
function incotermFlags(incoterm) {
  if (incoterm === 'CIF') return { addFreight: false, addInsurance: false }
  if (incoterm === 'CFR') return { addFreight: false, addInsurance: true }
  return { addFreight: true, addInsurance: true } // EXWORKS / FOB / FCA / DDP
}

export function computeDT(inputs, settings) {
  const i = { ...defaultDtInputs(), ...inputs }
  const s = settings
  const fp = s.feePolicy
  const items = (i.items && i.items.length ? i.items : [defaultDtItem()])
  const multi = items.length > 1
  const fx = n(i.fxRate)
  const { addFreight, addInsurance } = incotermFlags(i.incoterm)

  const totalValue = items.reduce((a, it) => a + n(it.value), 0)
  const freight = addFreight ? n(i.freight) : 0
  const insuranceVal = i.insuranceMode === 'actual'
    ? n(i.insuranceActual)
    : totalValue * (i.insuranceMode === 'dg' ? s.insuranceDG : s.insuranceGeneral)
  const insurance = addInsurance ? insuranceVal : 0

  // TOTAL_DV computed directly (not from rounded lines) → exact brokerage base
  const totalDv = (totalValue + freight + insurance) * fx

  // Common charges shared across items by value proportion
  const n20 = i.mode === 'FCL' ? n(i.n20) : 0
  const n40 = i.mode === 'FCL' ? n(i.n40) : 0
  const brokerage = i.brokerageOverride != null && i.brokerageOverride !== ''
    ? n(i.brokerageOverride) : brokerageFee(totalDv, s)
  const arrastre = i.arrastreOverride != null && i.arrastreOverride !== ''
    ? n(i.arrastreOverride)
    : i.mode === 'FCL' ? n20 * s.arrastre['20FT'] + n40 * s.arrastre['40FT'] : s.arrastre.LCL
  const wharfage = i.wharfageOverride != null && i.wharfageOverride !== ''
    ? n(i.wharfageOverride)
    : i.mode === 'FCL' ? n20 * s.wharfage['20FT'] + n40 * s.wharfage['40FT'] : s.wharfage.LCL
  const cds = n(fp.cds)
  const ipfSummary = ipfFor(totalDv, fp)
  const ipfLanded = fp.ipfLegacySplit ? n(fp.ipfLandedCost) : ipfSummary
  const bank = n(i.bankCharges)
  const excise = n(i.excise)

  // Common charges that fold into landed cost (VAT base), prorated by value
  const commonLanded = brokerage + bank + wharfage + arrastre + cds + ipfLanded

  // Per-item breakdown
  const lines = items.map((it) => {
    const share = totalValue > 0 ? n(it.value) / totalValue : (1 / items.length)
    const dvExact = (n(it.value) + freight * share + insurance * share) * fx
    const dutyExact = dvExact * n(it.dutyRate)
    const duty = multi ? roundPeso(dutyExact) : dutyExact
    const lc = dvExact + duty + commonLanded * share
    const vat = i.vatExempt ? 0 : (multi ? roundPeso(lc * s.vatRate) : lc * s.vatRate)
    return {
      id: it.id, description: it.description, ahtnCode: it.ahtnCode, basis: it.basis,
      dutyRate: n(it.dutyRate), value: n(it.value), share,
      dv: dvExact, duty, landedCost: lc, vat,
    }
  })

  // Reconcile displayed DV so Σ line.dv ties to totalDv (residual → largest line)
  const dvSum = lines.reduce((a, l) => a + l.dv, 0)
  const residual = totalDv - dvSum
  if (Math.abs(residual) > 1e-6 && lines.length) {
    const big = lines.reduce((m, l) => (l.value > m.value ? l : m), lines[0])
    big.dv += residual
  }

  const totalDuty = lines.reduce((a, l) => a + l.duty, 0)
  const totalVat = lines.reduce((a, l) => a + l.vat, 0)
  const landedCost = totalDv + totalDuty + commonLanded

  // CSF: $5/20FT + $10/40FT × E.R., rounded to peso (per the summary block)
  const csf = roundPeso((n20 * s.csfUsd['20FT'] + n40 * s.csfUsd['40FT']) * fx)

  // Summary — amount payable to BOC
  const totalBoc = totalVat + totalDuty + ipfSummary
    + (fp.cdsInSummary ? cds : 0) + excise + csf
  const totalCharges = totalBoc + brokerage + arrastre + wharfage + bank

  // convenience aliases for existing single-item readers / print header
  const first = items[0] || defaultDtItem()

  return {
    fx, totalValue, freight, insurance, insuranceVal,
    dv: totalDv, duty: totalDuty, brokerage, arrastre, wharfage,
    cds, ipf: ipfSummary, ipfLanded, ipfSummary, bank, excise, csf,
    landedCost, vat: totalVat, totalBoc, totalCharges,
    lines, itemCount: items.length, multi,
    n20, n40, mode: i.mode,
    // header helpers
    ahtnLabel: multi ? 'Various — see itemization' : (first.ahtnCode || '—'),
    basis: first.basis, dutyRate: n(first.dutyRate),
    // legacy field name used by the breakdown component
    dutiableFx: totalValue + freight + insurance,
  }
}

// ---------------------------------------------------------------------------
// Column mapping for a quote (20FT / 40FT / LCL / AIR)
// ---------------------------------------------------------------------------
export function dtInputsForCol(dtInputs, col) {
  const q = Math.max(1, n(dtInputs.qtyPerCol) || 1)
  if (col === '40FT') return { ...dtInputs, mode: 'FCL', n20: 0, n40: q }
  if (col === '20FT') return { ...dtInputs, mode: 'FCL', n20: q, n40: 0 }
  if (col === 'AIR') return { ...dtInputs, mode: 'AIR', n20: 0, n40: 0 }
  return { ...dtInputs, mode: 'LCL', n20: 0, n40: 0 } // LCL
}

// ---------------------------------------------------------------------------
// Quotation math — the INQUIRY TOOL: 16 expense lines → TOTAL EXPENSES →
// FINAL QUOTATION (manual) → GROSS INCOME → + deposit refund → NET INCOME.
// ---------------------------------------------------------------------------
export function quoteTotals(quote, dtByCol) {
  const totals = {}
  for (const col of quote.columns) {
    let expenses = 0, refund = 0
    for (const ln of quote.lines) {
      const amt = ln.key === 'dt'
        ? (dtByCol[col]?.totalBoc ?? 0)
        : n(ln.values?.[col])
      expenses += amt
      if (ln.refundable) refund += amt
    }
    const finalQuote = n(quote.finalQuote?.[col])
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
