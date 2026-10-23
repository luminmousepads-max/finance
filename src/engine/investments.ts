/**
 * Investment engine: SIP, lump-sum, step-up SIP, scenarios, real returns.
 *
 * Timing conventions (documented, per spec):
 * - SIP: ordinary annuity — monthly contributions at the END of each month.
 *   FV = P × (((1 + r)^n − 1) / r); annuity-due multiplies by (1 + r).
 * - Step-up SIP: contributions increase at the start of each 12-month block;
 *   each block's monthly contribution is an ordinary annuity for the months
 *   remaining, compounded to the end of the full term.
 * - Lump sum: FV = PV × (1 + i)^n with annual compounding.
 *
 * Nothing here is guaranteed: every return rate is a user assumption.
 */

import { fromPaise, safeDiv, toPaise } from "../lib/money";

export const MONTHS_PER_YEAR = 12;

/** Annual nominal rate → monthly effective rate. */
export function monthlyRate(annualRate: number): number {
  return annualRate / MONTHS_PER_YEAR;
}

export interface SipInput {
  monthlyAmount: number;
  /** Nominal annual expected return, e.g. 0.12 for 12%. */
  annualRate: number;
  years: number;
  /** true = contributions at the beginning of each month (annuity-due). */
  beginningOfMonth?: boolean;
}

export interface InvestmentOutcome {
  invested: number;
  futureValue: number;
  gain: number;
}

/** Ordinary-annuity SIP future value; degenerate case r = 0 → P × n. */
export function sipFutureValue(input: SipInput): InvestmentOutcome {
  const n = Math.max(0, Math.round(input.years * MONTHS_PER_YEAR));
  const r = monthlyRate(input.annualRate);
  const p = Math.max(0, input.monthlyAmount);
  let fv: number;
  if (r === 0) {
    fv = p * n;
  } else {
    const growth = Math.pow(1 + r, n);
    fv = p * ((growth - 1) / r);
    if (input.beginningOfMonth) fv *= 1 + r;
  }
  const invested = p * n;
  return { invested, futureValue: fv, gain: fv - invested };
}

export interface StepUpSipInput extends SipInput {
  /** Annual step-up % on the monthly contribution, e.g. 0.10 for 10%. */
  annualStepUp: number;
}

/**
 * Step-up SIP: month m belongs to year-block k = floor((m − 1) / 12);
 * contribution in that block is P × (1 + stepUp)^k; each month's contribution
 * compounds at the monthly rate for the remaining months (ordinary annuity
 * within each block).
 */
export function stepUpSipFutureValue(input: StepUpSipInput): InvestmentOutcome {
  const n = Math.max(0, Math.round(input.years * MONTHS_PER_YEAR));
  const r = monthlyRate(input.annualRate);
  let fv = 0;
  let invested = 0;
  for (let m = 1; m <= n; m++) {
    const block = Math.floor((m - 1) / MONTHS_PER_YEAR);
    const contribution = Math.max(0, input.monthlyAmount) * Math.pow(1 + input.annualStepUp, block);
    let compoundingMonths = n - m;
    if (input.beginningOfMonth) compoundingMonths += 1;
    fv += r === 0 ? contribution : contribution * Math.pow(1 + r, compoundingMonths);
    invested += contribution;
  }
  return { invested, futureValue: fv, gain: fv - invested };
}

export interface LumpSumInput {
  principal: number;
  /** Effective annual return, e.g. 0.11. */
  annualRate: number;
  years: number;
}

/** Compound growth FV = PV × (1 + i)^n. */
export function lumpSumFutureValue(input: LumpSumInput): InvestmentOutcome {
  const principal = Math.max(0, input.principal);
  const fv = principal * Math.pow(1 + input.annualRate, Math.max(0, input.years));
  return { invested: principal, futureValue: fv, gain: fv - principal };
}

/**
 * Real annual return: ((1 + nominal) / (1 + inflation)) − 1.
 * Guarded against inflation ≤ −1.
 */
export function realReturn(nominal: number, inflation: number): number {
  if (inflation <= -1) return nominal;
  return (1 + nominal) / (1 + inflation) - 1;
}

export type ScenarioName = "conservative" | "moderate" | "optimistic";

export interface Scenario {
  name: ScenarioName;
  rate: number;
  label: string;
}

/** Default scenario rates are editable presets, never presented as forecasts. */
export const DEFAULT_SCENARIOS: Scenario[] = [
  { name: "conservative", rate: 0.08, label: "Conservative (8%)" },
  { name: "moderate", rate: 0.12, label: "Moderate (12%)" },
  { name: "optimistic", rate: 0.15, label: "Optimistic (15%)" },
];

export interface ProjectionPoint {
  year: number;
  invested: number;
  futureValue: number;
  gain: number;
}

/** Year-by-year growth series for charts (SIP, optionally stepped up). */
export function buildProjection(
  input: SipInput & { annualStepUp?: number }
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  const years = Math.max(0, Math.round(input.years));
  for (let y = 1; y <= years; y++) {
    const slice: SipInput = { ...input, years: y };
    const outcome =
      input.annualStepUp && input.annualStepUp > 0
        ? stepUpSipFutureValue({ ...slice, annualStepUp: input.annualStepUp })
        : sipFutureValue(slice);
    points.push({
      year: y,
      invested: outcome.invested,
      futureValue: outcome.futureValue,
      gain: outcome.gain,
    });
  }
  return points;
}

export const KNOWN_PRODUCT_RATES = [
  { product: "Public Provident Fund (PPF)", note: "Govt-notified rate, revised quarterly; enter the current notified rate.", defaultRate: 0.071 },
  { product: "Employee Provident Fund (EPF)", note: "EPFO notified rate, annual; enter the current notified rate.", defaultRate: 0.0825 },
  { product: "National Pension System (NPS)", note: "Market-linked; asset-allocation dependent.", defaultRate: 0.1 },
  { product: "Fixed Deposit", note: "Bank rates vary by tenure and bank.", defaultRate: 0.07 },
  { product: "Recurring Deposit", note: "Bank rates vary by tenure.", defaultRate: 0.065 },
  { product: "Equity / Index funds", note: "Market-linked; not guaranteed.", defaultRate: 0.12 },
  { product: "Debt funds", note: "Market-linked; not guaranteed.", defaultRate: 0.08 },
  { product: "Gold", note: "Highly variable long-run returns.", defaultRate: 0.08 },
] as const;

/** Required monthly SIP to reach a target, from a starting corpus. */
export function requiredMonthlyInvestment(
  targetAmount: number,
  existingCorpus: number,
  annualRate: number,
  years: number
): number {
  const n = Math.max(0, Math.round(years * MONTHS_PER_YEAR));
  const r = monthlyRate(annualRate);
  const corpusFv = toPaise(existingCorpus) * Math.pow(1 + annualRate, Math.max(0, years));
  const shortfallPaise = toPaise(targetAmount) - corpusFv;
  if (shortfallPaise <= 0) return 0;
  if (r === 0) return fromPaise(safeDiv(shortfallPaise, n));
  const factor = (Math.pow(1 + r, n) - 1) / r;
  // shortfall is in paise → divide in paise space, convert to rupees once.
  return fromPaise(shortfallPaise / factor);
}
