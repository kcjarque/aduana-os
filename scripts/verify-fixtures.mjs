// CI acceptance tests for the D&T engine. Run: npm run verify
// Numbers are pre-verified against the brokerage's own Excel workbooks.
import assert from 'node:assert/strict'
import { computeDT, brokerageFee } from '../src/lib/compute.js'

let pass = 0
const approx = (a, b, eps = 0.01) => (typeof a === 'string' || typeof b === 'string')
  ? String(a) === String(b)
  : Math.abs(a - b) <= eps
function check(name, got, want, eps) {
  if (!approx(got, want, eps)) {
    console.error(`✗ ${name}: got ${got}, want ${want}`)
    process.exitCode = 1
  } else { console.log(`✓ ${name} = ${got}`); pass++ }
}

// base settings shared by fixtures; per-fixture feePolicy overrides applied inline
const base = {
  vatRate: 0.12, insuranceGeneral: 0.02, insuranceDG: 0.04,
  arrastre: { '20FT': 3727, '40FT': 8551, LCL: 4977 },
  wharfage: { '20FT': 519.35, '40FT': 779.05, LCL: 520 },
  csfUsd: { '20FT': 5, '40FT': 10 },
  stdFreight: { LCL: 400, AIR: 300, '20FT': 800, '40FT': 1200 },
  brokerageSchedule: { mode: 'formula', formula: { base: 5050, rate: 0.00125 } },
}
const item = (value, dutyRate = 0) => ({ id: String(value), value, dutyRate, basis: 'mfn', ahtnCode: '', description: '' })

// ---------- Fixture A — legacy VAGUS 4-item (legacy replication policy) ----------
{
  const s = { ...base, feePolicy: {
    cds: 265, cdsInSummary: false,
    ipfMode: 'flat', ipfFlat: 2000, ipfLegacySplit: true, ipfLandedCost: 1000,
  } }
  const r = computeDT({
    incoterm: 'FOB', currency: 'USD', fxRate: 56.665,
    freight: 1200, insuranceMode: 'actual', insuranceActual: 400,
    mode: 'FCL', n20: 1, n40: 0, vatExempt: false,
    items: [item(3000), item(6000), item(5000), item(6000)],
  }, s)
  console.log('\n— Fixture A (legacy VAGUS 4-item) —')
  check('A total DV', r.dv, 1223964.00)
  check('A brokerage', r.brokerage, 6579.955, 0.001)
  check('A item1 DV', r.lines[0].dv, 183594.60)
  check('A item1 VAT', r.lines[0].vat, 22249)
  check('A total VAT', r.vat, 148327)
  check('A CSF', r.csf, 283)
  check('A SUMMARY (payable to BOC)', r.totalBoc, 150610)
}

// ---------- Fixture B — same entry, current app default policy ----------
{
  const s = { ...base, feePolicy: {
    cds: 265, cdsInSummary: true,
    ipfMode: 'flat', ipfFlat: 2000, ipfLegacySplit: false,
  } }
  const r = computeDT({
    incoterm: 'FOB', currency: 'USD', fxRate: 56.665,
    freight: 1200, insuranceMode: 'actual', insuranceActual: 400,
    mode: 'FCL', n20: 1, n40: 0, vatExempt: false,
    items: [item(3000), item(6000), item(5000), item(6000)],
  }, s)
  console.log('\n— Fixture B (same entry, default policy) —')
  check('B item VATs', r.lines.map((l) => l.vat).join(','), '22267,44534,37112,44534')
  check('B total VAT', r.vat, 148447)
  check('B SUMMARY', r.totalBoc, 150995)
}

// ---------- Fixture C — single-item regression (unchanged from guide) ----------
{
  const s = { ...base, feePolicy: {
    cds: 130, cdsInSummary: true, ipfMode: 'flat', ipfFlat: 2000, ipfLegacySplit: false,
  } }
  const r = computeDT({
    incoterm: 'FOB', currency: 'USD', fxRate: 61,
    freight: 600, insuranceMode: 'dg', mode: 'FCL', n20: 0, n40: 0, vatExempt: false,
    items: [item(75000, 0)],
  }, s)
  console.log('\n— Fixture C (single-item regression) —')
  check('C total DV', r.dv, 4794600)
  check('C brokerage', r.brokerage, 11043.25)
  check('C landed cost', r.landedCost, 4807773.25)
  check('C VAT (unrounded, single)', r.vat, 576932.79)
  check('C SUMMARY', r.totalBoc, 579062.79)
}

// ---------- Brokerage bracket engine mechanics (synthetic, not client figures) ----------
{
  const s = { brokerageSchedule: { mode: 'brackets', brackets: [
    { upTo: 100000, fee: 1000 },
    { upTo: null, fee: { base: 1000, rateOnExcess: 0.01, over: 100000 } },
  ] } }
  console.log('\n— Brokerage bracket mechanics —')
  check('bracket @ DV 100k', brokerageFee(100000, s), 1000)
  check('bracket @ DV 150k (1000 + 1% excess)', brokerageFee(150000, s), 1500)
}

console.log(`\n${pass} assertions passed.`)
if (process.exitCode) console.error('\nFIXTURES FAILED'); else console.log('ALL FIXTURES GREEN ✔')
