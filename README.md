# Arth — Understand your money. Plan your future.

A personal finance and wealth-planning web app for residents of India. Arth computes
Indian income tax (new and old regimes), take-home salary, monthly budgets, SIP /
lump-sum / step-up investment projections, loan EMIs, emergency-fund targets, retirement
corpus and financial goals — all with real formulas in a separate, unit-tested
calculation engine. Every displayed figure comes from that engine; nothing is
hardcoded, faked or AI-generated.

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script              | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Vite dev server                          |
| `npm run build`     | Typecheck + production bundle to `dist/` |
| `npm run preview`   | Serve the production bundle              |
| `npm test`          | Run the unit/regression suite (Vitest)   |
| `npm run typecheck` | Strict TypeScript check                  |

## Environment variables

**There are none.** Arth in this build makes no network requests with your data, calls
no external APIs, and ships no keys. All state lives in browser `localStorage` under
the key `arth:v1`. If you later connect a market-data provider or an AI provider, its
key must be server-side only — never in the frontend bundle.

## Data privacy

- Local/demo-only experience: no accounts, no server, no database.
- Inputs and results are stored in this browser's `localStorage` (`arth:v1`) and are
  never transmitted.
- No bank connections, no credit-report access, no banking passwords / PINs / OTPs.
- Settings → **Export my data** downloads everything as JSON; **Delete all data**
  removes it from the browser.
- No compliance certifications are claimed (none have been obtained).
- Demo note: figures are computed from whatever you enter — they are your own entries,
  not verified payroll or market data.

## Supported financial years

Tax rules are **configuration, not code** — `src/engine/tax/fy*.ts`, one file per year,
each carrying its slabs, rebate, surcharge, cess and **source provenance (URL +
effective date)**. Add a new year by adding a file and registering it; the engine and
UI do not change.

| FY       | AY       | Effective from | New-regime highlights                                                                                                                          | Primary sources |
| -------- | -------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 2023-24  | 2024-25  | 2023-04-01     | Slabs 3/6/9/12/15L; SD ₹50,000; 87A ₹25,000 up to ₹7L                                                                                        | Finance (No.2) Act 2023; incometax.gov.in |
| 2024-25  | 2025-26  | 2024-04-01     | Slabs 3/7/10/12/15L; SD ₹75,000; 87A ₹25,000 up to ₹7L                                                                                        | Finance Act 2024 (PIB); incometax.gov.in |
| 2025-26  | 2026-27  | 2025-04-01     | Slabs 4/8/12/16/20/24L; SD ₹75,000; 87A ₹60,000 up to ₹12L + marginal relief; new-regime surcharge capped at 25%                              | incometax.gov.in AY2026-27 guide; KPMG Budget 2025-26; PIB |

Verified against official sources during the build (Oct 2025 rules cross-checked with
the Income Tax Department's AY 2026-27 portal guide). The old-regime slabs are
age-dependent (below 60 / 60–79 / 80+) and were unchanged for FY 2025-26.

## Formulas and conventions

**Tax engine** (`src/engine/tax/tax-engine.ts`)

1. Gross salary + other income − exemptions (HRA, old regime only) − deductions
   allowed *under the selected regime* → taxable income.
2. Progressive slab tax; slab income is paise-exact, half-away-from-zero rounding.
3. Sec 87A rebate (resident individuals) + marginal relief just above the rebate
   ceiling: tax payable cannot exceed income above the ceiling.
4. Surcharge by thresholds (₹50L/₹1Cr/₹2Cr/₹5Cr), with surcharge marginal relief,
   capped at 25% in the new regime (37% applies to old regime only).
5. Health & Education Cess 4% on (tax + surcharge).
6. Total rounded to the nearest ₹10 (Sec 288B convention).
7. **Effective rate** = total tax ÷ taxable income. **Marginal rate** = the change in
   tax for the next ₹1,000 of income (probed on the unrounded figure) — reported
   separately, never conflated.

Deduction eligibility by regime: HRA (Sec 10(13A)), 80C (₹1.5L), 80D, Sec 24(b)
(₹2L self-occupied) and other Ch VI-A are applied **only** where legally permitted;
the new regime receives only its standard deduction. Declaring rent/deductions under
the new regime produces an explanatory warning instead of a silent zero.

**HRA exemption** = min(actual HRA, rent − 10% of salary, 50% of salary in
Mumbai/Delhi/Kolkata/Chennai else 40%).

**Salary & take-home**

- CTC = gross salary + employer PF + gratuity accrual. Employer contributions leave
  CTC once and are **never** subtracted again from take-home.
- Take-home = gross − (employee PF + professional tax + other deductions) − income tax.
- CTC-only mode derives components from disclosed assumptions (basic 40% of CTC,
  HRA 50% of basic, employer PF 12% of basic, gratuity ≈ 15/26 ÷ 5 of basic, special
  allowance as remainder) and labels every output an **estimate**.

**Investments**

- SIP (ordinary annuity, end-of-month): `FV = P × (((1+r)^n − 1) / r)`; `r = 0` →
  `P × n`; beginning-of-month multiplies by `(1+r)`.
- Step-up SIP: monthly contribution rises by a % at the start of each 12-month block;
  each block compounds only for the remaining term.
- Lump sum: `FV = PV × (1+i)^n`.
- Real return: `((1 + nominal) / (1 + inflation)) − 1`.

**Loans**

- EMI = `P × r × (1+r)^n / ((1+r)^n − 1)`; zero-interest handled as `P ÷ n`.
- Full amortization schedule; prepayment recomputes from the prepayment month on the
  reduced balance, either shortening tenure (EMI unchanged) or reducing EMI
  (tenure unchanged).

**Budget** — surplus = monthly net income − planned outflow (expenses + savings);
savings rate = savings ÷ net income × 100; needs/wants/savings buckets computed from
category kinds; a 50/30/20 reference is shown as an *optional* starting point only.

**Retirement**

- Projected corpus = FV(current corpus) + FV(monthly contributions) at nominal return.
- Inflation-adjusted corpus = corpus ÷ (1 + inflation)^years.
- Required corpus = growing-annuity PV of retirement spending over a configurable
  duration at the post-retirement return: `E × (1 − ((1+g)/(1+R))^N) / (R − g)`,
  falling back to `E × N / (1+R)` when `R = g`.
- The app never claims the corpus is sufficient.

**Goals** — required monthly = shortfall ÷ annuity factor, where current savings are
compounded forward first. Combined requirements are compared to the monthly surplus
and a warning fires when they exceed it.

**Portfolio** — absolute return `((current − invested)/invested) × 100`; annualised
return per asset uses holding-period CAGR when a purchase date exists, and the
portfolio-level figure is the invested-weighted mean of those CAGRs (**explicitly not
an XIRR**). Concentration via largest-position share and HHI. Without a connected
licensed data provider, all valuations are labelled *manually entered* — no live-price
feed exists in this build.

**Emergency fund** — target = essential monthly expenses × months (user-chosen;
6 months displayed as a default, not a rule). Insurance review flags gaps and states
reference bases; it deliberately never outputs an "exact required cover".

**Money arithmetic** — `src/lib/money.ts`: integer-paise accumulation,
half-away-from-zero rounding, guarded division, ₹10 rounding for tax. Indian number
formatting (`₹12,50,000`) in `src/lib/format.ts`.

## Architecture

```
src/
  lib/            money.ts (decimal-safe arithmetic), format.ts (₹ formatting)
  engine/         PURE calculation modules — no React, no DOM, no I/O
    tax/          config-schema.ts + fy2023-24/25/26.ts (data+sources), tax-engine.ts
    salary.ts     budget.ts  investments.ts  loans.ts
    retirement.ts goals.ts   portfolio.ts    emergency.ts  assistant.ts
    __tests__/    103 unit + regression tests
  state/          AppState.ts (inputs), derive.ts (single derivation layer),
                  StoreContext.tsx (provider)
  ui/             ledger.tsx (primitives) · charts.tsx (Recharts, ledger palette)
                  Onboarding.tsx · App.tsx · screens/*
```

- **Formulas, tax configuration and UI are strictly separate.** Screens never do
  arithmetic — they render `derive(state)`, so charts and tables always agree with
  their corresponding module.
- Re-rendering is safe: derived values come from one `useMemo` over state.

## Testing

`npm test` runs 103 tests: formula unit tests (SIP/annuity identity checks, EMI
round-trips, zero-rate/zero-division edge cases, HRA three-limb minimum, 80C caps,
waterfall identity), tax-engine regressions across all three financial years
(threshold nil-tax cases, marginal relief, surcharge caps and relief, 87A residency),
and boundary conditions. Tax figures were hand-verified against official examples
(e.g. FY 2025-26 new regime: nil tax up to ₹12,75,000 gross salary; ₹12,10,000
taxable → ₹10,400 with marginal relief).

## Limitations (documented)

- Tax covers salary + other income at slab rates. Capital gains (special rates),
  business/profession presumptive taxation, and clubbing/set-off rules are not modelled.
- Surcharge marginal relief assumes salary-composition of income at the threshold.
- Professional tax is a user-entered state-specific amount (₹2,500/yr cap enforced).
- EPF is modelled on the user's entered amounts; the ₹15,000 statutory wage ceiling
  and EPS diversion are not auto-applied.
- Loan engine assumes fixed rates; floating resets, prepayment penalties, moratoriums
  and step-up EMIs are not modelled (noted per loan type in the UI).
- Portfolio annualised returns are weighted CAGR means, not XIRR.
- The assistant is a deterministic explainer of engine outputs — not an LLM, not a
  registered adviser, and it cannot introduce numbers.
- Inflation, returns and retirement duration are user assumptions; nothing is
  guaranteed or forecast.

## Design notes

"The Ledger" direction: a digitized *bahi-khata*. Warm paper (`#F6F4EE`), warm
charcoal ink (`#1B1B18`), ledger green (`#2F5D50`) for what you keep, debit red
(`#A63328`) for the margin rule and every deduction, ochre (`#8A6A1F`) reserved for
estimate/assumption tags. Two typefaces: **Newsreader** (editorial serif headings)
and **IBM Plex Sans/Mono** (UI + tabular figures). The signature element is the red
margin rule with the section number in the margin, and every figure on a ruled row
with a dotted leader.

## Deployment

Static SPA. Build with `npm run build`, host `dist/` on any static host (HTTPS
required for `localStorage` in production). No server, no database, no environment to
configure. If you later add server-side features (accounts, market data, AI), keep
keys server-side, scope data per authenticated user, and label the storage model
accurately.
