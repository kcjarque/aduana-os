# AduanaOS — Design Spec (MVP)

**Date:** 2026-08-04 · **Status:** Built & deployed (Stage 1 MVP demo)

> **v2 update (same day):** the app now replicates the brokerage's four working
> Excel files exactly — see `EXCEL-MAPPING.md` for the file-by-file mapping.
> Key deltas vs the original research-brief build: brokerage = DV×0.125%+₱5,050
> (flat, client convention), arrastre ₱3,727/₱8,551 & wharfage ₱519.35/₱779.05,
> CSF $5/$10×E.R. in the BOC summary, flat CDS/IPF, standard dutiable freight
> defaults, the INQUIRY TOOL's 16 expense lines with FINAL QUOTATION →
> NET INCOME (cost-plus, ₱30K–50K profit guide) replacing per-line buy/sell,
> a Consolidation (LCL/FCL) calculator page, the client's 88-line frequently-used
> tariff list, and the Client's Confirmation Copy block on the printed quote.

Quote-to-clearance platform for a small Philippine customs brokerage / freight
forwarder. Strategy per design research: copy the *patterns* of GoFreight
(quote→shipment flow), Freightify (rate cards + margin rules), Zonos/Avalara
(transparent itemized landed-cost breakdown) — and build the **Philippine BOC
compliance layer natively**, which no global product offers. The single biggest
ROI target: collapse the 1–2 day manual quotation to minutes.

## Scope (Stage 1 MVP)

1. **Duties & Taxes Estimator** — the crown jewel. Full BOC formula:
   - `DV(₱) = (value + freight + insurance) × BOC weekly rate` with incoterm
     handling (CIF already-inclusive, CFR adds insurance only), insurance
     defaults 2% general / 4% dangerous cargo, actual-premium override.
   - `Duty = DV × AHTN rate` (MFN/ATIGA/ACFTA/RCEP basis, editable override).
   - Brokerage fee per **CAO 1-2001** bracket schedule; above ₱200k:
     `5,050 + 0.125% × excess` (all editable in Settings).
   - **IPF** per CAO 2-2001 brackets (₱250/500/750/1,000), **CDS ₱280**,
     arrastre/wharfage per container (sample figures, editable), bank charges,
     manual excise, VAT-exempt toggle.
   - `Landed Cost = DV + duty + all fees` → `VAT = 12% × LC` →
     **Payable to BOC** (duty+VAT+excise+CDS+IPF = SSDT) vs **total charges**.
2. **Tariff Library** — ~57 sample AHTN 2022 lines (MFN/ATIGA/ACFTA/RCEP),
   searchable, editable, feeds the estimator combobox. Production path: request
   public-domain dataset from the Tariff Commission (no API exists).
3. **FX Rates** — weekly CMC-style table (Sat–Fri effective ranges), current
   week drives all computations; admin "publish next week" flow.
4. **Quotation engine** — 16-line standard template; BOC lines locked &
   auto-derived from the D&T engine (single source of truth), service lines
   carry buy/sell per column; **20FT vs 40FT dual-column comparison**; margin
   ₱/% per column with color-coded chips; **margin floor → maker–checker
   banner**; all-in vs itemized presentation toggle; pull ocean freight from
   rate cards at the BOC rate; print-ready A4 sheet; **client e-signature pad
   → Approved → 70/30 payment terms**; one-click **convert to shipment**.
5. **Clearance Board** — draggable kanban (dnd-kit): Booked → Docs Prep →
   Lodged (VASP) → Assessment → Duties Paid → Release → Delivered. Dropping
   into Assessment auto-runs **selectivity** (70% green / 20% yellow / 10%
   red). Detail page: stage stepper, 11-doc checklist (PCA-ready), activity
   timeline, 70/30 billing with payment recording + release-hold warning.
6. **Rate Cards** — buy/sell USD per lane/carrier/equipment with validity and
   expiring/expired badges (margin-leak alert on dashboard).
7. **Dashboard** — win rate 30d, avg margin, D&T processed, turnaround hrs vs
   the 1–2 day baseline, quotes/week (sent vs won), margin trend, lane mix
   donut, pipeline strip, expiring rate alerts.
8. **Clients + Settings** — importer records; every fee parameter editable;
   demo-data reset.

## Architecture

- **Stack:** Vite + React 19 + Tailwind v4 + Recharts + @dnd-kit. **No
  backend** — localStorage (`aduana-db`, seed v3) via a context store with
  `update(draft)` mutation helper. MVP decision per client: skip Supabase.
- **Single-record principle** (CargoWise lesson): quote → D&T inputs →
  shipment → billing all hang off one quote record; BOC lines are *derived*
  at render, never stored stale.
- `lib/compute.js` — pure engine (unit-testable, swappable). `lib/seed.js` —
  settings + demo dataset. Pages are thin CRUD over the store.
- **Deploy:** Vercel static SPA + catch-all rewrite.

## Explicitly out of scope (Stage 2/3 later)

VASP XML export & e2m/CPS integration (design behind an abstraction), IEIRD/SAD
PDF generation, AI HS-classification & invoice OCR (human-in-the-loop),
real BSP FX fetch, auth/multi-user, Supabase persistence.

## Assumptions / caveats

- All fee figures are demo defaults from CAO/CMO lineage; the client must
  verify against current circulars before production (noted in-app).
- Tariff rates are plausible samples, not the official schedule.
- Selectivity simulation is illustrative, not a BOC prediction.
