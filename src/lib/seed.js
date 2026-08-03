import { computeDT, quoteTotals } from './compute'
import { uid } from './format'

// ---------------------------------------------------------------------------
// Settings — every BOC fee parameter is editable in Settings; seeded values
// follow CAO 1-2001 / CAO 2-2001 / CMO lineage. Port charges are SAMPLE
// figures to be verified against the current PPA / terminal schedule.
// ---------------------------------------------------------------------------
export const defaultSettings = {
  company: {
    name: 'Aduana Customs Brokerage Services',
    tagline: 'Licensed Customs Brokerage & Freight Forwarding',
    address: 'Suite 1104 Harbour Centre, South Harbor, Port Area, Manila 1018',
    tin: '007-345-921-000',
    ccb: 'PRC-CCB No. 2019-1187 · BOC Accreditation CB-4471',
    phone: '(02) 8527-4410',
    email: 'ops@aduana.ph',
    rep: 'Rowena D. Santos, LCB',
  },
  vatRate: 0.12,
  cds: 280,
  insuranceGeneral: 0.02,
  insuranceDG: 0.04,
  ipfBrackets: [
    { upTo: 250000, fee: 250 },
    { upTo: 500000, fee: 500 },
    { upTo: 750000, fee: 750 },
  ],
  ipfMax: 1000,
  brokerageBrackets: [
    { upTo: 10000, fee: 1300 },
    { upTo: 20000, fee: 2000 },
    { upTo: 30000, fee: 2700 },
    { upTo: 40000, fee: 3300 },
    { upTo: 50000, fee: 3600 },
    { upTo: 60000, fee: 4000 },
    { upTo: 100000, fee: 4700 },
    { upTo: 200000, fee: 5050 },
  ],
  brokerageExcessBase: 5050,
  brokerageExcessRate: 0.00125,
  brokerageExcessOver: 200000,
  arrastre: { '20FT': 3850, '40FT': 5720, LCL: 1200 },   // sample — verify vs current port tariff
  wharfage: { '20FT': 760, '40FT': 1140, LCL: 520 },     // sample — verify vs current PPA schedule
  quoteValidityDays: 15,
  marginFloor: 0.08,
  dpSplit: 0.7,
  currencies: ['USD', 'EUR', 'JPY', 'CNY', 'SGD', 'HKD', 'KRW', 'TWD', 'AUD', 'GBP'],
}

// The brokerage's standard 16-line quotation template
export const chargeTemplate = [
  { key: 'duty', label: 'Customs Duty', kind: 'boc', bocKey: 'duty' },
  { key: 'vat', label: 'Value-Added Tax (12%)', kind: 'boc', bocKey: 'vat' },
  { key: 'ipf', label: 'Import Processing Fee', kind: 'boc', bocKey: 'ipf' },
  { key: 'cds', label: 'Customs Documentary Stamp', kind: 'boc', bocKey: 'cds' },
  { key: 'arrastre', label: 'Arrastre', kind: 'boc', bocKey: 'arrastre' },
  { key: 'wharfage', label: 'Wharfage', kind: 'boc', bocKey: 'wharfage' },
  { key: 'brokerage', label: 'Brokerage Fee (CAO 1-2001)', kind: 'boc', bocKey: 'brokerage' },
  { key: 'freight', label: 'Ocean Freight', kind: 'service' },
  { key: 'thc', label: 'Terminal Handling Charge', kind: 'service' },
  { key: 'docs', label: 'Documentation / B/L Fee', kind: 'service' },
  { key: 'vasp', label: 'VASP / e2m Lodgement Fee', kind: 'service' },
  { key: 'atp', label: 'Container Guarantee / ATP Processing', kind: 'service' },
  { key: 'trucking', label: 'Trucking & Inland Delivery', kind: 'service' },
  { key: 'handling', label: 'Handling / Service Fee', kind: 'service' },
  { key: 'storage', label: 'Storage / Demurrage Provision', kind: 'service' },
  { key: 'misc', label: 'Miscellaneous, Notarial & Stamps', kind: 'service' },
]

export const DOC_KEYS = [
  'Commercial Invoice', 'Packing List', 'Bill of Lading', 'Certificate of Origin',
  'Import Permit / ATRIG', 'Marine Insurance', 'SAD / IEIRD', 'TAN',
  'SSDT', 'OLRS / Gate Pass', 'Delivery Receipt',
]

export const STAGES = [
  { id: 'booked', label: 'Booked' },
  { id: 'docs', label: 'Docs Prep' },
  { id: 'lodged', label: 'Lodged (VASP)' },
  { id: 'assessment', label: 'Assessment' },
  { id: 'payment', label: 'Duties Paid' },
  { id: 'release', label: 'Release' },
  { id: 'delivered', label: 'Delivered' },
]

// ---------------------------------------------------------------------------
// AHTN 2022 sample schedule (rates as decimals). SAMPLE DATA — the production
// dataset is requested from the Tariff Commission (public domain).
// ---------------------------------------------------------------------------
const T = (code, description, mfn, atiga, acfta, rcep, note) =>
  ({ code, description, mfn, atiga, acfta, rcep, note: note || '' })

export const tariffSeed = [
  T('8471.30.10', 'Portable computers (laptops, notebooks) ≤10 kg', 0, 0, 0, 0),
  T('8517.13.00', 'Smartphones', 0, 0, 0, 0),
  T('8528.72.91', 'LED/LCD colour television sets', 0.10, 0, 0.05, 0.08),
  T('8415.10.10', 'Split-type air conditioners ≤26.38 kW', 0.10, 0, 0.05, 0.07),
  T('8418.10.10', 'Combined refrigerator-freezers, household', 0.10, 0, 0.05, 0.08),
  T('8450.11.10', 'Fully-automatic washing machines ≤10 kg', 0.10, 0, 0.05, 0.08),
  T('9405.11.90', 'LED luminaires / light fittings', 0.10, 0, 0.05, 0.08),
  T('8541.43.00', 'Photovoltaic cells assembled in modules (solar panels)', 0, 0, 0, 0),
  T('8507.60.90', 'Lithium-ion accumulators (batteries)', 0.03, 0, 0, 0.03),
  T('8443.32.90', 'Printers, capable of connecting to a computer', 0, 0, 0, 0),
  T('8413.70.10', 'Centrifugal pumps, electrically operated', 0.03, 0, 0, 0.03),
  T('8481.80.99', 'Valves and similar appliances, other', 0.03, 0, 0, 0.03),
  T('8501.40.19', 'AC motors, single-phase, other', 0.03, 0, 0, 0.03),
  T('8708.30.90', 'Brakes and parts thereof, motor vehicles', 0.03, 0, 0, 0.03),
  T('8708.99.90', 'Other parts & accessories of motor vehicles', 0.03, 0, 0, 0.03),
  T('8711.20.45', 'Motorcycles 125cc–150cc, CBU', 0.30, 0, 0.20, 0.25),
  T('8703.23.51', 'Motor cars 1,500–2,000cc, CBU', 0.30, 0, 0.30, 0.30, 'Excise on automobiles applies'),
  T('4011.10.00', 'New pneumatic tyres, passenger cars', 0.10, 0, 0.05, 0.08),
  T('7210.41.11', 'Galvanized steel sheets, corrugated', 0.07, 0, 0, 0.05),
  T('7213.91.20', 'Bars and rods of iron/steel, hot-rolled, <14mm', 0.07, 0, 0, 0.05),
  T('7308.90.99', 'Structures and parts of structures, iron or steel', 0.10, 0, 0.05, 0.08),
  T('2523.29.90', 'Portland cement, other', 0.05, 0, 0, 0.05, 'Check safeguard duty'),
  T('2710.19.71', 'Lubricating oils', 0.03, 0, 0, 0.03, 'Excise on petroleum applies'),
  T('3907.61.00', 'Poly(ethylene terephthalate), ≥78 ml/g', 0.07, 0, 0, 0.05),
  T('3923.30.90', 'Plastic bottles, flasks and similar articles', 0.15, 0, 0.10, 0.12),
  T('3926.90.99', 'Other articles of plastics', 0.15, 0, 0.10, 0.12),
  T('4819.10.00', 'Cartons, boxes of corrugated paper', 0.15, 0, 0.10, 0.12),
  T('4802.56.90', 'Uncoated paper, 40–150 g/m², sheets', 0.07, 0, 0.05, 0.05),
  T('6109.10.10', 'T-shirts of cotton, knitted, for men/boys', 0.15, 0, 0.10, 0.12),
  T('6110.20.00', 'Pullovers, cardigans of cotton, knitted', 0.15, 0, 0.10, 0.12),
  T('6203.42.90', "Men's trousers of cotton, other", 0.15, 0, 0.10, 0.12),
  T('5208.52.00', 'Woven cotton fabrics, printed, plain weave', 0.10, 0, 0.05, 0.08),
  T('5407.61.90', 'Woven fabrics of non-textured polyester filaments', 0.10, 0, 0.05, 0.08),
  T('6402.99.90', 'Footwear, outer soles/uppers of rubber or plastics', 0.15, 0, 0.10, 0.12),
  T('6403.99.90', 'Footwear with leather uppers, other', 0.15, 0, 0.10, 0.12),
  T('4202.22.90', 'Handbags with outer surface of plastic/textile', 0.15, 0, 0.10, 0.12),
  T('9503.00.99', "Toys, other (incl. scale models)", 0.05, 0, 0, 0.03),
  T('9403.60.90', 'Wooden furniture, other', 0.15, 0, 0.10, 0.12),
  T('9401.61.00', 'Seats with wooden frames, upholstered', 0.15, 0, 0.10, 0.12),
  T('3304.99.90', 'Beauty / skin-care preparations, other', 0.07, 0, 0.05, 0.05),
  T('3305.10.90', 'Shampoos, other', 0.07, 0, 0.05, 0.05),
  T('3401.11.90', 'Soap for toilet use, other', 0.15, 0, 0.10, 0.12),
  T('3004.90.99', 'Medicaments, put up for retail sale, other', 0.03, 0, 0, 0, 'Many lines duty-free / VAT-exempt'),
  T('9018.90.30', 'Medical/surgical instruments and appliances', 0, 0, 0, 0),
  T('2106.90.99', 'Food preparations n.e.s., other', 0.15, 0, 0.10, 0.12, 'FDA LTO/CPR required'),
  T('1905.31.10', 'Sweet biscuits, not containing cocoa', 0.15, 0, 0.10, 0.12),
  T('1806.32.00', 'Chocolate, in blocks/slabs/bars, not filled', 0.15, 0, 0.10, 0.12),
  T('2202.99.90', 'Non-alcoholic beverages, other', 0.15, 0, 0.10, 0.12, 'Sweetened-beverage excise may apply'),
  T('0901.21.10', 'Coffee, roasted, not decaffeinated', 0.40, 0.05, 0.30, 0.35, 'In-quota/out-quota rates differ'),
  T('1006.30.99', 'Rice, semi-milled or wholly milled, other', 0.35, 0.35, 0.35, 0.35, 'RA 11203 rice tariffication'),
  T('1001.99.19', 'Wheat, other than durum, other', 0.07, 0, 0, 0.05),
  T('1701.99.11', 'Refined cane sugar, white', 0.65, 0.05, 0.50, 0.50, 'In-quota 50% / out-quota 65%'),
  T('0203.29.00', 'Frozen pork cuts, other', 0.40, 0, 0.30, 0.35, 'MAV in-quota 30% / out-quota 40%'),
  T('0207.14.91', 'Frozen chicken cuts, other', 0.40, 0, 0.30, 0.35, 'MAV rates apply'),
  T('0303.53.00', 'Frozen sardines and brisling/sprats', 0.15, 0, 0.10, 0.12),
  T('1601.00.10', 'Sausages of meat, in airtight containers', 0.15, 0, 0.10, 0.12),
  T('0402.21.20', 'Milk powder >1.5% fat, unsweetened, >20kg', 0.03, 0, 0, 0.03),
]

// ---------------------------------------------------------------------------
// Seed builder
// ---------------------------------------------------------------------------
const daysAgo = (n, h = 10) => {
  const d = new Date(Date.now() - n * 86400000)
  d.setHours(h, 15, 0, 0)
  return d.toISOString()
}

function buildFxWeeks() {
  const now = new Date()
  // BOC weekly rate runs Saturday–Friday
  const sat = new Date(now)
  sat.setDate(now.getDate() - ((now.getDay() + 1) % 7))
  sat.setHours(0, 0, 0, 0)
  const usd = [58.42, 58.35, 58.51, 58.28, 58.1, 58.33, 58.47, 58.19]
  const weeks = []
  for (let i = 0; i < 8; i++) {
    const start = new Date(sat.getTime() - i * 7 * 86400000)
    const end = new Date(start.getTime() + 6 * 86400000)
    const u = usd[i]
    weeks.push({
      id: uid(),
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      cmcNo: `CMC No. ${210 - i * 2}-2026`,
      rates: {
        USD: u,
        EUR: +(u * 1.084).toFixed(4),
        JPY: +(u * 0.00662).toFixed(4),
        CNY: +(u * 0.1381).toFixed(4),
        SGD: +(u * 0.7454).toFixed(4),
        HKD: +(u * 0.1276).toFixed(4),
        KRW: +(u * 0.000727).toFixed(5),
        TWD: +(u * 0.032).toFixed(4),
        AUD: +(u * 0.666).toFixed(4),
        GBP: +(u * 1.27).toFixed(4),
      },
    })
  }
  return weeks
}

const clientsSeed = [
  { name: 'Nova Electronics Distribution Inc.', tin: '221-884-370-000', address: 'EDSA Extension, Pasay City', contact: 'Marielle Chua', email: 'imports@novaelec.ph', phone: '0917 822 4410' },
  { name: 'Golden Harvest Trading Corp.', tin: '118-450-226-000', address: 'Dasmariñas St., Binondo, Manila', contact: 'Benedict Uy', email: 'ben@goldenharvest.ph', phone: '0917 330 8842' },
  { name: 'Bella Moda Apparel Imports', tin: '304-772-518-000', address: 'Chino Roces Ave., Makati City', contact: 'Katrina Reyes', email: 'kat@bellamoda.ph', phone: '0906 415 7789' },
  { name: 'PrimeBuild Construction Supply', tin: '156-903-441-000', address: 'Quirino Hwy, Quezon City', contact: 'Engr. Dario Lim', email: 'purchasing@primebuild.ph', phone: '0928 664 2035' },
  { name: 'MedEquip Solutions PH', tin: '412-118-905-000', address: 'BGC, Taguig City', contact: 'Dr. Alyssa Tan', email: 'alyssa@medequip.ph', phone: '0917 551 9926' },
  { name: 'Cebu HomeStyle Furnishings', tin: '289-336-702-000', address: 'A.S. Fortuna St., Mandaue, Cebu', contact: 'Ramon Villarosa', email: 'ramon@cebuhomestyle.ph', phone: '0933 402 1188' },
].map((c) => ({ id: uid(), ...c }))

const rc = (origin, dest, carrier, container, buyUsd, sellUsd, fromDays, toDays, notes) => ({
  id: uid(), origin, dest, carrier, container, buyUsd, sellUsd,
  validFrom: daysAgo(fromDays).slice(0, 10),
  validTo: new Date(Date.now() + toDays * 86400000).toISOString().slice(0, 10),
  notes: notes || '',
})

const rateCardsSeed = [
  rc('Shanghai, CN', 'Manila (South Harbor)', 'COSCO', '20FT', 650, 850, 30, 32, 'Incl. BAF/CAF'),
  rc('Shanghai, CN', 'Manila (South Harbor)', 'COSCO', '40FT', 900, 1150, 30, 32, 'Incl. BAF/CAF'),
  rc('Ningbo, CN', 'Manila (MICT)', 'Evergreen', '40FT', 880, 1120, 25, 20),
  rc('Xiamen, CN', 'Cebu', 'SITC', '20FT', 700, 920, 25, 11, 'Transship HK'),
  rc('Hong Kong', 'Manila (MICT)', 'OOCL', '20FT', 500, 680, 40, 8),
  rc('Busan, KR', 'Manila (South Harbor)', 'Wan Hai', '40FT', 950, 1200, 35, 24),
  rc('Kaohsiung, TW', 'Manila (MICT)', 'Wan Hai', '20FT', 520, 700, 35, 5, 'Expiring — renegotiate'),
  rc('Bangkok, TH', 'Manila (South Harbor)', 'CMA CGM', '40FT', 780, 990, 28, 18),
  rc('Jakarta, ID', 'Manila (MICT)', 'MCC Transport', '20FT', 690, 880, 45, -3, 'EXPIRED'),
]

// service-line values: { key: [[buy,sell] per column] }
function makeLines(cols, vals) {
  return chargeTemplate.map((t) => ({
    id: t.key, label: t.label, kind: t.kind, bocKey: t.bocKey,
    values: t.kind === 'service'
      ? Object.fromEntries(cols.map((c, ci) => [c, { buy: vals[t.key]?.[ci]?.[0] ?? 0, sell: vals[t.key]?.[ci]?.[1] ?? 0 }]))
      : undefined,
  }))
}

const sv20 = {
  freight: [[37700, 49300]], thc: [[7300, 8500]], docs: [[1200, 2500]],
  vasp: [[850, 1500]], atp: [[500, 1800]], trucking: [[8500, 11000]],
  handling: [[0, 3500]], storage: [[0, 0]], misc: [[300, 800]],
}
const sv40 = {
  freight: [[52200, 66700]], thc: [[10900, 12600]], docs: [[1200, 2500]],
  vasp: [[850, 1500]], atp: [[500, 1800]], trucking: [[9800, 13500]],
  handling: [[0, 3800]], storage: [[0, 0]], misc: [[300, 800]],
}
const svBoth = Object.fromEntries(Object.keys(sv20).map((k) => [k, [sv20[k][0], sv40[k][0]]]))

function makeSeed() {
  const fxWeeks = buildFxWeeks()
  const fxNow = fxWeeks[0].rates.USD
  const C = clientsSeed

  const dti = (over) => ({
    incoterm: 'FOB', currency: 'USD', fxRate: fxNow, freight: 0,
    insuranceMode: 'general', insuranceActual: 0, basis: 'mfn',
    bankCharges: 0, excise: 0, vatExempt: false, qty: 1,
    arrastreOverride: null, wharfageOverride: null, brokerageOverride: null,
    ...over,
  })

  const Q = (n, o) => ({
    id: uid(), no: `AQ-2026-${String(n).padStart(4, '0')}`,
    presentation: 'itemized', signature: null, notes: '', chosenCol: null,
    approvedAt: null, sentAt: null, lostAt: null, ...o,
  })

  const quotes = [
    Q(101, {
      clientId: C[0].id, origin: 'Shanghai, CN', dest: 'Manila (South Harbor)',
      commodity: 'Laptops — 820 units', columns: ['40FT'], lines: makeLines(['40FT'], sv40),
      dtInputs: dti({ value: 48500, freight: 900, ahtnCode: '8471.30.10', description: 'Portable computers (laptops)', dutyRate: 0 }),
      status: 'booked', createdAt: daysAgo(43), sentAt: daysAgo(42), approvedAt: daysAgo(40),
      validUntil: daysAgo(27).slice(0, 10),
    }),
    Q(102, {
      clientId: C[2].id, origin: 'Xiamen, CN', dest: 'Manila (MICT)',
      commodity: 'Cotton T-shirts — 14,400 pcs', columns: ['20FT'], lines: makeLines(['20FT'], sv20),
      dtInputs: dti({ value: 22000, freight: 650, ahtnCode: '6109.10.10', description: 'T-shirts of cotton, knitted', dutyRate: 0.15 }),
      status: 'booked', createdAt: daysAgo(30), sentAt: daysAgo(29), approvedAt: daysAgo(27),
      validUntil: daysAgo(14).slice(0, 10),
    }),
    Q(103, {
      clientId: C[3].id, origin: 'Shanghai, CN', dest: 'Manila (South Harbor)',
      commodity: 'Galvanized steel sheets — 24 MT', columns: ['40FT'], lines: makeLines(['40FT'], sv40),
      dtInputs: dti({ value: 39000, freight: 900, ahtnCode: '7210.41.11', description: 'Galvanized steel sheets', dutyRate: 0.07 }),
      status: 'booked', createdAt: daysAgo(22), sentAt: daysAgo(21), approvedAt: daysAgo(19),
      validUntil: daysAgo(6).slice(0, 10),
    }),
    Q(104, {
      clientId: C[1].id, origin: 'Bangkok, TH', dest: 'Manila (South Harbor)',
      commodity: 'Food preparations — 1,150 ctns', columns: ['20FT'], lines: makeLines(['20FT'], sv20),
      dtInputs: dti({ value: 18500, freight: 700, ahtnCode: '2106.90.99', description: 'Food preparations n.e.s. (ATIGA Form D)', basis: 'atiga', dutyRate: 0 }),
      status: 'booked', createdAt: daysAgo(15), sentAt: daysAgo(14), approvedAt: daysAgo(12),
      validUntil: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
    }),
    Q(105, {
      clientId: C[4].id, origin: 'Hong Kong', dest: 'Manila (MICT)',
      commodity: 'Medical instruments — 96 crates', columns: ['20FT'], lines: makeLines(['20FT'], sv20),
      dtInputs: dti({ value: 31000, freight: 520, ahtnCode: '9018.90.30', description: 'Medical/surgical instruments', dutyRate: 0 }),
      status: 'booked', createdAt: daysAgo(10), sentAt: daysAgo(9), approvedAt: daysAgo(8),
      validUntil: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    }),
    Q(106, {
      clientId: C[5].id, origin: 'Ningbo, CN', dest: 'Cebu',
      commodity: 'Wooden furniture — 380 pcs', columns: ['20FT', '40FT'], lines: makeLines(['20FT', '40FT'], svBoth),
      dtInputs: dti({ value: 26400, freight: 780, ahtnCode: '9403.60.90', description: 'Wooden furniture', dutyRate: 0.15 }),
      status: 'approved', createdAt: daysAgo(6), sentAt: daysAgo(5), approvedAt: daysAgo(2),
      validUntil: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10),
      notes: 'Client to confirm container size on booking.',
    }),
    Q(107, {
      clientId: C[0].id, origin: 'Shenzhen, CN', dest: 'Manila (MICT)',
      commodity: 'LED televisions — 640 units', columns: ['40FT'], lines: makeLines(['40FT'], sv40),
      dtInputs: dti({ value: 52000, freight: 950, ahtnCode: '8528.72.91', description: 'LED colour television sets', dutyRate: 0.10 }),
      status: 'sent', createdAt: daysAgo(4), sentAt: daysAgo(3),
      validUntil: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
    }),
    Q(108, {
      clientId: C[1].id, origin: 'Ho Chi Minh, VN', dest: 'Manila (South Harbor)',
      commodity: 'Roasted coffee — 18 MT', columns: ['20FT'], lines: makeLines(['20FT'], sv20),
      dtInputs: dti({ value: 24000, freight: 600, ahtnCode: '0901.21.10', description: 'Coffee, roasted (ATIGA Form D)', basis: 'atiga', dutyRate: 0.05 }),
      status: 'sent', createdAt: daysAgo(1, 9), sentAt: daysAgo(1, 14),
      validUntil: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    }),
    Q(109, {
      clientId: C[3].id, origin: 'Qingdao, CN', dest: 'Manila (South Harbor)',
      commodity: 'Portland cement — 560 bags', columns: ['40FT'], lines: makeLines(['40FT'], sv40),
      dtInputs: dti({ value: 21000, freight: 880, ahtnCode: '2523.29.90', description: 'Portland cement', dutyRate: 0.05 }),
      status: 'draft', createdAt: daysAgo(0, 9),
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    }),
    Q(110, {
      clientId: C[2].id, origin: 'Guangzhou, CN', dest: 'Manila (MICT)',
      commodity: 'Rubber footwear — 6,200 pairs', columns: ['20FT'], lines: makeLines(['20FT'], sv20),
      dtInputs: dti({ value: 19800, freight: 640, ahtnCode: '6402.99.90', description: 'Footwear, rubber/plastic uppers', dutyRate: 0.15 }),
      status: 'lost', createdAt: daysAgo(19), sentAt: daysAgo(18), lostAt: daysAgo(12),
      validUntil: daysAgo(3).slice(0, 10), notes: 'Lost on price — competitor quoted all-in ₱12k lower.',
    }),
    Q(111, {
      clientId: C[4].id, origin: 'Busan, KR', dest: 'Manila (South Harbor)',
      commodity: 'Industrial valves — 210 crates', columns: ['40FT'], lines: makeLines(['40FT'], sv40),
      dtInputs: dti({ value: 44000, freight: 1000, ahtnCode: '8481.80.99', description: 'Valves and similar appliances', dutyRate: 0.03 }),
      status: 'booked', createdAt: daysAgo(48), sentAt: daysAgo(47), approvedAt: daysAgo(45),
      validUntil: daysAgo(32).slice(0, 10),
    }),
  ]

  // -------- shipments (from booked quotes) --------
  const s = defaultSettings
  const totalOf = (q, col) => {
    const dtByCol = Object.fromEntries(q.columns.map((c) => [c, computeDT(q.dtInputs, c, s)]))
    return quoteTotals(q, dtByCol)[col].sell
  }
  const docs = (upTo, baseDay) => Object.fromEntries(
    DOC_KEYS.map((k, idx) => [k, idx < upTo ? { done: true, date: daysAgo(baseDay - idx).slice(0, 10) } : { done: false, date: null }])
  )
  const SH = (n, q, o) => {
    const total = totalOf(q, o.col)
    return {
      id: uid(), refNo: `SH-2026-${String(n).padStart(4, '0')}`, quoteId: q.id, clientId: q.clientId,
      containerLabel: `1×${o.col}`, col: o.col,
      billing: {
        total, dpAmt: Math.round(total * s.dpSplit), balAmt: total - Math.round(total * s.dpSplit),
        dpPaidAt: o.dpPaidAt || null, balPaidAt: o.balPaidAt || null,
      },
      notes: '', ...o,
    }
  }

  const shipments = [
    SH(31, quotes[10], {
      col: '40FT', stage: 'delivered', lane: 'green', blNo: 'WHLU2263118', vessel: 'Wan Hai 315 V.088N',
      eta: daysAgo(38).slice(0, 10), docs: docs(11, 40), dpPaidAt: daysAgo(45), balPaidAt: daysAgo(36),
      events: [
        { ts: daysAgo(45), label: 'Booking confirmed · 70% DP received' },
        { ts: daysAgo(39), label: 'SAD lodged via VASP — Entry No. 118-2026-0709912' },
        { ts: daysAgo(38), label: 'Selectivity: GREEN lane' },
        { ts: daysAgo(37), label: 'Duties & taxes paid (PAS6)' },
        { ts: daysAgo(35), label: 'Delivered to consignee warehouse, Taguig' },
      ],
    }),
    SH(32, quotes[0], {
      col: '40FT', stage: 'delivered', lane: 'green', blNo: 'COSU6390022', vessel: 'COSCO Shipping Denali V.062E',
      eta: daysAgo(31).slice(0, 10), docs: docs(11, 33), dpPaidAt: daysAgo(40), balPaidAt: daysAgo(28),
      events: [
        { ts: daysAgo(40), label: 'Booking confirmed · 70% DP received' },
        { ts: daysAgo(32), label: 'SAD lodged via VASP — Entry No. 118-2026-0713366' },
        { ts: daysAgo(31), label: 'Selectivity: GREEN lane' },
        { ts: daysAgo(28), label: 'Delivered to consignee warehouse, Pasay' },
      ],
    }),
    SH(33, quotes[1], {
      col: '20FT', stage: 'release', lane: 'green', blNo: 'SITU8827741', vessel: 'SITC Nagoya V.2311S',
      eta: daysAgo(6).slice(0, 10), docs: docs(10, 12), dpPaidAt: daysAgo(26), balPaidAt: daysAgo(1),
      events: [
        { ts: daysAgo(26), label: 'Booking confirmed · 70% DP received' },
        { ts: daysAgo(5), label: 'SAD lodged via VASP — Entry No. 118-2026-0729810' },
        { ts: daysAgo(4), label: 'Selectivity: GREEN lane' },
        { ts: daysAgo(2), label: 'Duties & taxes paid (PAS6)' },
        { ts: daysAgo(1), label: '30% balance received — gate pass processing' },
      ],
    }),
    SH(34, quotes[2], {
      col: '40FT', stage: 'payment', lane: 'yellow', blNo: 'COSU6417755', vessel: 'COSCO Shipping Andes V.071E',
      eta: daysAgo(3).slice(0, 10), docs: docs(9, 8), dpPaidAt: daysAgo(18),
      events: [
        { ts: daysAgo(18), label: 'Booking confirmed · 70% DP received' },
        { ts: daysAgo(2), label: 'SAD lodged via VASP — Entry No. 118-2026-0734402' },
        { ts: daysAgo(1), label: 'Selectivity: YELLOW lane — documentary check' },
        { ts: daysAgo(0, 9), label: 'TAN printed — awaiting PAS6 payment' },
      ],
    }),
    SH(35, quotes[3], {
      col: '20FT', stage: 'assessment', lane: 'red', blNo: 'CMDU5108827', vessel: 'CMA CGM Osiris V.104N',
      eta: daysAgo(2).slice(0, 10), docs: docs(8, 6), dpPaidAt: daysAgo(11),
      events: [
        { ts: daysAgo(11), label: 'Booking confirmed · 70% DP received' },
        { ts: daysAgo(1), label: 'SAD lodged via VASP — Entry No. 118-2026-0736119' },
        { ts: daysAgo(0, 8), label: 'Selectivity: RED lane — physical examination scheduled' },
      ],
      notes: 'FDA import permit attached; examiner appointment Thursday AM, South Harbor CY.',
    }),
    SH(36, quotes[4], {
      col: '20FT', stage: 'lodged', lane: null, blNo: 'OOLU2648811', vessel: 'OOCL Nagoya V.155S',
      eta: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10), docs: docs(6, 4), dpPaidAt: daysAgo(7),
      events: [
        { ts: daysAgo(7), label: 'Booking confirmed · 70% DP received' },
        { ts: daysAgo(0, 11), label: 'SAD lodged via VASP — Entry No. 118-2026-0737254' },
      ],
    }),
  ]

  return {
    version: 3,
    settings: defaultSettings,
    fxWeeks,
    tariffLines: tariffSeed.map((t) => ({ id: uid(), ...t })),
    clients: clientsSeed,
    rateCards: rateCardsSeed,
    quotes,
    shipments,
    counters: { quote: 112, shipment: 37 },
  }
}

export default makeSeed
