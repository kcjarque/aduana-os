# Excel → AduanaOS mapping

Where each of the brokerage's four working files lives in the app.

## 1. COMPUTATION OF DUTIES & TAXES.xlsx → **D&T Estimator** (`/estimator`, `lib/compute.js`)
- Main-data block (value, freight w/ standard defaults, insurance 2%/4%, HS rate,
  E.R., container counts) → estimator form, line for line.
- `BROKERAGE = DV × 0.00125 + 5,050` (their flat CAO 1-2001 convention) — exact.
- Wharfage 519.35/779.05 · arrastre 3,727/8,551 (× container count) — exact.
- CDS + IPF flat "STANDARD" values (their two tools disagree: quick tool 130/2000,
  legacy 265/1000-in-LC-but-2000-billed; app defaults 265/2000, both editable).
- CFS/CSF $5/20FT · $10/40FT × E.R. → in the BOC summary (not landed cost) — exact.
- Verified: the sheet's worked example (75,000 @ 4% DG, E.R. 61) reproduces to the
  centavo: DV 4,794,600 · brokerage 11,043.25 · LC 4,807,773.25 · VAT 576,932.79 ·
  summary 579,062.79 (with CDS 130).

## 2. INQUIRY TOOL.xlsx → **Quotations** (`/quotes/:id`)
- Header: client/contact, country of origin, incoterms (with EXW pickup address,
  POL, POD), commodity, FCL/LCL/AIR + 20FT/40FT columns, GW, CBM, delivery
  address, HS code with "0% if with Form-E" note.
- Its exact 16 computation lines with the remark ranges (origin charges, freight,
  dest forwarder, customs whse [LCL/AIR], shipping lines 85K/120K, container
  deposit [refundable], **duties & taxes auto from the engine**, customs process
  & O.T. 50–60K, arrastre/wharfage 9K/16K, whse & wharfinger, trucking, cnee
  royalty 8K/10K, misc, commission 3–5K, signing broker, all-in arrangement).
- TOTAL EXPENSES → FINAL QUOTATION (manual, per column) → GROSS INCOME →
  CNTR. DEPOSIT REFUND → NET INCOME, with the "PROFIT RANGE: 30K–50K" guide as
  the floor/target settings. The seeded AQ-2026-0101 is the sheet's own Merit
  Stainless Steel inquiry.

## 3. CONSOLIDATION CALCU FOR LCL & FCL.xlsx → **Consolidation** (`/consolidation`)
- LCL: Origin/Freight · Destination · Warehouse groups; FCL: Origin ·
  Destination · Shipping Lines — every row seeded verbatim (rate × qty ×
  E.R.-or-days), VAT 12% per group on the flagged rows, summary block totals.
- "Sync USD rows to current E.R." replaces retyping the exchange rate.

## 4. DT CALCULATOR & DOCUMENTATION.xls (legacy master) →
- "Frequently Used Tariff Headings" sheet → **Tariff Library** seed (88 lines,
  T.R. as MFN; preferential 0% per Form-E practice — verify per line).
- "Client's Confirmation Copy" → the **Advance Computation of Duties & Taxes**
  block on the printed quotation (numbered duty/VAT/IPF/excise/CSF sections →
  TOTAL AMOUNT PAYABLE + conforme signature line).
- CG/ATP letter sheets per carrier → the 17-carrier list on shipments (Benline,
  China Shipping, CMA CGM, COSCO, Evergreen, Hanjin, K-LINE, MCC, MOL, NYK,
  OOCL, RCL, SITC, SKY Intl., Uni-Ship, Wallem, Wan Hai) + the "CG / ATP Letter"
  item in the document checklist (with PRF, SDV, IEIRD + riders).
- Multi-item entries (up to 18 tariff lines w/ prorated freight/insurance),
  Intercommerce/CDEC encoding sheets, IEIRD front/back + riders, PRF/SDV and the
  ~60 invoice/packing-list formats = **Stage 2** (document generation), noted in
  SPEC.md — not in this MVP.
