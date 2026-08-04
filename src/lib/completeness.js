// Pure inquiry-completeness check — the team's real "check kung kompleto" step.
// Returns { items:[{key,label,ok}], missing:[labels], done, total, complete }.

export function completeness(quote) {
  const di = quote.dtInputs || {}
  const items = di.items || []
  const totalValue = items.reduce((a, it) => a + (Number(it.value) || 0), 0)
  const hasCommodity = !!(quote.commodity && quote.commodity.trim()) || items.some((it) => it.description && it.description.trim())

  const checks = [
    { key: 'client', label: 'Client', ok: !!quote.clientId },
    { key: 'commodity', label: 'Commodity / items', ok: hasCommodity },
    { key: 'origin', label: 'Country of origin', ok: !!(quote.originCountry && quote.originCountry.trim()) },
    { key: 'incoterm', label: 'Incoterms', ok: !!di.incoterm },
    { key: 'mode', label: 'Shipment mode', ok: !!di.mode },
    { key: 'value', label: 'Invoice value', ok: totalValue > 0 },
    { key: 'gw', label: 'Gross weight', ok: (Number(quote.grossWeight) || 0) > 0 },
    { key: 'volume', label: 'Total volume (CBM)', ok: (Number(quote.volume) || 0) > 0 },
    { key: 'delivery', label: 'Delivery city', ok: !!(quote.deliveryCity || (quote.deliveryAddr && quote.deliveryAddr.trim())) },
    { key: 'validity', label: 'Valid-until date', ok: !!quote.validUntil },
  ]

  // conditional requirements
  if (di.incoterm === 'EXWORKS')
    checks.push({ key: 'pickup', label: 'Pickup address (EXWORKS)', ok: !!(quote.pickupAddr && quote.pickupAddr.trim()) })
  if (di.incoterm === 'FOB')
    checks.push({ key: 'pol', label: 'Port of loading (FOB)', ok: !!((quote.pol || quote.origin || '').trim()) })
  if (di.incoterm === 'CFR' || di.incoterm === 'CIF')
    checks.push({ key: 'pod', label: 'Port of destination (CFR/CIF)', ok: !!((quote.pod || quote.dest || '').trim()) })
  if (di.mode === 'FCL')
    checks.push({ key: 'cntr', label: 'Container count (FCL)', ok: (Number(di.n20) || 0) + (Number(di.n40) || 0) > 0 })

  const done = checks.filter((c) => c.ok).length
  const missing = checks.filter((c) => !c.ok).map((c) => c.label)
  return { items: checks, missing, done, total: checks.length, complete: missing.length === 0 }
}
