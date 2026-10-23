/**
 * Loan / EMI engine.
 *
 * Standard fixed-rate EMI:  EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)
 * Zero-interest loans:      EMI = P / n  (handled separately, no division by 0).
 *
 * Prepayment: a one-time extra principal payment after a chosen month either
 * shortens the tenure (EMI unchanged — default) or reduces the EMI (tenure
 * unchanged), both recalculated on the remaining balance.
 */

import { fromPaise, toPaise } from "../lib/money";

export interface EmiInput {
  principal: number;
  /** Annual interest rate as a fraction, e.g. 0.085. */
  annualRate: number;
  tenureMonths: number;
}

/** Fixed-rate EMI. Zero-rate loans return P / n. */
export function computeEmi(input: EmiInput): number {
  const P = Math.max(0, input.principal);
  const n = Math.max(0, Math.round(input.tenureMonths));
  if (n === 0) return 0;
  const r = input.annualRate / 12;
  if (r === 0) return P / n;
  const growth = Math.pow(1 + r, n);
  return (P * r * growth) / (growth - 1);
}

export interface AmortizationRow {
  month: number;
  opening: number;
  emi: number;
  interest: number;
  principal: number;
  closing: number;
}

export interface AmortizationResult {
  emi: number;
  schedule: AmortizationRow[];
  totalInterest: number;
  totalRepayment: number;
  /** Interest paid per year, for the principal-vs-interest chart. */
  yearly: { year: number; interest: number; principal: number; balance: number }[];
}

/** Full month-by-month amortization schedule. */
export function buildAmortization(input: EmiInput): AmortizationResult {
  const emi = computeEmi(input);
  const r = input.annualRate / 12;
  const n = Math.max(0, Math.round(input.tenureMonths));
  let balance = Math.max(0, input.principal);
  const schedule: AmortizationRow[] = [];
  let totalInterest = 0;

  for (let month = 1; month <= n; month++) {
    const interest = balance * r;
    let principalPart = emi - interest;
    // Final-month rounding: pay off whatever principal remains.
    if (month === n || principalPart > balance) principalPart = balance;
    const closing = balance - principalPart;
    schedule.push({
      month,
      opening: balance,
      emi,
      interest,
      principal: principalPart,
      closing: Math.max(0, closing),
    });
    totalInterest += interest;
    balance = Math.max(0, closing);
    if (balance <= 0 && month < n) break;
  }

  const totalRepayment = totalInterest + Math.max(0, input.principal);
  const yearlyMap = new Map<number, { interest: number; principal: number; balance: number }>();
  for (const row of schedule) {
    const year = Math.ceil(row.month / 12);
    const entry = yearlyMap.get(year) ?? { interest: 0, principal: 0, balance: 0 };
    entry.interest += row.interest;
    entry.principal += row.principal;
    entry.balance = row.closing;
    yearlyMap.set(year, entry);
  }
  const yearly = [...yearlyMap.entries()]
    .map(([year, v]) => ({ year, ...v }))
    .sort((a, b) => a.year - b.year);

  return { emi, schedule, totalInterest, totalRepayment, yearly };
}

export interface PrepaymentInput extends EmiInput {
  /** Month (1-based) after which the extra principal is paid. */
  afterMonth: number;
  /** One-time extra principal (₹). */
  extraPrincipal: number;
  /** "tenure" shortens the loan; "emi" reduces the EMI. */
  strategy: "tenure" | "emi";
}

export interface PrepaymentResult {
  /** Months saved when strategy is "tenure". */
  monthsSaved: number;
  /** New EMI when strategy is "emi". */
  newEmi: number;
  /** Interest saved versus the original schedule. */
  interestSaved: number;
  /** Remaining months after prepayment. */
  remainingMonths: number;
}

/**
 * Effect of a one-time prepayment. Recomputes the schedule from the
 * prepayment month on the reduced balance.
 */
export function prepaymentEffect(input: PrepaymentInput): PrepaymentResult {
  const base = buildAmortization(input);
  const r = input.annualRate / 12;
  const after = Math.min(Math.max(1, Math.round(input.afterMonth)), input.tenureMonths);
  const row = base.schedule[after - 1];
  const balanceAfter = row ? row.closing : input.principal;
  const newBalance = Math.max(0, balanceAfter - Math.max(0, input.extraPrincipal));
  const remainingMonths = Math.max(0, input.tenureMonths - after);

  if (input.strategy === "tenure") {
    let months = 0;
    let bal = newBalance;
    const emi = base.emi;
    while (bal > 0 && months < remainingMonths + 600) {
      const interest = bal * r;
      const principalPart = emi - interest;
      if (principalPart <= 0) {
        months = Infinity; // EMI cannot clear the balance at this rate.
        break;
      }
      bal = bal - principalPart;
      months++;
    }
    const newTotalInterest =
      base.schedule.slice(0, after).reduce((a, x) => a + x.interest, 0) +
      monthlyInterestFor(newBalance, emi, r, Math.min(months, remainingMonths + 600));
    return {
      monthsSaved: Math.max(0, remainingMonths - months),
      newEmi: emi,
      interestSaved: Math.max(0, base.totalInterest - newTotalInterest),
      remainingMonths: months,
    };
  }

  // Strategy "emi": keep tenure, reduce EMI.
  const newEmi =
    remainingMonths === 0 || newBalance === 0
      ? 0
      : computeEmi({ principal: newBalance, annualRate: input.annualRate, tenureMonths: remainingMonths });
  const newTotalInterest =
    base.schedule.slice(0, after).reduce((a, x) => a + x.interest, 0) +
    monthlyInterestFor(newBalance, newEmi, r, remainingMonths);
  return {
    monthsSaved: 0,
    newEmi,
    interestSaved: Math.max(0, base.totalInterest - newTotalInterest),
    remainingMonths,
  };
}

function monthlyInterestFor(balance: number, emi: number, r: number, months: number): number {
  let bal = balance;
  let interest = 0;
  for (let i = 0; i < months && bal > 0; i++) {
    const part = Math.min(bal, emi - bal * r);
    interest += bal * r;
    bal -= part;
  }
  return interest;
}

export type LoanKind = "home" | "personal" | "vehicle" | "education";

export const LOAN_KIND_NOTES: Record<LoanKind, string> = {
  home: "Fixed-rate assumed. Floating-rate home loans reset with the external benchmark (repo) and your EMI/tenture will change at resets.",
  personal: "Usually fixed-rate, higher cost. Prepayment penalties are rare now but check your sanction letter.",
  vehicle: "Fixed-rate assumed for the tenure; check for foreclosure charges on floating-rate car loans.",
  education: "Fixed or floating depending on lender; moratorium/interest-subsidy periods are not modelled here.",
};

/** Compare EMIs across rate/tenure combinations. */
export function compareLoans(
  principal: number,
  rates: number[],
  tenuresInYears: number[]
): { rate: number; years: number; emi: number; totalInterest: number }[] {
  const out: { rate: number; years: number; emi: number; totalInterest: number }[] = [];
  for (const rate of rates) {
    for (const years of tenuresInYears) {
      const res = buildAmortization({
        principal,
        annualRate: rate,
        tenureMonths: years * 12,
      });
      out.push({ rate, years, emi: res.emi, totalInterest: res.totalInterest });
    }
  }
  return out;
}

/** Interest as a share of total repayment — used for the donut. */
export function interestShare(res: AmortizationResult): number {
  const total = toPaise(res.totalRepayment);
  return total === 0 ? 0 : (toPaise(res.totalInterest) / total) * 100;
}

/** Convenience for UI: format months as "18 y 4 m". */
export function monthsToLabel(months: number): string {
  const y = Math.floor(months / 12);
  const m = Math.round(months % 12);
  if (y === 0) return `${m} m`;
  return m === 0 ? `${y} y` : `${y} y ${m} m`;
}

export { fromPaise };
