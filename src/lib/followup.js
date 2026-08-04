// Taglish client-follow-up generator — mirrors how the team chases missing
// details on Viber. Maps the completeness labels to friendly Taglish asks.
const ASK = {
  'Client': 'pangalan ng consignee/company',
  'Commodity / items': 'commodity o listahan ng items',
  'Country of origin': 'country of origin',
  'Incoterms': 'incoterms (EXW/FOB/CFR/CIF)',
  'Shipment mode': 'mode (FCL/LCL/Air)',
  'Invoice value': 'total invoice value',
  'Gross weight': 'gross weight (kgs)',
  'Total volume (CBM)': 'total volume (CBM)',
  'Delivery city': 'delivery address (city/municipality)',
  'Valid-until date': 'target date ng shipment',
  'Pickup address (EXWORKS)': 'pickup address (para sa EXW)',
  'Port of loading (FOB)': 'port of loading',
  'Port of destination (CFR/CIF)': 'port of destination',
  'Container count (FCL)': 'ilang container at anong size (20/40FT)',
}

export function followupMessage(quote, clientName, missingLabels) {
  const name = clientName || 'Boss'
  const asks = missingLabels.map((l) => `• ${ASK[l] || l}`)
  if (!asks.length) {
    return `Hi ${name}! Kompleto na po ang details ng inquiry — ipoproseso na namin ang quotation. Salamat po!`
  }
  return [
    `Hi ${name}! Para ma-proseso agad ang quotation ${quote.no ? `(${quote.no})` : ''}, pa-send na lang po ng mga sumusunod:`,
    '',
    ...asks,
    '',
    'Pag kumpleto na po, ilalabas agad namin ang quotation. Salamat po! 🙏',
  ].join('\n')
}
