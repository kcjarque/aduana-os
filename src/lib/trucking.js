import { uid } from './format'

// Trucking & inland-delivery tariff by province → city/municipality, per
// equipment. SAMPLE figures — replaced by the client's real rate sheet.
// Structure is the demo point: pick a city, line 11 auto-fills.
const TABLE = [
  // [province, city, 20FT, 40FT, LCL]
  ['Metro Manila', 'Manila', 12000, 15000, 6000],
  ['Metro Manila', 'Quezon City', 14000, 18000, 7000],
  ['Metro Manila', 'Makati', 13000, 16000, 6500],
  ['Metro Manila', 'Taguig', 13000, 16000, 6500],
  ['Metro Manila', 'Marikina', 15000, 18000, 7500],
  ['Metro Manila', 'Pasay', 11000, 14000, 5500],
  ['Metro Manila', 'Parañaque', 12000, 15000, 6000],
  ['Metro Manila', 'Caloocan', 13000, 16000, 6500],
  ['Metro Manila', 'Valenzuela', 14000, 17000, 7000],
  ['Cavite', 'Bacoor', 16000, 20000, 8000],
  ['Cavite', 'Imus', 17000, 21000, 8500],
  ['Cavite', 'Dasmariñas', 18000, 22000, 9000],
  ['Laguna', 'Biñan', 18000, 23000, 9000],
  ['Laguna', 'Sta. Rosa', 19000, 24000, 9500],
  ['Laguna', 'Calamba', 21000, 26000, 10500],
  ['Bulacan', 'Meycauayan', 16000, 20000, 8000],
  ['Bulacan', 'Marilao', 17000, 21000, 8500],
  ['Bulacan', 'Malolos', 20000, 25000, 10000],
  ['Rizal', 'Cainta', 15000, 19000, 7500],
  ['Rizal', 'Antipolo', 18000, 23000, 9000],
]

export function truckingSeed() {
  const validFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const validTo = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10)
  const rows = []
  for (const [province, city, r20, r40, rlcl] of TABLE) {
    rows.push(
      { id: uid(), province, cityMunicipality: city, equipment: '20FT', rate: r20, validFrom, validTo },
      { id: uid(), province, cityMunicipality: city, equipment: '40FT', rate: r40, validFrom, validTo },
      { id: uid(), province, cityMunicipality: city, equipment: 'LCL', rate: rlcl, validFrom, validTo },
    )
  }
  return rows
}

export const provincesOf = (rates) =>
  [...new Set(rates.map((r) => r.province))].sort()

export const citiesOf = (rates, province) =>
  [...new Set(rates.filter((r) => r.province === province).map((r) => r.cityMunicipality))].sort()

// column → equipment (LCL/AIR both use the LCL trucking rate)
const equipForCol = (col) => (col === '20FT' || col === '40FT') ? col : 'LCL'

// returns the rate (₱) for a city+column, or null if no current tariff row
export function truckingLookup(rates, province, city, col) {
  if (!province || !city) return null
  const eq = equipForCol(col)
  const today = new Date().toISOString().slice(0, 10)
  const row = rates.find((r) =>
    r.province === province && r.cityMunicipality === city && r.equipment === eq &&
    (!r.validTo || r.validTo >= today))
  return row ? row.rate : null
}
