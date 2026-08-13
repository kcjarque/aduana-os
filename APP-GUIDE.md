# AduanaOS — Complete App Guide (Plain English)

**Live app:** https://aduana-os.vercel.app
**Who it's for:** Marc Castro Customs Brokerage — quotation and clearance operations
**Purpose of this document:** describe everything the app does, in the order the
brokerage actually works, so you can audit it screen-by-screen against the real
workflow and flag anything that's missing, wrong, or named differently than how
the team says it.

---

## 1. The big picture

The app digitizes the brokerage's four working Excel files into one connected
system:

| Excel file | Became |
|---|---|
| INQUIRY TOOL.xlsx | The **Quotations** module (16 expense lines → final quotation → net income) |
| COMPUTATION OF DUTIES & TAXES.xlsx | The **D&T Estimator** (the BOC formula engine) |
| CONSOLIDATION CALCU FOR LCL & FCL.xlsx | The **Consolidation** calculator page |
| DT CALCULATOR & DOCUMENTATION.xls (legacy master) | The **Tariff Library** (frequently-used headings), the **Advance Computation** block on the printed quote, the **carrier list** for CG/ATP, and the document checklist items |

The core promise: an inquiry that takes 1–2 days to price on Excel gets priced
in minutes, and everything after — client signature, booking, clearance
tracking, 70/30 collection — hangs off that same record instead of living in
separate files.

**One flow, start to finish:**

> Inquiry comes in → build a **D&T estimate** → it becomes a **quotation**
> (16 expense lines + your final price) → client **signs on screen** →
> **converted to a shipment** → shipment moves across the **clearance board**
> (lodgement, selectivity, payment, release, delivery) → 70% and 30%
> collections recorded along the way.

---

## 2. Important context for auditing

- **This is a demo build with no server.** All data lives inside the browser
  you open it in (localStorage). Two people on two computers see their own
  separate copies. There is no login. This is intentional MVP scope — the
  workflows are real, the storage is not yet shared.
- **Settings → Reset demo data** restores the original sample dataset at any
  time. Feel free to break things while auditing.
- Sample data is pre-loaded: 11 quotations (including the actual Merit
  Stainless Steel inquiry from the Excel file), 6 shipments at different
  clearance stages, 6 clients, 9 rate cards, 8 weeks of exchange rates, and the
  88-line frequently-used tariff list.
- Every peso figure the app computes is **derived live from the fee constants
  in Settings** — change a constant and every estimate, quote, and dashboard
  number recomputes instantly. Nothing is stored stale.

---

## 3. Screen-by-screen

The left sidebar has nine screens. Taking them in workflow order:

### 3.1 D&T Estimator  *(the computation sheet, digitized)*

**What it is:** the "COMPUTATION OF DUTIES & TAXES" Excel sheet as a form. Fill
the left side, the right side shows the full computation waterfall instantly.

**Inputs (left card):**
- **Commodity / H.S. code** — type to search the Tariff Library by code or
  description; picking a line auto-fills the tariff rate.
- **Duty basis** — MFN (no cert of origin), ACFTA Form-E, ATIGA Form-D, or
  RCEP. Switching basis re-fills the rate from the tariff line. The rate stays
  editable as an override.
- **Incoterms** — EXWORKS / FOB / FCA / CFR / CIF / DDP. This changes the math:
  CIF means freight and insurance are already inside the value; CFR adds
  insurance only; everything else adds freight + insurance.
- **Currency + Exchange rate** — the E.R. auto-fills from the current BOC
  weekly rate (see FX Rates screen) and remains editable, exactly like the
  E.R. cell in the sheet.
- **Shipment mode** — FCL / LCL / Via Air, plus **number of 20FT and 40FT
  containers** (drives arrastre, wharfage, and CSF).
- **Total value** and **Dutiable freight** — freight has a **"Std" button**
  that applies the standard rates from the sheet: LCL $400 / AIR $300 /
  20FT $800 / 40FT $1,200.
- **Dutiable insurance** — 2% of value (general cargo), 4% (dangerous cargo),
  or an actual premium amount.
- **Bank charge** (if via L/C), **Excise tax** (manual, for ATRIG goods),
  **VAT-exempt** toggle.
- **Overrides** — arrastre, wharfage, and brokerage can each be overridden
  with a typed amount; blank means "use the standard schedule."

**The computation (right card)** — line-for-line with the sheet:

1. Customs value + freight + insurance = **Customs value (CIF)**
2. × Exchange rate = **Dutiable value (PHP)**
3. × Tariff rate = **Customs duty**
4. Landed cost block: dutiable value + duty + **brokerage fee**
   (DV × 0.125% + ₱5,050 — the CAO 1-2001 formula as the brokerage applies it)
   + bank charge + **wharfage** (₱519.35/20FT · ₱779.05/40FT) + **arrastre**
   (₱3,727/20FT · ₱8,551/40FT) + **CDS** + **IPF** = **Landed cost**
5. × 12% = **Value added tax**
6. **Summary:** VAT + duty + IPF + CDS + **CSF** ($5/20FT · $10/40FT × E.R.)
   + excise = **Customs total duties, taxes & other charges** (the amount
   payable to BOC)
7. Below it, a grand total that also includes brokerage, port charges, and
   bank charge.

**Buttons:** *Reset* clears the form. ***Create quotation from estimate*** makes
a draft quotation carrying these D&T inputs, with the final quotation
pre-filled at expenses + ₱30K (the profit floor) as a starting point.

**Audit check:** enter the sheet's own example — value 75,000, insurance 4%
dangerous, freight 600, rate 0%, E.R. 61, no containers, CDS set to 130 —
and you should get exactly DV 4,794,600 · brokerage 11,043.25 · landed cost
4,807,773.25 · VAT 576,932.79 · total 579,062.79.

### 3.2 Quotations  *(the inquiry tool, digitized)*

**The list screen:** every quotation with its number, client and cargo, lane
(ports), **final quotation amount**, **net income chip** (green ≥ ₱50K, amber
≥ ₱30K, red below floor), status, and validity date. Search box + status
filter + **New quotation** button.

**Statuses and what they mean:**
- **Draft** — being worked on; can be deleted.
- **Sent** — issued to the client (timestamps the turnaround metric).
- **Approved · signed** — client signed on the print screen; can convert to a
  shipment.
- **Booked** — converted; links to its shipment.
- **Lost** — closed without winning; keeps notes for the record.

**Inside a quotation (the editor):**

*Inquiry & shipment details* — the same header as the Excel inquiry tool:
client (their contact/phone/email shown underneath), commodity, country of
origin, **shipment option** (20FT only / 40FT only / 20FT-vs-40FT comparison /
LCL / Air), pickup address (appears only when incoterms = EXWORKS), port of
loading, port of destination, gross weight, volume, delivery address, valid
until.

*Computations — the 16 expense lines*, exactly as the inquiry tool lists them,
with the remark ranges shown beside each:

1. Origin Charges *($800/20FT / $1,000/40FT — EXW only)*
2. Air / Ocean Freight *($600/20FT / $800/40FT)*
3. Dest. Forwarder Charges
4. Customs Whse & Storage *(LCL or AIR shipments only)*
5. Shipping Lines Charges *(20FT-85K / 40FT-120K)*
6. Container Deposit *(refundable — see below)*
7. **Duties & Taxes — locked.** Auto-computed by the D&T engine; you can't
   type over it, you change it by changing the D&T inputs.
8. Customs Process & O.T. *(range 50K–60K FCL)*
9. Arrastre / Wharfage *(20FT-9K / 40FT-16K)*
10. Whse & Wharfinger *(LCL or AIR only)*
11. Trucking & Delivery
12. Cnee Royalty *(20FT-8K / 40FT-10K)*
13. Miscellaneous
14. Commission *(range 3K–5K)*
15. Signing Broker
16. All-in Arrangement

You can also add custom lines (and remove them); the standard 16 can't be
removed, keeping quotes comparable.

*The money math at the bottom, same as the sheet:*
- **TOTAL EXPENSES** — sum of all lines per column.
- **FINAL QUOTATION** — typed by you, per column (gold box). This is the
  price the client sees.
- **GROSS INCOME** = final quotation − total expenses.
- **CNTR. DEPOSIT REFUND** — the container-deposit line comes back when the
  empty is returned clean, so it's added back:
- **NET INCOME** = gross income + refund, with the color chip against the
  ₱30K–50K profit guide. If any column's net income is below ₱30K, a red
  warning banner appears at the top: raise the price or trim expenses before
  sending.

*Right side:* the compact D&T inputs (same engine as the estimator) with the
per-column "payable to BOC" figure; the 70/30 payment-terms card; internal
notes.

*Toolbar actions:* Pull freight rate (fills the freight line from a rate card,
converted at the quote's E.R.), Print / client sign-off, Mark sent, Mark lost,
Convert to shipment (when signed), Open shipment (when booked).

**Dual-column quotes:** in "20FT vs 40FT comparison" mode every line, the D&T,
and the final quotation run in two columns side by side — the client picks one
at conversion time.

### 3.3 The printed quotation & client sign-off

A clean A4 sheet (browser Print / Save as PDF):

- **Letterhead** — company name, tagline, address, TIN, license numbers (all
  from Settings).
- **Quoted-to block** + shipment summary (origin, destination + delivery
  address, commodity, GW/volume, H.S. code with basis and rate, incoterms and
  E.R.).
- **Two presentations**, toggled from the editor:
  - *Itemized* — the 16 lines numbered with amounts, plus one extra line
    "Professional & Service Fee" (your gross income), totaling exactly the
    FINAL QUOTATION. Nothing hidden, everything adds up.
  - *All-in* — one big final-quotation figure per column with an inclusions
    sentence listing what's covered.
- **Advance Computation of Duties & Taxes** — the Client's Confirmation Copy
  block from the legacy workbook: numbered sections (1 Customs Duty with the
  dutiable-value chain, 2 VAT with the landed-cost chain, 3 IPF, 4 Excise,
  5 CSF) ending in **TOTAL AMOUNT PAYABLE** to the Bureau of Customs, per
  column.
- **Terms** — 70% downpayment on signed acceptance / 30% before release;
  computation subject to BOC final assessment; container deposit refundable;
  validity date.
- **Signature blocks** — "Prepared by" and **Conforme** (signature over
  printed name).

**E-signature:** the *Client acceptance / e-sign* button opens a signature pad
(mouse or touch). Signing stamps the date, saves the signature image onto the
document, and flips the quotation to **Approved** — which is what makes the
70% downpayment due and unlocks conversion to a shipment.

### 3.4 Shipments — the Clearance Board

A drag-and-drop board with seven columns matching the clearance lifecycle:

**Booked → Docs Prep → Lodged (VASP) → Assessment → Duties Paid → Release →
Delivered**

Each card shows the shipment ref, container, client, B/L number, ETA, lane
badge, and contract total. Drag a card to move it; every move is logged with a
timestamp.

**Selectivity:** the moment a card is dragged into **Assessment** without a
lane yet, the app runs BOC selectivity and assigns **GREEN / YELLOW
(documentary check) / RED (physical examination)** — weighted 70/20/10 as a
simulation. You can re-run it from the shipment page. *(Audit note: this is a
simulation for demo purposes, not a prediction of actual BOC selectivity.)*

### 3.5 Inside a shipment

- **Stage stepper** — the seven stages across the top; click to set directly.
- **Document checklist (15 items)** — Commercial Invoice, Packing List, Bill
  of Lading, Certificate of Origin (Form E/D), Import Permit / ATRIG, Marine
  Insurance, **PRF**, **SDV**, **Client's Confirmation Copy**, **IEIRD (Import
  Entry) + Riders**, **CG / ATP Letter (per carrier)**, TAN, SSDT, OLRS / Gate
  Pass, Delivery Receipt. Ticking an item stamps the date. The header shows
  x/15 complete.
- **Activity timeline** — every event (booking, lodgement with entry number,
  selectivity result, payments, release, delivery) newest-first.
- **Billing · 70/30** — contract total (the signed final quotation), the 70%
  downpayment with a *Record payment* button, and the 30% balance (locked
  until the DP is recorded). If a shipment reaches Release with the balance
  unpaid, a red warning says to hold the gate pass.
- **Vessel & references** — **shipping line** (dropdown of the 17 carriers
  from the legacy workbook — determines which CG/ATP letter format applies),
  B/L number, vessel/voyage, ETA, free-form notes.

### 3.6 Consolidation  *(the LCL & FCL costing sheet)*

Two tabs, LCL and FCL, replicating the Excel worksheet:

- **LCL groups:** Origin/Freight → Destination → Warehouse Charges.
  **FCL groups:** Origin → Destination → Shipping Lines.
- Every row = charge name, currency (PHP/USD), rate, quantity, unit (SET /
  CBM / CNTR / CBM-per-day), and an **E.R./Days** multiplier — amount = rate ×
  qty × that multiplier, same as the sheet's formula.
- Groups flagged for VAT compute **12% on the ticked rows only** (e.g.
  documentation and LCL charge are VATable, THC and the USD charges are not
  — exactly as the sheet does it).
- Rows are editable, addable, removable; a sticky **Estimated summary** card
  shows each group subtotal and the grand total.
- **"Sync USD rows to current E.R."** updates every USD row's exchange rate in
  one click instead of retyping cells.

### 3.7 Rate Cards

The freight buy/sell book: lane, carrier, equipment (20FT/40FT/LCL), **buy**
and **sell** in USD, the spread, and a validity window with a status badge —
green (current), amber (expiring within 14 days), red (expired). Expired and
expiring cards also surface on the Dashboard. From any quotation you can pull
a card's sell rate into the freight line at the quote's E.R.

### 3.8 Tariff Library

The brokerage's own **Frequently Used Tariff Headings** list (88 lines) —
searchable by code or description, editable, with columns for MFN (the T.R.
from the sheet) and ATIGA / ACFTA / RCEP. Preferential columns default to 0%
following the "0% if with Form-E" practice and should be verified per line.
A banner notes the production path: request the full public-domain AHTN 2022
dataset from the Tariff Commission. This list is what the estimator's search
box looks up.

### 3.9 FX Rates

The weekly BOC rate table (Saturday–Friday effective periods, CMC-numbered),
ten currencies per week, with the current week highlighted. **Publish next
week** pre-fills the next period from the last one for quick entry. The
current week's rate is what auto-fills every new estimate and quotation, and
it's pinned in the top bar of every screen. *(No official BOC API exists — in
production this would be a scheduled fetch of the BSP reference bulletin with
admin confirmation; for now it's manual entry, same as the Excel cell.)*

### 3.10 Clients

Card per importer: company, TIN, address, contact person, phone, email; how
many quotations and bookings they have; total booked revenue; their two most
recent quotations as shortcuts. Add/edit from here — the quotation editor
picks clients from this list.

### 3.11 Settings  *(every constant, editable)*

- **Company profile** — everything on the quotation letterhead.
- **Commercial policy** — quote validity days, downpayment % (the 70), profit
  floor ₱30K and target ₱50K (drive the chips and warning banner).
- **Standard dutiable freight** — the LCL/AIR/20FT/40FT USD defaults.
- **BOC fee constants** — VAT %, CDS, IPF, insurance %s, the brokerage
  formula's base (₱5,050) and rate (0.125%), arrastre & wharfage per container
  type, CSF USD per container.
- **Reset demo data** — restore the original sample dataset.

### 3.12 Dashboard

- Hero: open quotes, shipments in clearance, **average quote turnaround in
  hours** vs the 1–2 day Excel baseline.
- Tiles: **win rate** (last 30 days), **average net income per quote** against
  the 30K–50K guide, **total D&T processed** (advanced to BOC across
  shipments), **rate cards expiring**.
- Charts: quotations sent vs won per week (8 weeks); selectivity lane mix
  donut; net-income trend; recent quotations; rate-card alerts; a
  seven-stage pipeline strip mirroring the clearance board.

---

## 4. Known assumptions & discrepancies to verify

Flagging these honestly — they came from conflicts inside the source files or
demo shortcuts:

1. **CDS:** the quick-computation sheet uses ₱130; the legacy tool and the
   Client's Confirmation Copy use ₱265. The app defaults to **₱265**
   (editable). Verify which is current practice (official CMO lineage is
   ₱265 + ₱15 BIR).
2. **IPF:** the quick sheet bills a flat ₱2,000; the legacy tool put ₱1,000
   in the landed cost but billed ₱2,000 in the summary. The app uses **one
   flat ₱2,000 in both places** (self-consistent, editable). Note CAO 2-2001's
   official brackets are ₱250–1,000 — worth a policy decision.
3. **Legacy summary quirk:** the old workbook excluded CDS from the "total
   payable" summary; the newer sheet includes it. The app **includes** it.
4. **Preferential tariff rates** default to 0% (Form-E/D practice) for the
   88 seeded lines — verify per line before quoting FTA rates.
5. **Selectivity is simulated** (70/20/10). Real lanes come from BOC's system.
6. **Port charges & all fee constants** are the sheets' figures; BOC/PPA
   update these periodically — Settings makes them editable for that reason.
7. **Exchange rates are seeded demo values** in realistic ranges, not live
   BSP data.
8. **Sample quotes/shipments/clients** are fabricated (except the Merit
   Stainless inquiry, which reproduces the Excel example).

---

## 5. What is NOT in this MVP (Stage 2 scope)

So the audit doesn't go looking for them:

- **Document generation** — IEIRD front/back + rider sheets, PRF, SDV, the
  ~60 invoice/packing-list formats, and per-carrier CG/ATP letter printing.
  (The checklist tracks them; the app doesn't print them yet.)
- **Multi-item entries** — the legacy tool computes up to 18 tariff lines per
  entry with prorated freight/insurance; the app currently computes one
  commodity line per shipment.
- **VASP integration** — no Intercommerce/CDEC encoding export or e2m/CPS
  filing; lodgement is tracked as a stage, done outside the app.
- **Shared database, logins, and roles** — data is per-browser (demo).
- **Live BSP/BOC exchange-rate feed** — manual weekly entry for now.
- **Payments** — the 70/30 buttons record that money was received; no payment
  gateway or receipts.

---

## 6. Audit checklist — walk the real workflow against the app

Tick each step where the app matches how the team actually works; note
anything that differs:

- [ ] An inquiry's intake fields (client, contacts, origin, incoterms, pickup
      address, ports, commodity, weight/volume, delivery address) match what
      the team collects.
- [ ] The D&T estimator reproduces a real recent computation to the peso
      (try one from the files).
- [ ] The 16 expense lines are the right lines, in the right order, with the
      right remark ranges — nothing the team prices is missing.
- [ ] Duties & Taxes appearing as one locked line inside the quote (instead
      of retyped) is acceptable.
- [ ] Final-quotation pricing with the 30K–50K net-income guide matches how
      prices are actually set.
- [ ] The printed quotation looks presentable to a real client; the Advance
      Computation block matches the confirmation copies the team sends.
- [ ] The e-sign → 70% DP → book flow matches how confirmations really happen
      (or note what does: email, Viber, printed conforme…).
- [ ] The seven clearance stages match the team's actual sequence; nothing is
      missing between Lodged and Release.
- [ ] The 15-document checklist covers every paper the team actually prepares
      (and nothing irrelevant).
- [ ] The 17-carrier list covers the shipping lines currently used.
- [ ] The consolidation calculator's groups/rows match today's LCL & FCL
      costing (rates will differ; structure shouldn't).
- [ ] The fee constants in Settings match current practice (CDS and IPF
      decisions from section 4 especially).
- [ ] The 30-day win rate, turnaround, and net-income dashboard numbers are
      the numbers management actually wants to see.

---

---

## 7. Addendum — audit-gap closure (v3)

Six gaps from the first audit are now closed. Details and the on-screen proof
are in **PUNCHLIST-STATUS.md**; in plain English:

- **Multi-item entries (up to 18 tariff lines).** The estimator and every
  quotation now take a list of tariff lines, each with its own H.S. code, basis,
  rate, and value. Freight and insurance are prorated across the lines by value
  share, duty uses each line's own rate, and VAT rounds per line — matching the
  legacy IEIRD worksheet to the peso. The seeded quote **AQ-2026-0102** is a
  real 4-line "ovens & cables" entry to demo this. *Single-commodity entries are
  just a one-row list — nothing changed for them.*
- **Trucking auto-fills by city.** Delivery address is now Province → City/
  Municipality → street. Pick a city and line 11 (Trucking & Delivery) fills
  itself from the trucking tariff, per container size, with a "from tariff"
  chip. No tariff row for that city → an amber "enter manually" hint. Manage the
  rate table in Settings → Trucking (seeded with SAMPLE figures — your real
  sheet drops straight in).
- **Inquiry completeness check ("kompleto ba?").** Every quotation shows an
  `x/12 complete` pill; the checklist knows the conditional fields (EXWORKS needs
  a pickup address, FOB needs a port of loading, FCL needs container counts…).
  "Mark sent" is blocked until complete (drafts always save), and one button
  copies a ready **Taglish follow-up** listing exactly what's still needed.
- **Brokerage schedule is a setting.** Default is the client's formula
  (DV × 0.125% + ₱5,050). A CAO 1-2001 bracket table is included for small
  shipments but badged **VERIFY before enabling** — confirm at demo, then flip.
- **Bigger tariff library.** The 88 favorites (★, ranked first) now sit
  alongside ~25 AHTN 2022 chapter rows (plastics, steel, machinery, furniture,
  tagged "book") so a search for an unlisted commodity still lands somewhere.
- **BOC fee policy in one card.** CDS amount + "include in summary" toggle, IPF
  flat vs CAO brackets, and an advanced legacy-split — so when the client says
  "we use ₱130 CDS," you flip it and every figure updates on screen. This turns
  the old audit footnote (§4.1–4.3) into a 10-second live answer.

**Engine tests:** the file `scripts/verify-fixtures.mjs` asserts the D&T engine
against the workbooks' own worked examples (the legacy 4-item VAGUS entry
→ ₱150,610, the same entry under current policy → ₱150,995, and the single-item
regression → ₱579,062.79). Run `npm run verify` any time.

---

*Companion docs in this repo:* **PUNCHLIST-STATUS.md** (gap-closure detail +
demo-day questions) · **EXCEL-MAPPING.md** (file-by-file mapping of the four
workbooks) · **SPEC.md** (design spec + update notes).*
