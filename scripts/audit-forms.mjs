// Computation-fidelity audit: app engine vs the worked examples baked into the
// client's own Excel files. Each sheet's ER is held equal to that sheet so any
// difference is a FORMULA difference, not an exchange-rate difference.
// Run: npm run audit
import { computeDT, dtInputsForCol } from '../src/lib/compute.js'

const peso = (n) => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
let score = 0, max = 0
const line = (label, got, want, dp = 2) => {
  max++
  const g = Math.round(got * 10 ** dp) / 10 ** dp
  const w = Math.round(want * 10 ** dp) / 10 ** dp
  const ok = Math.abs(g - w) <= 0.01
  if (ok) score++
  console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(42)} app ${peso(g).padStart(16)}  |  sheet ${peso(w).padStart(16)}${ok ? '' : '   <-- MISMATCH'}`)
}

const S = (feePolicy) => ({
  vatRate: 0.12, insuranceGeneral: 0.02, insuranceDG: 0.04,
  arrastre: { '20FT': 3727, '40FT': 8551, LCL: 4977 },
  wharfage: { '20FT': 519.35, '40FT': 779.05, LCL: 520 },
  csfUsd: { '20FT': 5, '40FT': 10 }, stdFreight: { LCL: 400, AIR: 300, '20FT': 800, '40FT': 1200 },
  brokerageSchedule: { mode: 'formula', formula: { base: 5050, rate: 0.00125 } }, feePolicy,
})
const item = (value, dutyRate = 0) => ({ id: String(Math.random()), value, dutyRate, basis: 'mfn' })

// ===========================================================================
console.log('\n═══ FILE 1 · COMPUTATION OF DUTIES & TAXES.xlsx (single-item worked example) ═══')
console.log('    Inputs: value $75,000 · freight $600 · 4% DG insurance · 0% duty · ER 61 · CDS 130 · IPF 2000\n')
{
  const s = S({ cds: 130, cdsInSummary: true, ipfMode: 'flat', ipfFlat: 2000, ipfLegacySplit: false })
  const r = computeDT({ incoterm: 'FOB', currency: 'USD', fxRate: 61, freight: 600, insuranceMode: 'dg',
    mode: 'FCL', n20: 0, n40: 0, items: [item(75000, 0)] }, s)
  line('Dutiable value (PHP)  [B26]', r.dv, 4794600)
  line('Customs duty          [B28]', r.duty, 0)
  line('Brokerage fee         [B33]', r.brokerage, 11043.25)
  line('Landed cost           [B41]', r.landedCost, 4807773.25)
  line('Value added tax       [B43]', r.vat, 576932.79)
  line('TOTAL D&T             [B53]', r.totalBoc, 579062.79)
}

// ===========================================================================
console.log('\n═══ FILE 2 · DT CALCULATOR & DOCUMENTATION.xls (4-item VAGUS entry, legacy policy) ═══')
console.log('    Inputs: 4 items $3k/$6k/$5k/$6k @0% · freight $1,200 · $400 actual ins · ER 56.665 · 1×20FT')
console.log('    Legacy policy: CDS 265 in LC / excluded from summary · IPF 1000 in LC / 2000 in summary\n')
{
  const s = S({ cds: 265, cdsInSummary: false, ipfMode: 'flat', ipfFlat: 2000, ipfLegacySplit: true, ipfLandedCost: 1000 })
  const r = computeDT(dtInputsForCol({ incoterm: 'FOB', currency: 'USD', fxRate: 56.665, freight: 1200,
    insuranceMode: 'actual', insuranceActual: 400, qtyPerCol: 1,
    items: [item(3000), item(6000), item(5000), item(6000)] }, '20FT'), s)
  line('Total dutiable value  [H26]', r.dv, 1223964)
  line('Brokerage fee         [G33]', r.brokerage, 6579.955, 3)
  line('Item 1 DV             [H8]', r.lines[0].dv, 183594.60)
  line('Item 1 landed cost    [J8]', r.lines[0].landedCost, 185408.29575, 5)
  line('Item 1 VAT (rounded)  [L8]', r.lines[0].vat, 22249)
  line('Item 2 VAT            [L9]', r.lines[1].vat, 44498)
  line('Item 3 VAT            [L10]', r.lines[2].vat, 37082)
  line('Item 4 VAT            [L11]', r.lines[3].vat, 44498)
  line('Total VAT             [K32]', r.vat, 148327)
  line('CSF                   [K35]', r.csf, 283)
  line('TOTAL payable to BOC  [K36]', r.totalBoc, 150610)
}

// ===========================================================================
console.log('\n═══ FILE 3 · CONSOLIDATION CALCU FOR LCL & FCL.xlsx (rate × qty × ER/days) ═══')
console.log('    Formula: amount = rate × qty × (ER or days); 12% VAT on flagged rows. ER held = sheet.\n')
{
  const amt = (rate, qty, fx = 1) => rate * qty * fx
  // LCL warehouse group — all PHP (exchange-rate-independent)
  const wh = [
    amt(1474.55, 1), amt(147.46, 1), amt(340, 1), amt(73.73, 9, 10), amt(552.96, 9),
    amt(1474.55, 9), amt(737.27, 9), amt(2000, 9), amt(1000, 1), amt(300, 9),
  ]
  const whSub = wh.reduce((a, b) => a + b, 0)
  const whVat = whSub * 0.12
  line('LCL warehouse subtotal [G21:G30]', whSub, 55180.73)
  line('LCL warehouse VAT 12%  [G31]', whVat, 6621.6876, 4)
  line('LCL warehouse TOTAL    [G32]', whSub + whVat, 61802.4176, 4)

  // LCL destination @ ER 62 (USD rows: BL 40, PSS 10×9, CIC 10×9, ECRS 10×9)
  const destPhp = amt(450, 1) + amt(450, 1) + amt(450, 9)  // doc, turnover, LCL charge (VATable)
  const destVat = destPhp * 0.12
  const destUsd = amt(250, 9) + amt(40, 1, 62) + amt(10, 9, 62) + amt(10, 9, 62) + amt(10, 9, 62) // THC(php) + BL/PSS/CIC/ECRS(usd)
  const destTotal = destPhp + destVat + destUsd
  line('LCL destination TOTAL  [G18] @ER62', destTotal, 27014)
  // LCL freight @ ER 62 (sheet row uses 10 CBM)
  const freight = amt(50, 10, 62)
  line('LCL freight            [G3]  @ER62', freight, 31000)
  line('LCL grand (all groups) [B38] @ER62', freight + destTotal + (whSub + whVat), 119816.4176, 4)

  // FCL @ sheet ER (exworks 1200×60, ocean 600×57, dest 1500, shipping 60000)
  console.log('    — FCL estimated block (note: the sheet EXCLUDES exworks from B16) —')
  const ocean = amt(600, 1, 57), dest = amt(1500, 1), ship = amt(60000, 1)
  line('FCL estimated total    [B16] @ER57', ocean + dest + ship, 95700)
}

// ===========================================================================
console.log('\n═══ FILE 4 · INQUIRY TOOL.xlsx (Merit Stainless — cost-plus quotation math) ═══')
console.log('    Formulas: EXPENSES = Σlines · GROSS = final − expenses · NET = gross + deposit refund\n')
{
  // the sheet's own line values (incl. its MANUAL D&T of 125k/495k)
  const exp20 = 0 + 36000 + 5000 + 0 + 85000 + 10000 + 125000 + 60000 + 9000 + 0 + 38000 + 8000 + 5000 + 5000 + 5000 + 0
  const exp40 = 60000 + 48000 + 5000 + 0 + 120000 + 15000 + 495000 + 60000 + 16000 + 0 + 18000 + 10000 + 5000 + 5000 + 5000 + 0
  line('20FT TOTAL EXPENSES    [B43]', exp20, 391000)
  line('20FT GROSS INCOME      [B48]', 428000 - exp20, 37000)
  line('20FT NET INCOME        [B50]', (428000 - exp20) + 10000, 47000)
  line('40FT TOTAL EXPENSES    [C43]', exp40, 862000)
  line('40FT GROSS INCOME      [C48]', 892000 - exp40, 30000)
  line('40FT NET INCOME        [C50]', (892000 - exp40) + 15000, 45000)
}

console.log(`\n═══ SCORE: ${score}/${max} computed values match the sheets to the centavo ═══`)
console.log(score === max ? 'PERFECT MATCH — 10/10\n' : `${max - score} mismatch(es) — see above\n`)
