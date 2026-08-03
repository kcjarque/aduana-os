import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDb, clientById, quoteById } from '../lib/store'
import { computeDT, quoteTotals, bocLineAmount } from '../lib/compute'
import { peso, fmtDate } from '../lib/format'
import { Button, Icon } from '../components/ui'
import SignaturePad from '../components/SignaturePad'

export default function QuotePrint() {
  const { id } = useParams()
  const { db, update, toast } = useDb()
  const quote = quoteById(db, id)
  const [signing, setSigning] = useState(false)

  const dtByCol = useMemo(
    () => quote ? Object.fromEntries(quote.columns.map((c) => [c, computeDT(quote.dtInputs, c, db.settings)])) : {},
    [quote, db.settings],
  )
  if (!quote) return <div className="p-10 text-center text-slate-500">Quotation not found. <Link className="text-navy-700 underline" to="/quotes">Back</Link></div>

  const s = db.settings
  const client = clientById(db, quote.clientId)
  const totals = quoteTotals(quote, dtByCol)
  const allIn = quote.presentation === 'allin'

  const saveSignature = (dataUrl) => {
    update((d) => {
      const qq = d.quotes.find((x) => x.id === id)
      qq.signature = dataUrl
      qq.status = 'approved'
      qq.approvedAt = new Date().toISOString()
    })
    setSigning(false)
    toast('Quotation signed & approved — 70% DP now due')
  }

  return (
    <div className="min-h-full bg-slate-200/70 py-8 px-4">
      {/* toolbar */}
      <div className="no-print max-w-[820px] mx-auto mb-4 flex items-center justify-between">
        <Link to={`/quotes/${quote.id}`}><Button tone="ghost" size="sm">← Back to editor</Button></Link>
        <div className="flex gap-2">
          {!quote.signature && ['sent', 'draft'].includes(quote.status) && (
            <Button tone="gold" size="sm" icon="sign" onClick={() => setSigning((v) => !v)}>
              {signing ? 'Hide signature pad' : 'Client acceptance / e-sign'}
            </Button>
          )}
          <Button size="sm" icon="print" onClick={() => window.print()}>Print / Save PDF</Button>
        </div>
      </div>

      {/* sheet */}
      <div className="print-sheet max-w-[820px] mx-auto bg-white rounded-xl card-shadow-lg border border-slate-200 p-10">
        {/* letterhead */}
        <div className="flex items-start justify-between pb-5 border-b-2 border-navy-900">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" className="w-12 h-12 rounded-xl" />
            <div>
              <p className="font-display text-lg font-bold text-navy-900 leading-tight">{s.company.name}</p>
              <p className="text-[11px] text-slate-500">{s.company.tagline}</p>
              <p className="text-[11px] text-slate-500">{s.company.address}</p>
              <p className="text-[11px] text-slate-500">TIN {s.company.tin} · {s.company.ccb}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold text-navy-900 tracking-tight">QUOTATION</p>
            <p className="tnum text-sm font-semibold text-gold-600">{quote.no}</p>
            <p className="text-[11px] text-slate-500 mt-1">Date: {fmtDate(quote.sentAt || quote.createdAt)}</p>
            <p className="text-[11px] text-slate-500">Valid until: {fmtDate(quote.validUntil)}</p>
          </div>
        </div>

        {/* parties + shipment */}
        <div className="grid grid-cols-2 gap-6 py-5 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Quoted to</p>
            <p className="font-semibold text-slate-900">{client?.name || '—'}</p>
            <p className="text-xs text-slate-500">{client?.address}</p>
            <p className="text-xs text-slate-500">Attn: {client?.contact} · TIN {client?.tin}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-slate-400">Route</span><span className="text-slate-800 font-medium">{quote.origin || '—'} → {quote.dest}</span>
            <span className="text-slate-400">Commodity</span><span className="text-slate-800 font-medium">{quote.commodity || '—'}</span>
            <span className="text-slate-400">AHTN code</span><span className="tnum text-slate-800 font-medium">{quote.dtInputs.ahtnCode || '—'} ({(quote.dtInputs.basis || 'mfn').toUpperCase()} {(Number(quote.dtInputs.dutyRate || 0) * 100).toFixed(1)}%)</span>
            <span className="text-slate-400">Incoterm / FX</span>
            <span className="tnum text-slate-800 font-medium">{quote.dtInputs.incoterm} · {quote.dtInputs.currency} @ ₱{Number(quote.dtInputs.fxRate).toFixed(2)}</span>
          </div>
        </div>

        {/* charges */}
        {allIn ? (
          <div className="border-2 border-navy-900 rounded-xl overflow-hidden">
            <div className="bg-navy-900 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest">All-in clearance & forwarding package</div>
            <div className="grid" style={{ gridTemplateColumns: `1fr ${quote.columns.map(() => '160px').join(' ')}` }}>
              <div className="px-4 py-3 text-sm text-slate-600">
                Complete import clearance: duties & taxes advance, brokerage, port charges, freight,
                documentation, lodgement and delivery — one all-in price.
              </div>
              {quote.columns.map((c) => (
                <div key={c} className="px-4 py-3 border-l border-slate-200 text-right">
                  <p className="text-[10px] font-bold uppercase text-slate-400">{c}</p>
                  <p className="tnum text-xl font-bold text-navy-900">{peso(totals[c].sell)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-y-2 border-navy-900 text-[10px] uppercase tracking-widest text-slate-500">
                <th className="text-left py-2 pr-2 font-bold">#</th>
                <th className="text-left py-2 font-bold">Description</th>
                {quote.columns.map((c) => <th key={c} className="text-right py-2 font-bold w-36">{c} (₱)</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quote.lines.map((ln, i) => (
                <tr key={ln.id}>
                  <td className="py-1.5 pr-2 text-slate-400 tnum">{i + 1}</td>
                  <td className="py-1.5 text-slate-700">
                    {ln.label}
                    {ln.kind === 'boc' && <span className="text-[10px] text-slate-400 ml-1.5">(per BOC computation)</span>}
                  </td>
                  {quote.columns.map((c) => (
                    <td key={c} className="py-1.5 text-right tnum text-slate-800">
                      {peso(ln.kind === 'boc' ? bocLineAmount(ln.bocKey, dtByCol[c]) : (ln.values[c]?.sell || 0))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-navy-900">
                <td colSpan={2} className="py-2.5 font-bold text-navy-900">TOTAL</td>
                {quote.columns.map((c) => (
                  <td key={c} className="py-2.5 text-right tnum font-bold text-base text-navy-900">{peso(totals[c].sell)}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        )}

        {/* terms */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div className="text-[11px] text-slate-500 leading-relaxed">
            <p className="font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">Terms & conditions</p>
            <p>1. Payment: <span className="font-semibold text-slate-700">{(s.dpSplit * 100).toFixed(0)}% downpayment upon signed acceptance; {(100 - s.dpSplit * 100).toFixed(0)}% balance before release of cargo.</span></p>
            <p>2. Duties, taxes and port charges are advanced on the importer's behalf and billed at actual BOC assessment; figures above are estimates at the current weekly BOC rate of exchange.</p>
            <p>3. Excludes demurrage/detention/storage beyond free time, examination charges on RED-lane selectivity, and permits/ATRIG unless itemized.</p>
            <p>4. Quotation valid until {fmtDate(quote.validUntil)}; subject to carrier GRI and BOC exchange-rate movement.</p>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="h-16 flex items-end">
                  <p className="font-display text-sm font-semibold text-slate-800 italic">{s.company.rep}</p>
                </div>
                <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500 uppercase tracking-wide">Prepared by · {s.company.name.split(' ')[0]}</div>
              </div>
              <div>
                <div className="h-16 flex items-end justify-center">
                  {quote.signature
                    ? <img src={quote.signature} alt="Client signature" className="max-h-16" />
                    : quote.approvedAt
                      ? <p className="text-[11px] text-slate-400 italic">Signed copy on file</p>
                      : null}
                </div>
                <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500 uppercase tracking-wide">
                  Conforme · {client?.name?.slice(0, 26)}{quote.approvedAt ? ` · ${fmtDate(quote.approvedAt)}` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400">
          {s.company.phone} · {s.company.email} · Accredited VASP lodgement (e2m) · Estimates subject to final BOC assessment
        </p>
      </div>

      {/* signature pad */}
      {signing && !quote.signature && (
        <div className="no-print max-w-[820px] mx-auto mt-4 bg-white rounded-xl card-shadow-lg border border-gold-200 p-5">
          <p className="flex items-center gap-2 font-semibold text-slate-800 mb-1"><Icon name="sign" size={16} className="text-gold-500" /> Client acceptance</p>
          <p className="text-xs text-slate-500 mb-3">
            Signing confirms acceptance of this quotation and triggers the {(s.dpSplit * 100).toFixed(0)}/{(100 - s.dpSplit * 100).toFixed(0)} payment terms.
          </p>
          <SignaturePad onSave={saveSignature} onCancel={() => setSigning(false)} />
        </div>
      )}
    </div>
  )
}
