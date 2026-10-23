/**
 * Retirement planner.
 *
 * - Corpus projection: current retirement corpus compounded annually + monthly
 *   contributions as an ordinary annuity, both at the assumed nominal return.
 * - Inflation-adjusted corpus: corpus / (1 + inflation)^years (today's rupees).
 * - Required corpus: present value of a retirement-phase spending stream of
 *   configurable duration, discounted at the post-retirement real return
 *   (i.e. spending grows with inflation; portfolio earns nominal return).
 * - Gap = required − projected. The engine never claims sufficiency.
 */

import { MONTHS_PER_YEAR, monthlyRate } from "./investments";
import { addMoney, fromPaise, mulMoney, safeDiv, toPaise } from "../lib/money";

export interface RetirementInput {
  currentAge: number;
  retirementAge: number;
  /** Life-expectancy style planning horizon for retirement duration. */
  retirementDurationYears: number;
  currentCorpus: number;
  monthlyContribution: number;
  /** Nominal annual return while accumulating. */
  expectedReturn: number;
  /** Nominal annual return while drawing (post-retirement). */
  postRetirementReturn: number;
  inflation: number;
  /** Annual spending in TODAY's rupees at retirement. */
  annualSpendingToday: number;
}

export interface RetirementResult {
  yearsToRetirement: number;
  ageAtRetirement: number;
  /** FV of current corpus + FV of monthly contributions, at retirement. */
  projectedCorpus: number;
  corpusFromExisting: number;
  corpusFromContributions: number;
  /** Projected corpus expressed in today's purchasing power. */
  projectedCorpusReal: number;
  /** Spending in the future year's rupees (first year of retirement). */
  futureAnnualSpending: number;
  monthlySpendingAtRetirement: number;
  /**
   * Required corpus: annuity-due PV of inflation-indexed spending over the
   * retirement duration, discounted at post-retirementReturn.
   */
  requiredCorpus: number;
  gap: number;
  /** Withdrawal phase: first-year draw as % of required corpus. */
  firstYearWithdrawalRate: number;
  /** Corpus years: requiredCorpus / futureAnnualSpending. */
  corpusYears: number;
  assumptions: string[];
  warnings: string[];
}

/** FV of current corpus compounded annually. */
export function futureValueOfCorpus(corpus: number, annualRate: number, years: number): number {
  return Math.max(0, corpus) * Math.pow(1 + annualRate, Math.max(0, years));
}

/** FV of monthly contributions (ordinary annuity) over `years`. */
export function futureValueOfContributions(
  monthly: number,
  annualRate: number,
  years: number
): number {
  const n = Math.max(0, Math.round(years * MONTHS_PER_YEAR));
  const r = monthlyRate(annualRate);
  if (r === 0) return Math.max(0, monthly) * n;
  return Math.max(0, monthly) * ((Math.pow(1 + r, n) - 1) / r);
}

/**
 * Required corpus at retirement: PV (at retirement) of a spending stream that
 * starts at `firstYearSpending`, grows at `inflation`, and lasts
 * `durationYears`, discounted at `postRetirementReturn`.
 *
 * Growing-annuity-due: if R ≠ g:  E × (1 − ((1+g)/(1+R))^N) / (R − g)
 * if R = g:                      E × N / (1 + R)
 */
export function requiredCorpus(
  firstYearSpending: number,
  postRetirementReturn: number,
  inflation: number,
  durationYears: number
): number {
  const E = Math.max(0, firstYearSpending);
  const N = Math.max(0, durationYears);
  if (E === 0 || N === 0) return 0;
  const R = postRetirementReturn;
  const g = inflation;
  if (Math.abs(R - g) < 1e-12) {
    return (E * N) / (1 + R);
  }
  return (E * (1 - Math.pow((1 + g) / (1 + R), N))) / (R - g);
}

export function computeRetirement(input: RetirementInput): RetirementResult {
  const warnings: string[] = [];
  const assumptions: string[] = [];

  const yearsToRetirement = Math.max(0, input.retirementAge - input.currentAge);
  const ageAtRetirement = input.currentAge + yearsToRetirement;

  if (input.retirementAge <= input.currentAge) {
    warnings.push("Target retirement age must be above your current age.");
  }
  if (input.retirementDurationYears <= 0) {
    warnings.push("Set a retirement duration (years the corpus must last).");
  }
  if (input.inflation < 0) warnings.push("Negative inflation entered — verify your assumption.");

  const corpusFromExisting = futureValueOfCorpus(
    input.currentCorpus,
    input.expectedReturn,
    yearsToRetirement
  );
  const corpusFromContributions = futureValueOfContributions(
    input.monthlyContribution,
    input.expectedReturn,
    yearsToRetirement
  );
  const projectedCorpus = addMoney(corpusFromExisting, corpusFromContributions);

  const projectedCorpusReal =
    yearsToRetirement > 0 && input.inflation > -1
      ? projectedCorpus / Math.pow(1 + input.inflation, yearsToRetirement)
      : projectedCorpus;

  const futureAnnualSpending =
    input.annualSpendingToday * Math.pow(1 + input.inflation, yearsToRetirement);
  const monthlySpendingAtRetirement = futureAnnualSpending / MONTHS_PER_YEAR;

  const needed = requiredCorpus(
    futureAnnualSpending,
    input.postRetirementReturn,
    input.inflation,
    input.retirementDurationYears
  );
  const gap = needed - projectedCorpus;

  const corpusYears = futureAnnualSpending > 0 ? needed / futureAnnualSpending : 0;
  const firstYearWithdrawalRate =
    needed > 0 ? (futureAnnualSpending / needed) * 100 : 0;

  assumptions.push(
    `Accumulation: monthly contributions treated as end-of-month (ordinary annuity) at ${(input.expectedReturn * 100).toFixed(1)}% nominal.`
  );
  assumptions.push(
    `Retirement phase: spending grows with inflation (${(input.inflation * 100).toFixed(1)}%); portfolio earns ${(input.postRetirementReturn * 100).toFixed(1)}% nominal for ${input.retirementDurationYears} years.`
  );
  assumptions.push(
    "Projections are arithmetic on your assumptions — they are not forecasts, promises, or guarantees of sufficiency."
  );

  if (gap > 0) {
    warnings.push(
      `Projected corpus falls short of the required corpus by ₹${Math.round(gap).toLocaleString("en-IN")} under these assumptions.`
    );
  }

  return {
    yearsToRetirement,
    ageAtRetirement,
    projectedCorpus,
    corpusFromExisting,
    corpusFromContributions,
    projectedCorpusReal,
    futureAnnualSpending,
    monthlySpendingAtRetirement,
    requiredCorpus: needed,
    gap,
    firstYearWithdrawalRate,
    corpusYears,
    assumptions,
    warnings,
  };
}

/** Year-by-year corpus path for the chart. */
export function retirementProjectionPath(
  input: RetirementInput
): { year: number; age: number; corpus: number }[] {
  const path: { year: number; age: number; corpus: number }[] = [];
  const years = Math.max(0, Math.round(input.retirementAge - input.currentAge));
  for (let y = 0; y <= years; y++) {
    const corpus =
      futureValueOfCorpus(input.currentCorpus, input.expectedReturn, y) +
      futureValueOfContributions(input.monthlyContribution, input.expectedReturn, y);
    path.push({ year: y, age: input.currentAge + y, corpus });
  }
  return path;
}

/** Monthly SIP needed to close a shortfall over remaining working years. */
export function requiredMonthlyForGap(
  gapAmount: number,
  annualRate: number,
  years: number
): number {
  const n = Math.max(0, Math.round(years * MONTHS_PER_YEAR));
  if (n === 0) return 0;
  const r = monthlyRate(annualRate);
  if (r === 0) return fromPaise(toPaise(gapAmount) / n);
  const factor = (Math.pow(1 + r, n) - 1) / r;
  return mulMoney(safeDiv(Math.max(0, gapAmount), factor), 1);
}
