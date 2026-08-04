import { computeDT, quoteTotals, dtInputsForCol, defaultDtItem } from './compute'
import { uid } from './format'
import { truckingSeed } from './trucking'

// ---------------------------------------------------------------------------
// Settings — every fee parameter mirrors the brokerage's own Excel tools.
// ---------------------------------------------------------------------------
export const defaultSettings = {
  company: {
    name: 'H.R. Villa Customs Brokerage',
    tagline: 'Licensed Customs Brokerage & Freight Forwarding',
    address: 'Port Area, Manila',
    tin: '000-000-000-000',
    ccb: 'PRC-CCB No. ____ · BOC Accreditation ____',
    phone: '(02) 8000-0000',
    email: 'ops@hrvilla.ph',
    rep: 'H.R. Villa, LCB',
  },
  vatRate: 0.12,
  insuranceGeneral: 0.02,       // 2% of value — general cargo
  insuranceDG: 0.04,            // 4% — dangerous cargo
  arrastre: { '20FT': 3727, '40FT': 8551, LCL: 4977 },     // sheet cells D37/D38
  wharfage: { '20FT': 519.35, '40FT': 779.05, LCL: 520 },  // sheet cells D35/D36
  csfUsd: { '20FT': 5, '40FT': 10 },                       // CSF: $5 / $10 per cntr × E.R.
  stdFreight: { LCL: 400, AIR: 300, '20FT': 800, '40FT': 1200 },

  // Brokerage schedule — config-driven (P1-4). Default = the client's formula.
  brokerageSchedule: {
    mode: 'formula',                             // 'formula' | 'brackets'
    formula: { base: 5050, rate: 0.00125 },      // DV × 0.125% + ₱5,050
    // CAO 1-2001 bracket table — SEEDED UNVERIFIED, enable only after client confirms.
    brackets: [
      { upTo: 10000, fee: 1300 }, { upTo: 20000, fee: 2000 }, { upTo: 30000, fee: 2700 },
      { upTo: 40000, fee: 3300 }, { upTo: 50000, fee: 3600 }, { upTo: 60000, fee: 4000 },
      { upTo: 100000, fee: 4700 }, { upTo: 200000, fee: 5050 },
      { upTo: null, fee: { base: 5050, rateOnExcess: 0.00125, over: 200000 } },
    ],
  },

  // BOC fee policy (P2-6) — CDS / IPF / summary quirk, one place.
  feePolicy: {
    cds: 265,                    // legacy tool & confirmation copy (quick tool uses 130)
    cdsInSummary: true,          // ON = current app; OFF = legacy workbook summary
    ipfMode: 'flat',             // 'flat' | 'brackets'
    ipfFlat: 2000,               // flat "STANDARD" per client tools
    ipfBrackets: [               // CAO 2-2001 (used only when ipfMode='brackets')
      { upTo: 250000, fee: 250 }, { upTo: 500000, fee: 500 },
      { upTo: 750000, fee: 750 }, { upTo: null, fee: 1000 },
    ],
    ipfLegacySplit: false,       // advanced: different IPF in landed cost vs summary (Fixture A)
    ipfLandedCost: 1000,         // used only when ipfLegacySplit = true
  },

  quoteValidityDays: 15,
  profitFloor: 30000,           // inquiry-tool guidance: "PROFIT RANGE: 30K-50K"
  profitTarget: 50000,
  dpSplit: 0.7,
  currencies: ['USD', 'EUR', 'JPY', 'CNY', 'SGD', 'HKD', 'KRW', 'TWD', 'AUD', 'GBP'],
  carriers: ['Benline', 'China Shipping', 'CMA CGM', 'COSCO', 'Evergreen', 'Hanjin',
    'K-LINE', 'MCC', 'MOL', 'NYK', 'OOCL', 'RCL', 'SITC', 'SKY Intl.', 'Uni-Ship', 'Wallem', 'Wan Hai'],
}

// The client's INQUIRY TOOL — its exact 16 computation lines with remarks.
export const chargeTemplate = [
  { key: 'origin', label: 'Origin Charges', remark: '$800.00/20FT / $1,000.00/40FT (EXW only)', d20: 0, d40: 0 },
  { key: 'freight', label: 'Air / Ocean Freight', remark: '$600.00/20FT / $800.00/40FT', d20: 36000, d40: 48000 },
  { key: 'destFwd', label: 'Dest. Forwarder Charges', remark: '', d20: 5000, d40: 5000 },
  { key: 'customsWhse', label: 'Customs Whse & Storage', remark: 'For LCL or AIR shipments only', d20: 0, d40: 0 },
  { key: 'lines', label: 'Shipping Lines Charges', remark: '20FT-85K / 40FT-120K (beyond the package is chargeable)', d20: 85000, d40: 120000 },
  { key: 'deposit', label: 'Container Deposit', remark: '20FT 10-15K / 40FT 15-20K (refunded on empty return)', d20: 10000, d40: 15000, refundable: true },
  { key: 'dt', label: 'Duties & Taxes', remark: 'Auto — BOC computation below', locked: true },
  { key: 'process', label: 'Customs Process & O.T.', remark: 'Range: 50K-60K for FCL (SGL)', d20: 60000, d40: 60000 },
  { key: 'arrastre', label: 'Arrastre / Wharfage', remark: '20FT-9K / 40FT-16K', d20: 9000, d40: 16000 },
  { key: 'wharfinger', label: 'Whse & Wharfinger', remark: 'For LCL or AIR shipments only', d20: 0, d40: 0 },
  { key: 'trucking', label: 'Trucking & Delivery', remark: 'Auto — from trucking tariff by city', d20: 15000, d40: 18000 },
  { key: 'royalty', label: 'Cnee Royalty', remark: '20FT-8K / 40FT-10K', d20: 8000, d40: 10000 },
  { key: 'misc', label: 'Miscellaneous', remark: '', d20: 5000, d40: 5000 },
  { key: 'commission', label: 'Commission', remark: 'Range: 3K-5K', d20: 5000, d40: 5000 },
  { key: 'signing', label: 'Signing Broker', remark: '', d20: 5000, d40: 5000 },
  { key: 'allin', label: 'All-in Arrangement', remark: '', d20: 0, d40: 0 },
]

export const DOC_KEYS = [
  'Commercial Invoice', 'Packing List', 'Bill of Lading', 'Certificate of Origin (Form E/D)',
  'Import Permit / ATRIG', 'Marine Insurance', 'PRF', 'SDV', "Client's Confirmation Copy",
  'IEIRD (Import Entry) + Riders', 'CG / ATP Letter (per carrier)', 'TAN', 'SSDT',
  'OLRS / Gate Pass', 'Delivery Receipt',
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
// Tariff library — the client's own "Frequently Used Tariff Headings" list
// (source FAVORITES, ranked first) + a few AHTN 2022 chapters so demo searches
// for unlisted commodities still hit (source TARIFF_BOOK_2022).
// ---------------------------------------------------------------------------
const TH = (description, code, tr, src = 'FAVORITES') => ({
  code, description, mfn: tr, atiga: 0, acfta: 0, rcep: tr, note: '', source: src,
})

const favorites = [
  TH('Adhesive Tapes', '5906.10.00', 0.10), TH('Art Accessories', '4810.13.19', 0.01),
  TH('Art Ware (picture frame, flower display, etc.)', '4810.13.19', 0.01),
  TH('Artificial Eyelashes', '3402.90.12', 0.05), TH('Bathroom Tissue', '4803.00.90', 0.10),
  TH('Bathroom Ware', '3922.10.00', 0.15), TH('Bath Tub', '6911.90.00', 0.15),
  TH('Calendar', '4910.00.00', 0.15), TH('Calculator', '9017.10.90', 0.03),
  TH('Car Windshield', '7002.29.90', 0.10), TH("Children's Bicycle", '8712.00.20', 0.15),
  TH("Children's Plastic Toys", '9503.00.99', 0.10), TH('Commercial Refrigerator', '8418.50.19', 0.05),
  TH('Concrete Nails', '7317.00.90', 0.10), TH('Condiments', '2103.90.90', 0.07),
  TH('Cotton Swabs (cotton buds)', '9619.00.99', 0.15), TH('Curtain Rod', '8302.42.90', 0.10),
  TH('Dental Chair', '9402.10.10', 0.07), TH('Dental Floss', '3306.20.00', 0.03),
  TH('Display Racks', '9403.60.90', 0.15), TH('Duck Tape', '3919.90.90', 0.15),
  TH('Electric Stoves', '8516.90.90', 0.05), TH('Electric Oven (industrial)', '8417.20.00', 0),
  TH('Eyeglass', '7018.90.00', 0.10), TH('Fabrics', '5208.19.00', 0.10),
  TH('Face Powder', '3402.90.99', 0.05), TH('Fan', '8414.51.10', 0.07),
  TH('Flashlight', '8539.29.49', 0.01), TH('Furniture', '9403.60.90', 0.15),
  TH('Garments (children, mens & womens shirts, etc.)', '6104.12.00', 0.15),
  TH('G.I. Wire (concrete nails)', '7317.00.90', 0.10), TH('Glass Bottle', '7013.37.00', 0.10),
  TH('Gloves, PVC Cover', '6116.99.00', 0.15), TH('Hair Accessories (hairpin, earring, wigs, etc.)', '4818.90.00', 0.15),
  TH('Hardware Items', '8201.90.00', 0.10), TH('Hardware Tool Box', '8201.90.00', 0.10),
  TH('Hat', '6505.00.90', 0.15), TH('Hot Water Bags', '4014.90.90', 0.03),
  TH('Household Ware', '3924.10.00', 0.15), TH('Ice Cream Machine', '8476.89.00', 0.03),
  TH('Incense', '4421.90.99', 0.10), TH('Key Chains', '7326.90.20', 0.15),
  TH('Kitchenware', '3924.10.00', 0.15), TH('Knitted Gloves', '6116.99.00', 0.15),
  TH('Ladies Accessories', '4818.90.00', 0.10), TH('Lamps / Lighting', '8513.10.90', 0.07),
  TH('Lavatory Brush', '9603.90.40', 0.07), TH('Leather Bags', '4202.11.00', 0.15),
  TH('Leather Shoes', '6404.11.90', 0.15), TH('Mattings', '4016.91.10', 0.07),
  TH('Microphone', '8518.10.90', 0.05), TH('Nail Cutters', '8214.90.00', 0.10),
  TH('Notebook / Writing Pad', '4820.10.00', 0.15), TH('Office Supplies (writing pads, paper documents, etc.)', '4820.10.00', 0.15),
  TH('Oven (household, plastic parts)', '3923.30.20', 0), TH('Packing Boxes', '4819.10.10', 0.07),
  TH('Packing Tape', '3919.90.90', 0.15), TH('Paper Cup', '8423.69.00', 0.10),
  TH('Pigments', '3204.17.00', 0.01), TH('Plastic Air Pump', '8414.80.90', 0.01),
  TH('Plastic Beads', '3926.90.89', 0.03), TH('Plastic Drums / Plastic Cup', '3923.10.90', 0.15),
  TH('Plastic Gloves', '3926.20.90', 0.15), TH('Plasticware (nipple, plastic hose, etc.)', '3917.29.00', 0.15),
  TH('Polyester Fabrics', '5208.19.00', 0.10), TH('Push Carts', '8716.80.90', 0.05),
  TH('PVC Balls', '9506.69.00', 0.01), TH('PVC Pipe', '3917.29.00', 0.15),
  TH('RTW Garments', '6104.42.00', 0.15), TH('Scarf', '6117.10.90', 0.15),
  TH('Shoe Materials', '6406.90.39', 0.01), TH('Shower Head', '7326.90.99', 0.15),
  TH('Slippers', '6402.91.99', 0.15), TH('Snack Foods', '1904.20.90', 0.07),
  TH('Speakers', '8518.29.90', 0.10), TH('Sporting Goods', '9506.99.00', 0.01),
  TH('Spray, Made of Plastic', '9616.10.10', 0.07), TH('Stainless Brush', '7222.30.90', 0.03),
  TH('Sticker', '4811.41.90', 0.01), TH('Sunglasses', '9004.10.00', 0.05),
  TH('Swimming Goggles', '9004.90.50', 0.05), TH('Swimming Rings', '9506.29.00', 0.01),
  TH('Travelling Bag', '4202.29.00', 0.15), TH('Umbrella', '6601.99.00', 0.15),
  TH('Umbrella Nail', '7317.00.90', 0.10), TH('Wall Clock', '9110.90.00', 0.03),
  TH('Welding Rod', '8311.10.10', 0.10), TH('Writing Paper', '4802.69.00', 0.10),
]

// Selected AHTN 2022 chapter rows (39 plastics, 73 iron/steel, 84-85 machinery/
// electrical, 94 furniture) — SAMPLE from the Tariff Book, verify per line.
const B = (description, code, tr) => TH(description, code, tr, 'TARIFF_BOOK_2022')
const bookRows = [
  B('Polymers of ethylene, primary forms', '3901.10.92', 0.03),
  B('Polymers of propylene, primary forms', '3902.10.30', 0.03),
  B('Poly(vinyl chloride), not mixed', '3904.10.90', 0.03),
  B('Self-adhesive plates/sheets of plastics', '3919.10.90', 0.15),
  B('Plastic tableware & kitchenware', '3924.10.00', 0.15),
  B('Plastic builders ware (doors, frames)', '3925.20.00', 0.15),
  B('Other articles of plastics, n.e.s.', '3926.90.99', 0.10),
  B('Flat-rolled iron/steel, hot-rolled, ≥600mm', '7208.39.00', 0.03),
  B('Flat-rolled iron/steel, plated with zinc', '7210.49.19', 0.10),
  B('Bars & rods, hot-rolled, of iron/steel', '7214.20.31', 0.05),
  B('Angles/shapes/sections of iron/steel', '7216.61.00', 0.07),
  B('Tubes/pipes, welded, of iron/steel', '7306.30.90', 0.07),
  B('Screws, bolts, nuts of iron/steel', '7318.15.90', 0.10),
  B('Other articles of iron or steel', '7326.90.99', 0.10),
  B('Air conditioning machines, window/wall', '8415.10.90', 0.10),
  B('Refrigerators, household, compression', '8418.21.00', 0.05),
  B('Centrifugal pumps, single-stage', '8413.70.19', 0.01),
  B('Electric motors, output ≤ 37.5 W', '8501.10.99', 0.01),
  B('Electric generating sets, diesel', '8502.11.00', 0.03),
  B('Insulated wire/cable, ≤ 1000 V', '8544.49.29', 0.10),
  B('Electrical apparatus for switching', '8536.50.99', 0.05),
  B('Lamps & lighting fittings, LED', '9405.42.90', 0.10),
  B('Seats with metal frames, upholstered', '9401.71.00', 0.15),
  B('Wooden furniture for offices', '9403.30.00', 0.15),
  B('Mattresses of cellular rubber/plastics', '9404.21.90', 0.15),
]

export const tariffSeed = [...favorites, ...bookRows]

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
      id: uid(), start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10),
      cmcNo: `CMC No. ${210 - i * 2}-2026`,
      rates: {
        USD: u, EUR: +(u * 1.084).toFixed(4), JPY: +(u * 0.00662).toFixed(4),
        CNY: +(u * 0.1381).toFixed(4), SGD: +(u * 0.7454).toFixed(4), HKD: +(u * 0.1276).toFixed(4),
        KRW: +(u * 0.000727).toFixed(5), TWD: +(u * 0.032).toFixed(4), AUD: +(u * 0.666).toFixed(4),
        GBP: +(u * 1.27).toFixed(4),
      },
    })
  }
  return weeks
}

const clientsSeed = [
  { name: 'Merit Stainless Steel Inc.', tin: '221-884-370-000', address: 'Marikina City', contact: 'Sir Marco (Marco Angelo Castro)', email: 'castro.marcoangelo16@yahoo.com', phone: '0995 559 2473' },
  { name: 'Vagus Medical Equipment and Supplies Trading', tin: '118-450-226-000', address: 'Quezon City', contact: 'Ms. Reyes', email: 'imports@vagusmedical.ph', phone: '0917 330 8842' },
  { name: 'Golden Harvest Trading Corp.', tin: '304-772-518-000', address: 'Dasmariñas St., Binondo, Manila', contact: 'Benedict Uy', email: 'ben@goldenharvest.ph', phone: '0917 822 4410' },
  { name: 'PrimeBuild Construction Supply', tin: '156-903-441-000', address: 'Quirino Hwy, Quezon City', contact: 'Engr. Dario Lim', email: 'purchasing@primebuild.ph', phone: '0928 664 2035' },
  { name: 'Bella Moda Apparel Imports', tin: '412-118-905-000', address: 'Chino Roces Ave., Makati City', contact: 'Katrina Reyes', email: 'kat@bellamoda.ph', phone: '0906 415 7789' },
  { name: 'Cebu HomeStyle Furnishings', tin: '289-336-702-000', address: 'A.S. Fortuna St., Mandaue, Cebu', contact: 'Ramon Villarosa', email: 'ramon@cebuhomestyle.ph', phone: '0933 402 1188' },
].map((c) => ({ id: uid(), ...c }))

const rc = (origin, dest, carrier, container, buyUsd, sellUsd, fromDays, toDays, notes) => ({
  id: uid(), origin, dest, carrier, container, buyUsd, sellUsd,
  validFrom: daysAgo(fromDays).slice(0, 10),
  validTo: new Date(Date.now() + toDays * 86400000).toISOString().slice(0, 10),
  notes: notes || '',
})

const rateCardsSeed = [
  rc('Shanghai, CN', 'Manila (South Harbor)', 'COSCO', '20FT', 600, 800, 30, 32, 'Std dutiable rate $800'),
  rc('Shanghai, CN', 'Manila (South Harbor)', 'COSCO', '40FT', 800, 1100, 30, 32, 'Std dutiable rate $1,200'),
  rc('Ningbo, CN', 'Manila (MICT)', 'Evergreen', '40FT', 780, 1050, 25, 20),
  rc('Xiamen, CN', 'Cebu', 'SITC', '20FT', 650, 880, 25, 11, 'Transship HK'),
  rc('Hong Kong', 'Manila (MICT)', 'OOCL', '20FT', 480, 650, 40, 8),
  rc('Busan, KR', 'Manila (South Harbor)', 'Wan Hai', '40FT', 900, 1150, 35, 24),
  rc('Kaohsiung, TW', 'Manila (MICT)', 'Wan Hai', '20FT', 500, 680, 35, 5, 'Expiring — renegotiate'),
  rc('Bangkok, TH', 'Manila (South Harbor)', 'CMA CGM', '40FT', 760, 980, 28, 18),
  rc('Jakarta, ID', 'Manila (MICT)', 'MCC', '20FT', 670, 860, 45, -3, 'EXPIRED'),
]

function makeLines(cols, vals = {}) {
  return chargeTemplate.map((t) => ({
    key: t.key, label: t.label, remark: t.remark,
    locked: !!t.locked, refundable: !!t.refundable,
    values: t.locked ? undefined : Object.fromEntries(cols.map((c, ci) => {
      const ov = vals[t.key]?.[ci]
      if (ov != null) return [c, ov]
      return [c, c === '40FT' ? (t.d40 ?? 0) : (t.d20 ?? 0)]
    })),
  }))
}

function makeSeed() {
  const fxWeeks = buildFxWeeks()
  const fxNow = fxWeeks[0].rates.USD
  const C = clientsSeed
  const s = defaultSettings

  const one = (value, ahtnCode, description, dutyRate, basis = 'mfn') =>
    ({ ...defaultDtItem(), value, ahtnCode, description, dutyRate, basis })

  const dti = (over) => ({
    incoterm: 'FOB', currency: 'USD', fxRate: fxNow, freight: 0,
    insuranceMode: 'general', insuranceActual: 0, bankCharges: 0, excise: 0, vatExempt: false,
    mode: 'FCL', n20: 1, n40: 0, qtyPerCol: 1,
    arrastreOverride: null, wharfageOverride: null, brokerageOverride: null,
    items: [one(0, '', '', 0)],
    ...over,
  })

  const Q = (num, o, marginByCol) => {
    const q = {
      id: uid(), no: `AQ-2026-${String(num).padStart(4, '0')}`,
      presentation: 'itemized', signature: null, notes: '', chosenCol: null,
      approvedAt: null, sentAt: null, lostAt: null,
      originCountry: '', pickupAddr: '', pol: '', pod: 'Manila (South Harbor)',
      grossWeight: 0, volume: 0,
      deliveryProvince: '', deliveryCity: '', deliveryStreet: '', deliveryAddr: '',
      finalQuote: {}, ...o,
    }
    const dtByCol = Object.fromEntries(q.columns.map((c) => [c, computeDT(dtInputsForCol(q.dtInputs, c), s)]))
    const t = quoteTotals(q, dtByCol)
    q.columns.forEach((c, i) => {
      q.finalQuote[c] = Math.round((t[c].expenses + (marginByCol?.[i] ?? 40000)) / 1000) * 1000
    })
    return q
  }

  const quotes = [
    Q(101, {
      clientId: C[0].id, origin: 'Hangzhou, CN', originCountry: 'China',
      pickupAddr: 'No.1 Xingxing Road, Xingqiao Yuhang, Hangzhou', pol: 'Shanghai Port', pod: 'Manila North Harbor',
      dest: 'Manila North Harbor', deliveryProvince: 'Metro Manila', deliveryCity: 'Marikina', deliveryAddr: 'Marikina',
      commodity: 'Commercial refrigerator', grossWeight: 5582, volume: 58.78,
      columns: ['20FT', '40FT'], lines: makeLines(['20FT', '40FT'], { origin: [48000, 60000] }),
      dtInputs: dti({ incoterm: 'EXWORKS', freight: 800, items: [one(45000, '8418.50.19', 'Commercial Refrigerator', 0.05)] }),
      status: 'booked', createdAt: daysAgo(43), sentAt: daysAgo(42), approvedAt: daysAgo(40),
      validUntil: daysAgo(27).slice(0, 10),
      notes: 'Per inquiry: 0% duty if with Form-E — client to secure CO from supplier.',
    }, [37000, 30000]),
    Q(102, {
      clientId: C[1].id, origin: 'Shanghai, CN', originCountry: 'China', pol: 'Shanghai Port',
      dest: 'Manila (South Harbor)', deliveryProvince: 'Metro Manila', deliveryCity: 'Quezon City', deliveryAddr: 'Quezon City',
      commodity: 'Ovens & cables — 4 tariff lines', grossWeight: 3346.8, volume: 28,
      columns: ['20FT'], lines: makeLines(['20FT']),
      dtInputs: dti({ freight: 1200, items: [
        one(3000, '3923.30.20', 'Oven (household, plastic parts)', 0),
        one(6000, '8417.20.00', 'Electric Oven (industrial)', 0),
        one(5000, '8417.20.00', 'Electric Oven (industrial)', 0),
        one(6000, '8514.90.90', 'Industrial oven parts / cables', 0),
      ] }),
      status: 'booked', createdAt: daysAgo(30), sentAt: daysAgo(29), approvedAt: daysAgo(27),
      validUntil: daysAgo(14).slice(0, 10),
      notes: 'Multi-item entry (4 tariff lines) — mirrors the legacy DT Calculator worked example.',
    }, [45000]),
    Q(103, {
      clientId: C[3].id, origin: 'Qingdao, CN', originCountry: 'China', pol: 'Qingdao Port',
      dest: 'Manila (South Harbor)', deliveryProvince: 'Metro Manila', deliveryCity: 'Quezon City', deliveryAddr: 'Quirino Hwy, QC',
      commodity: 'Hardware items — assorted', grossWeight: 21000, volume: 55,
      columns: ['40FT'], lines: makeLines(['40FT']),
      dtInputs: dti({ freight: 1200, n20: 0, n40: 1, items: [one(39000, '8201.90.00', 'Hardware Items', 0.10)] }),
      status: 'booked', createdAt: daysAgo(22), sentAt: daysAgo(21), approvedAt: daysAgo(19),
      validUntil: daysAgo(6).slice(0, 10),
    }, [42000]),
    Q(104, {
      clientId: C[2].id, origin: 'Bangkok, TH', originCountry: 'Thailand', pol: 'Laem Chabang',
      dest: 'Manila (South Harbor)', deliveryProvince: 'Metro Manila', deliveryCity: 'Manila', deliveryAddr: 'Binondo, Manila',
      commodity: 'Snack foods — 1,150 ctns', grossWeight: 9800, volume: 26,
      columns: ['20FT'], lines: makeLines(['20FT']),
      dtInputs: dti({ freight: 800, items: [one(18500, '1904.20.90', 'Snack Foods (ATIGA Form D)', 0, 'atiga')] }),
      status: 'booked', createdAt: daysAgo(15), sentAt: daysAgo(14), approvedAt: daysAgo(12),
      validUntil: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
    }, [38000]),
    Q(105, {
      clientId: C[1].id, origin: 'Hong Kong', originCountry: 'Hong Kong', pol: 'Hong Kong',
      dest: 'Manila (MICT)', deliveryProvince: 'Metro Manila', deliveryCity: 'Taguig', deliveryAddr: 'BGC, Taguig',
      commodity: 'Dental chairs — 24 crates', grossWeight: 6200, volume: 31,
      columns: ['20FT'], lines: makeLines(['20FT']),
      dtInputs: dti({ freight: 800, items: [one(31000, '9402.10.10', 'Dental Chair', 0.07)] }),
      status: 'booked', createdAt: daysAgo(10), sentAt: daysAgo(9), approvedAt: daysAgo(8),
      validUntil: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    }, [48000]),
    Q(106, {
      clientId: C[5].id, origin: 'Ningbo, CN', originCountry: 'China', pol: 'Ningbo Port',
      dest: 'Cebu', deliveryProvince: 'Cavite', deliveryCity: 'Imus', deliveryAddr: 'Mandaue, Cebu',
      commodity: 'Furniture & display racks — 380 pcs', grossWeight: 8400, volume: 62,
      columns: ['20FT', '40FT'], lines: makeLines(['20FT', '40FT']),
      dtInputs: dti({ freight: 1200, items: [one(26400, '9403.60.90', 'Furniture', 0.15)] }),
      status: 'approved', createdAt: daysAgo(6), sentAt: daysAgo(5), approvedAt: daysAgo(2),
      validUntil: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10),
      notes: 'Client to confirm container size on booking.',
    }, [36000, 31000]),
    Q(107, {
      clientId: C[0].id, origin: 'Shenzhen, CN', originCountry: 'China', pol: 'Yantian',
      dest: 'Manila (MICT)', deliveryProvince: 'Metro Manila', deliveryCity: 'Marikina', deliveryAddr: 'Marikina',
      commodity: 'Kitchenware & household ware', grossWeight: 12500, volume: 60,
      columns: ['40FT'], lines: makeLines(['40FT']),
      dtInputs: dti({ freight: 1200, n20: 0, n40: 1, items: [one(52000, '3924.10.00', 'Kitchenware', 0.15)] }),
      status: 'sent', createdAt: daysAgo(4), sentAt: daysAgo(3),
      validUntil: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
    }, [44000]),
    Q(108, {
      clientId: C[2].id, origin: 'Guangzhou, CN', originCountry: 'China', pol: 'Nansha',
      dest: 'Manila (South Harbor)', deliveryProvince: 'Metro Manila', deliveryCity: 'Manila', deliveryAddr: 'Divisoria, Manila',
      commodity: 'RTW garments — 6,200 pcs', grossWeight: 7300, volume: 24,
      columns: ['20FT'], lines: makeLines(['20FT']),
      dtInputs: dti({ freight: 800, items: [one(24000, '6104.42.00', 'RTW Garments', 0.15)] }),
      status: 'sent', createdAt: daysAgo(1, 9), sentAt: daysAgo(1, 14),
      validUntil: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    }, [35000]),
    Q(109, {
      clientId: C[3].id, origin: 'Shanghai, CN', originCountry: 'China', pol: 'Shanghai Port',
      dest: 'Manila (South Harbor)', deliveryProvince: 'Metro Manila', deliveryCity: 'Caloocan', deliveryAddr: 'Caloocan',
      commodity: 'Welding rods & G.I. wire — LCL 9 CBM', grossWeight: 4200, volume: 9,
      columns: ['LCL'], lines: makeLines(['LCL'], {
        freight: [31000], customsWhse: [27000], lines: [0], deposit: [0],
        process: [55000], arrastre: [4977], wharfinger: [13500], trucking: [6500],
        royalty: [0], misc: [5000], commission: [4000], signing: [5000],
      }),
      dtInputs: dti({ freight: 400, mode: 'LCL', items: [one(21000, '8311.10.10', 'Welding Rod', 0.10)] }),
      status: 'draft', createdAt: daysAgo(0, 9),
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      notes: 'LCL via consolidation — see Consolidation Calculator for CBM breakdown.',
    }, [34000]),
    Q(110, {
      clientId: C[4].id, origin: 'Guangzhou, CN', originCountry: 'China', pol: 'Nansha',
      dest: 'Manila (MICT)', deliveryProvince: 'Metro Manila', deliveryCity: 'Makati', deliveryAddr: 'Makati',
      commodity: 'Slippers — 6,200 pairs', grossWeight: 6800, volume: 27,
      columns: ['20FT'], lines: makeLines(['20FT']),
      dtInputs: dti({ freight: 800, items: [one(19800, '6402.91.99', 'Slippers', 0.15)] }),
      status: 'lost', createdAt: daysAgo(19), sentAt: daysAgo(18), lostAt: daysAgo(12),
      validUntil: daysAgo(3).slice(0, 10), notes: 'Lost on price — competitor quoted all-in ₱12k lower.',
    }, [52000]),
    Q(111, {
      clientId: C[1].id, origin: 'Busan, KR', originCountry: 'South Korea', pol: 'Busan',
      dest: 'Manila (South Harbor)', deliveryProvince: 'Metro Manila', deliveryCity: 'Taguig', deliveryAddr: 'Taguig',
      commodity: 'Microphones & speakers — 210 crates', grossWeight: 5100, volume: 48,
      columns: ['40FT'], lines: makeLines(['40FT']),
      dtInputs: dti({ freight: 1200, n20: 0, n40: 1, items: [one(44000, '8518.10.90', 'Microphone', 0.05)] }),
      status: 'booked', createdAt: daysAgo(48), sentAt: daysAgo(47), approvedAt: daysAgo(45),
      validUntil: daysAgo(32).slice(0, 10),
    }, [41000]),
  ]

  // -------- shipments --------
  const finalOf = (q, col) => Number(q.finalQuote[col]) || 0
  const docs = (upTo, baseDay) => Object.fromEntries(
    DOC_KEYS.map((k, idx) => [k, idx < upTo ? { done: true, date: daysAgo(Math.max(0, baseDay - idx)).slice(0, 10) } : { done: false, date: null }])
  )
  const SH = (num, q, o) => {
    const total = finalOf(q, o.col)
    const dpAmt = Math.round(total * s.dpSplit)
    q.chosenCol = o.col
    return {
      id: uid(), refNo: `SH-2026-${String(num).padStart(4, '0')}`, quoteId: q.id, clientId: q.clientId,
      containerLabel: o.col === 'LCL' ? 'LCL' : `1×${o.col}`, col: o.col,
      billing: { total, dpAmt, balAmt: total - dpAmt, dpPaidAt: o.dpPaidAt || null, balPaidAt: o.balPaidAt || null },
      notes: '', vessel: '', ...o,
    }
  }

  const shipments = [
    SH(31, quotes[10], {
      col: '40FT', stage: 'delivered', lane: 'green', carrier: 'Wan Hai', blNo: 'WHLU2263118', vessel: 'Wan Hai 315 V.088N',
      eta: daysAgo(38).slice(0, 10), docs: docs(15, 40), dpPaidAt: daysAgo(45), balPaidAt: daysAgo(36),
      events: [
        { ts: daysAgo(45), label: 'Booking confirmed · 70% DP received' },
        { ts: daysAgo(39), label: 'SAD lodged via VASP — Entry No. 118-2026-0709912' },
        { ts: daysAgo(38), label: 'Selectivity: GREEN lane' },
        { ts: daysAgo(37), label: 'Duties & taxes paid (PAS6)' },
        { ts: daysAgo(35), label: 'Delivered · container returned, deposit refunded' },
      ],
    }),
    SH(32, quotes[0], {
      col: '40FT', stage: 'delivered', lane: 'green', carrier: 'COSCO', blNo: 'COSU6390022', vessel: 'COSCO Shipping Denali V.062E',
      eta: daysAgo(31).slice(0, 10), docs: docs(15, 33), dpPaidAt: daysAgo(40), balPaidAt: daysAgo(28),
      events: [
        { ts: daysAgo(40), label: 'Booking confirmed · 70% DP received' },
        { ts: daysAgo(32), label: 'SAD lodged via VASP — Entry No. 118-2026-0713366' },
        { ts: daysAgo(31), label: 'Selectivity: GREEN lane' },
        { ts: daysAgo(28), label: 'Delivered to Marikina · CG released' },
      ],
    }),
    SH(33, quotes[1], {
      col: '20FT', stage: 'release', lane: 'green', carrier: 'Wan Hai', blNo: 'WHLU0598378', vessel: 'Wan Hai 271 V.221N',
      eta: daysAgo(6).slice(0, 10), docs: docs(13, 12), dpPaidAt: daysAgo(26), balPaidAt: daysAgo(1),
      events: [
        { ts: daysAgo(26), label: 'Booking confirmed · 70% DP received' },
        { ts: daysAgo(5), label: 'SAD lodged via VASP — Entry No. 118-2026-0729810' },
        { ts: daysAgo(4), label: 'Selectivity: GREEN lane' },
        { ts: daysAgo(2), label: 'Duties & taxes paid (PAS6)' },
        { ts: daysAgo(1), label: '30% balance received — gate pass processing' },
      ],
    }),
    SH(34, quotes[2], {
      col: '40FT', stage: 'payment', lane: 'yellow', carrier: 'COSCO', blNo: 'COSU6417755', vessel: 'COSCO Shipping Andes V.071E',
      eta: daysAgo(3).slice(0, 10), docs: docs(11, 8), dpPaidAt: daysAgo(18),
      events: [
        { ts: daysAgo(18), label: 'Booking confirmed · 70% DP received' },
        { ts: daysAgo(2), label: 'SAD lodged via VASP — Entry No. 118-2026-0734402' },
        { ts: daysAgo(1), label: 'Selectivity: YELLOW lane — documentary check' },
        { ts: daysAgo(0, 9), label: 'TAN printed — awaiting PAS6 payment' },
      ],
    }),
    SH(35, quotes[3], {
      col: '20FT', stage: 'assessment', lane: 'red', carrier: 'CMA CGM', blNo: 'CMDU5108827', vessel: 'CMA CGM Osiris V.104N',
      eta: daysAgo(2).slice(0, 10), docs: docs(10, 6), dpPaidAt: daysAgo(11),
      events: [
        { ts: daysAgo(11), label: 'Booking confirmed · 70% DP received' },
        { ts: daysAgo(1), label: 'SAD lodged via VASP — Entry No. 118-2026-0736119' },
        { ts: daysAgo(0, 8), label: 'Selectivity: RED lane — physical examination scheduled' },
      ],
      notes: 'FDA import permit attached; examiner appointment Thursday AM, South Harbor CY.',
    }),
    SH(36, quotes[4], {
      col: '20FT', stage: 'lodged', lane: null, carrier: 'OOCL', blNo: 'OOLU2648811', vessel: 'OOCL Nagoya V.155S',
      eta: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10), docs: docs(8, 4), dpPaidAt: daysAgo(7),
      events: [
        { ts: daysAgo(7), label: 'Booking confirmed · 70% DP received' },
        { ts: daysAgo(0, 11), label: 'SAD lodged via VASP — Entry No. 118-2026-0737254' },
      ],
    }),
  ]

  // -------- consolidation calculator (LCL & FCL sheets, verbatim) --------
  const row = (label, currency, rate, qty, unit, fx, vatable) =>
    ({ id: uid(), label, currency, rate, qty, unit, fx: fx ?? 1, vatable: !!vatable })
  const consolidation = {
    LCL: [
      { id: uid(), title: 'Origin / Freight', vatOnGroup: false, rows: [
        row('Ocean Freight', 'USD', 50, 9, 'CBM', fxNow),
        row('Exworks All-in Origin Charges', 'USD', 0, 9, 'CBM', fxNow),
      ] },
      { id: uid(), title: 'Destination', vatOnGroup: true, rows: [
        row('Documentation', 'PHP', 450, 1, 'SET', 1, true),
        row('Turnover Fee', 'PHP', 450, 1, 'SET', 1, true),
        row('LCL Charge', 'PHP', 450, 9, 'CBM', 1, true),
        row('THC', 'PHP', 250, 9, 'CBM', 1),
        row('BL Fee', 'USD', 40, 1, 'SET', fxNow),
        row('PSS', 'USD', 10, 9, 'CBM', fxNow),
        row('CIC', 'USD', 10, 9, 'CBM', fxNow),
        row('ECRS', 'USD', 10, 9, 'CBM', fxNow),
      ] },
      { id: uid(), title: 'Warehouse Charges', vatOnGroup: true, rows: [
        row('Documentation', 'PHP', 1474.55, 1, 'SET', 1, true),
        row('OLRS', 'PHP', 147.46, 1, 'SET', 1, true),
        row('IMS Fee', 'PHP', 340, 1, 'SET', 1, true),
        row('Storage', 'PHP', 73.73, 9, 'CBM/DAY ×10', 10, true),
        row('Arrastre & Wharfage', 'PHP', 552.96, 9, 'CBM', 1, true),
        row('Stripping & Cargo-out Handling', 'PHP', 1474.55, 9, 'CBM', 1, true),
        row('Transfer Fee', 'PHP', 737.27, 9, 'CBM', 1, true),
        row('Incidental Charges', 'PHP', 2000, 9, 'CBM', 1, true),
        row('Insurance', 'PHP', 1000, 1, 'SET', 1, true),
        row('Oversize Surcharge', 'PHP', 300, 9, 'CBM', 1, true),
      ] },
    ],
    FCL: [
      { id: uid(), title: 'Origin', vatOnGroup: false, rows: [
        row('Exworks Charges', 'USD', 1200, 1, 'CNTR', fxNow),
        row('Ocean Freight', 'USD', 600, 1, 'CNTR', fxNow),
      ] },
      { id: uid(), title: 'Destination', vatOnGroup: false, rows: [
        row('Documentation', 'PHP', 1500, 1, 'CNTR', 1),
      ] },
      { id: uid(), title: 'Shipping Lines', vatOnGroup: false, rows: [
        row('Shipping Line — as per receipt', 'PHP', 60000, 1, 'SET', 1),
      ] },
    ],
  }

  return {
    version: 5,
    settings: defaultSettings,
    fxWeeks,
    tariffLines: tariffSeed.map((t) => ({ id: uid(), ...t })),
    clients: clientsSeed,
    rateCards: rateCardsSeed,
    truckingRates: truckingSeed(),
    quotes,
    shipments,
    consolidation,
    counters: { quote: 112, shipment: 37 },
  }
}

export default makeSeed
