import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDb, clientById, quoteById } from '../lib/store'
import { computeDT, quoteTotals, dtInputsForCol } from '../lib/compute'
import { peso, num, fmtDate } from '../lib/format'
import { Button, Icon } from '../components/ui'
import SignaturePad from '../components/SignaturePad'

export default function QuotePrint() {
  const { id } = useParams()
  const { db, update, toast } = useDb()
  const quote = quoteById(db, id)
  const [signing, setSigning] = useState(false)

  const dtByCol = useMemo(
    () => quote ? Object.fromEntries(quote.columns.map((c) => [c, computeDT(dtInputsForCol(quote.dtInputs, c), db.settings)])) : {},
    [quote, db.settings],
  )
  if (!quote) return <div className="p-10 text-center text-slate-500">Quotation not found. <Link className="text-navy-700 underline" to="/quotes">Back</Link></div>

  const s = db.settings
  const fp = s.feePolicy
  const client = clientById(db, quote.clientId)
  const totals = quoteTotals(quote, dtByCol)
  const allIn = quote.presentation === 'allin'
  const di = quote.dtInputs
  const primary = quote.chosenCol || quote.columns[0]
  const pdt = dtByCol[primary]

  const saveSignature = (dataUrl) => {
    update((d) => {
      const qq = d.quotes.find((x) => x.id === id)
      qq.signature = dataUrl; qq.status = 'approved'; qq.approvedAt = new Date().toISOString()
    })
    setSigning(false); toast('Quotation signed & approved — 70% DP now due')
  }

  return (
    <div className="min-h-full bg-slate-200/70 py-8 px-4">
      <div className="no-print max-w-[820px] mx-auto mb-4 flex items-center justify-between">
        <Link to={`/quotes/${quote.id}`}><Button tone="ghost" size="sm">← Back to editor</Button></Link>
        <div className="flex gap-2">
          {!quote.signature && ['sent', 'draft'].includes(quote.status) && (
            <Button tone="gold" size="sm" icon="sign" onClick={() => setSigning((v) => !v)}>{signing ? 'Hide signature pad' : 'Client acceptance / e-sign'}</Button>
          )}
          <Button size="sm" icon="print" onClick={() => window.print()}>Print / Save PDF</Button>
        </div>
      </div>

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
            <p className="text-xs text-slate-500">Attn: {client?.contact} · {client?.phone}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-slate-400">Origin</span><span className="text-slate-800 font-medium">{quote.originCountry || '—'} · {quote.pol || quote.origin || '—'}</span>
            <span className="text-slate-400">Destination</span><span className="text-slate-800 font-medium">{quote.pod || quote.dest} → {quote.deliveryAddr || quote.deliveryCity || '—'}</span>
            <span className="text-slate-400">Commodity</span><span className="text-slate-800 font-medium">{quote.commodity || '—'} ({quote.columns.join(' / ')})</span>
            <span className="text-slate-400">GW / Volume</span><span className="tnum text-slate-800 font-medium">{num(quote.grossWeight || 0, 0)} kgs · {num(quote.volume || 0, 1)} CBM</span>
            <span className="text-slate-400">H.S. code</span><span className="tnum text-slate-800 font-medium">{pdt.ahtnLabel}</span>
            <span className="text-slate-400">Incoterms / E.R.</span><span className="tnum text-slate-800 font-medium">{di.incoterm} · {di.currency} @ ₱{Number(di.fxRate).toFixed(3)}</span>
          </div>
        </div>

        {/* charges */}
        {allIn ? (
          <div className="border-2 border-navy-900 rounded-xl overflow-hidden">
            <div className="bg-navy-900 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest">All-in door-to-door package — Final Quotation</div>
            <div className="grid" style={{ gridTemplateColumns: `1fr ${quote.columns.map(() => '170px').join(' ')}` }}>
              <div className="px-4 py-3 text-[11px] text-slate-600 leading-relaxed">Inclusive of: {quote.lines.filter((l) => !l.refundable).map((l) => l.label).join(', ')}. Container deposit billed separately and refunded upon clean empty return.</div>
              {quote.columns.map((c) => (
                <div key={c} className="px-4 py-3 border-l border-slate-200 text-right"><p className="text-[10px] font-bold uppercase text-slate-400">{c}</p><p className="tnum text-xl font-bold text-navy-900">{peso(totals[c].finalQuote, 0)}</p></div>
              ))}
            </div>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-y-2 border-navy-900 text-[10px] uppercase tracking-widest text-slate-500">
                <th className="text-left py-2 pr-2 font-bold">#</th><th className="text-left py-2 font-bold">Description</th>
                {quote.columns.map((c) => <th key={c} className="text-right py-2 font-bold w-32">{c} (₱)</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quote.lines.map((ln, i) => (
                <tr key={ln.key}>
                  <td className="py-1.5 pr-2 text-slate-400 tnum">{i + 1}</td>
                  <td className="py-1.5 text-slate-700">{ln.label}{ln.locked && <span className="text-[10px] text-slate-400 ml-1.5">(per BOC computation below)</span>}{ln.refundable && <span className="text-[10px] text-slate-400 ml-1.5">(refundable)</span>}</td>
                  {quote.columns.map((c) => <td key={c} className="py-1.5 text-right tnum text-slate-800">{peso(ln.locked ? (dtByCol[c]?.totalBoc ?? 0) : (ln.values?.[c] || 0), 0)}</td>)}
                </tr>
              ))}
              <tr>
                <td className="py-1.5 pr-2 text-slate-400 tnum">{quote.lines.length + 1}</td>
                <td className="py-1.5 text-slate-700">Professional & Service Fee</td>
                {quote.columns.map((c) => <td key={c} className="py-1.5 text-right tnum text-slate-800">{peso(Math.max(0, totals[c].gross), 0)}</td>)}
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-navy-900">
                <td colSpan={2} className="py-2.5 font-bold text-navy-900">FINAL QUOTATION</td>
                {quote.columns.map((c) => <td key={c} className="py-2.5 text-right tnum font-bold text-base text-navy-900">{peso(totals[c].finalQuote, 0)}</td>)}
              </tr>
            </tfoot>
          </table>
        )}

        {/* advance computation of duties & taxes */}
        <div className="mt-6 border border-slate-300 rounded-xl overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">Advance computation of duties and taxes — amount payable to the Bureau of Customs</div>

          {/* multi-item itemization (mirrors legacy Client's Confirmation Copy) */}
          {pdt.multi && (
            <div className="px-4 pt-3">
              <p className="text-[10px] font-bold text-navy-700 mb-1">Itemization ({pdt.itemCount} tariff lines) — {primary}</p>
              <table className="w-full text-[11px] border-collapse">
                <thead><tr className="text-slate-500 border-b border-slate-200"><th className="text-left py-1 font-semibold">#</th><th className="text-left py-1 font-semibold">Description</th><th className="text-left py-1 font-semibold">T.H.</th><th className="text-right py-1 font-semibold">T.R.</th><th className="text-right py-1 font-semibold">D.V.</th><th className="text-right py-1 font-semibold">Duty</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {pdt.lines.map((l, i) => (
                    <tr key={l.id}><td className="py-1 text-slate-400 tnum">{i + 1}</td><td className="py-1 text-slate-700">{l.description || '—'}</td><td className="py-1 tnum text-slate-600">{l.ahtnCode || '—'}</td><td className="py-1 text-right tnum">{(l.dutyRate * 100).toFixed(1)}%</td><td className="py-1 text-right tnum">{peso(l.dv, 0)}</td><td className="py-1 text-right tnum">{peso(l.duty, 0)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={`grid ${quote.columns.length > 1 ? 'grid-cols-2 divide-x' : 'grid-cols-1'} divide-slate-200`}>
            {quote.columns.map((c) => {
              const dt = dtByCol[c]
              const L = ({ label, v, strong, indent }) => (
                <div className={`flex justify-between py-0.5 ${indent ? 'pl-4' : ''}`}>
                  <span className={`${strong ? 'font-bold text-slate-800' : 'text-slate-500'} text-[11px]`}>{label}</span>
                  <span className={`tnum text-[11px] ${strong ? 'font-bold text-navy-900' : 'text-slate-700'}`}>{v}</span>
                </div>
              )
              return (
                <div key={c} className="px-4 py-3">
                  {quote.columns.length > 1 && <p className="text-[10px] font-bold text-navy-700 mb-1">{c}</p>}
                  <L label="1 · CUSTOMS DUTY" v={peso(dt.duty)} strong />
                  <L indent label={`Dutiable value (${num(dt.totalValue)} ${di.currency} × ₱${num(dt.fx, 3)})`} v={peso(dt.dv)} />
                  {!dt.multi && <L indent label={`Rate of duty (${(dt.basis || 'mfn').toUpperCase()})`} v={`${(dt.dutyRate * 100).toFixed(2)}%`} />}
                  <L label="2 · VALUE ADDED TAX" v={peso(dt.vat)} strong />
                  <L indent label="Brokerage fee" v={peso(dt.brokerage)} />
                  <L indent label="Wharfage / Arrastre" v={peso(dt.wharfage + dt.arrastre)} />
                  <L indent label={`CDS / IPF${dt.bank ? ' / Bank' : ''}`} v={peso(dt.cds + dt.ipfLanded + dt.bank)} />
                  <L indent label="Landed cost × 12%" v={peso(dt.landedCost)} />
                  <L label="3 · IMPORT PROCESSING FEE" v={peso(dt.ipfSummary)} strong />
                  <L label="4 · EXCISE TAX" v={peso(dt.excise)} strong />
                  <L label="5 · CSF" v={peso(dt.csf)} strong />
                  <div className="border-t border-slate-300 mt-1.5 pt-1.5"><L label="TOTAL AMOUNT PAYABLE" v={peso(dt.totalBoc)} strong /></div>
                </div>
              )
            })}
          </div>
        </div>

        {/* terms */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div className="text-[11px] text-slate-500 leading-relaxed">
            <p className="font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">Terms & conditions</p>
            <p>1. Payment: <span className="font-semibold text-slate-700">{(s.dpSplit * 100).toFixed(0)}% downpayment upon signed acceptance; {(100 - s.dpSplit * 100).toFixed(0)}% balance before release of cargo.</span></p>
            <p>2. Computation is subject to change upon evaluation of the Bureau of Customs; duties & taxes are advanced on the importer's behalf and billed at actual assessment.</p>
            <p>3. Container deposit is refunded upon clean return of the empty container. Excludes demurrage/detention/storage beyond free time and examination charges on RED-lane selectivity.</p>
            <p>4. Quotation valid until {fmtDate(quote.validUntil)}; subject to carrier GRI and exchange-rate movement.</p>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="h-16 flex items-end"><p className="font-display text-sm font-semibold text-slate-800 italic">{s.company.rep}</p></div>
                <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500 uppercase tracking-wide">Prepared by</div>
              </div>
              <div>
                <div className="h-16 flex items-end justify-center">{quote.signature ? <img src={quote.signature} alt="Client signature" className="max-h-16" /> : quote.approvedAt ? <p className="text-[11px] text-slate-400 italic">Signed copy on file</p> : null}</div>
                <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500 uppercase tracking-wide">Conforme · signature over printed name{quote.approvedAt ? ` · ${fmtDate(quote.approvedAt)}` : ''}</div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400">{s.company.phone} · {s.company.email} · Accredited VASP lodgement (e2m) · Estimates subject to final BOC assessment</p>
      </div>

      {signing && !quote.signature && (
        <div className="no-print max-w-[820px] mx-auto mt-4 bg-white rounded-xl card-shadow-lg border border-gold-200 p-5">
          <p className="flex items-center gap-2 font-semibold text-slate-800 mb-1"><Icon name="sign" size={16} className="text-gold-500" /> Client acceptance</p>
          <p className="text-xs text-slate-500 mb-3">Signing confirms acceptance of this quotation and triggers the {(s.dpSplit * 100).toFixed(0)}/{(100 - s.dpSplit * 100).toFixed(0)} payment terms.</p>
          <SignaturePad onSave={saveSignature} onCancel={() => setSigning(false)} />
        </div>
      )}
    </div>
  )
}
