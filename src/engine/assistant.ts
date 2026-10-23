/**
 * Rule-based financial explainer (the "AI assistant").
 *
 * It reads the calculation engine's actual outputs and explains them in
 * plain language. It never invents numbers: every figure it mentions is
 * passed in from a computed result. It distinguishes facts (calculated
 * results) from estimates/assumptions, never guarantees returns, never
 * invents deductions, and never recommends buying or selling anything —
 * it closes by pointing to a qualified professional.
 *
 * Deliberately deterministic: same inputs → same explanation. No external
 * API, no keys, no data leaving the browser.
 */

import { formatINR, formatPercent } from "../lib/format";
import type { TakeHomeResult } from "./salary";
import type { BudgetResult } from "./budget";
import type { PortfolioResult } from "./portfolio";
import type { RetirementResult } from "./retirement";
import type { GoalsAggregate } from "./goals";

export interface AssistantLine {
  kind: "fact" | "estimate" | "assumption" | "caution" | "note";
  text: string;
}

export const DISCLAIMER =
  "Arth's assistant explains your own calculations. It is an educational planning tool, not personalised investment advice; Arth is not a registered financial adviser. Consult a qualified professional before making decisions.";

/** Explain a salary/take-home computation. */
export function explainTakeHome(res: TakeHomeResult, salaryLabel: string): AssistantLine[] {
  const lines: AssistantLine[] = [];
  const { taxResult, taxableBuild, annualTakeHome, monthlyTakeHome } = res;

  lines.push({
    kind: "fact",
    text: `Your gross salary for the year is ${formatINR(res.grossSalary)}${salaryLabel ? ` (${salaryLabel})` : ""}, and estimated annual take-home is ${formatINR(annualTakeHome)} — about ${formatINR(monthlyTakeHome)} per month.`,
  });

  lines.push({
    kind: "fact",
    text: `Income tax of ${formatINR(taxResult.totalTax)} is computed on taxable income ${formatINR(taxResult.taxableIncomeRounded)} under the ${taxResult.regime === "new" ? "new" : "old"} regime for ${taxResult.fy}: slab tax ${formatINR(taxResult.slabTax)}, rebate ${formatINR(taxResult.rebate87A)}, surcharge ${formatINR(taxResult.surcharge)}, cess ${formatINR(taxResult.cess)}.`,
  });

  lines.push({
    kind: "fact",
    text: `Effective tax rate: ${formatPercent(taxResult.effectiveRate)} of taxable income; marginal rate on your next rupee of income: ${formatPercent(taxResult.marginalRate, 0)}.`,
  });

  if (res.employerContributions > 0) {
    lines.push({
      kind: "note",
      text: `Employer PF and gratuity of ${formatINR(res.employerContributions)} are part of your CTC but are not part of take-home cash — they build your retirement balance instead. They are not subtracted twice.`,
    });
  }

  const payrollDeductions = res.employeePf + res.professionalTax + res.otherDeductions;
  if (payrollDeductions > 0) {
    lines.push({
      kind: "fact",
      text: `Payroll deductions (employee PF, professional tax, other) total ${formatINR(payrollDeductions)} per year, before tax.`,
    });
  }

  if (taxableBuild.standardDeduction > 0) {
    lines.push({
      kind: "fact",
      text: `A standard deduction of ${formatINR(taxableBuild.standardDeduction)} reduces your taxable salary under this regime.`,
    });
  }

  if (taxableBuild.hraExemption > 0) {
    lines.push({
      kind: "fact",
      text: `HRA exemption of ${formatINR(taxableBuild.hraExemption)} was allowed under the old regime rules.`,
    });
  }

  if (res.taxResult.rebateMarginalRelief > 0) {
    lines.push({
      kind: "fact",
      text: `Marginal relief of ${formatINR(res.taxResult.rebateMarginalRelief)} was applied because your income is just above the Sec 87A rebate threshold.`,
    });
  }

  return lines;
}

/** Explain a budget result. */
export function explainBudget(res: BudgetResult): AssistantLine[] {
  const lines: AssistantLine[] = [];

  lines.push({
    kind: "fact",
    text: `Planned monthly outflow is ${formatINR(res.totalExpenses)} of expenses plus ${formatINR(res.savingsAndInvestments)} saved/invested, against ${formatINR(res.monthlyNetIncome)} net income.`,
  });

  if (res.surplus >= 0) {
    lines.push({
      kind: "fact",
      text: `Monthly surplus: ${formatINR(res.surplus)} — a savings rate of ${formatPercent(res.savingsRate)}.`,
    });
  } else {
    lines.push({
      kind: "caution",
      text: `Planned expenses exceed income by ${formatINR(Math.abs(res.surplus))} per month. Reduce wants or revisit fixed costs; a negative budget cannot be funded from take-home pay.`,
    });
  }

  const top = [...res.categories].sort((a, b) => b.amount - a.amount).slice(0, 3);
  if (top.length > 0 && top[0].amount > 0) {
    lines.push({
      kind: "fact",
      text: `Your three largest categories are ${top.map((c) => `${c.label} (${formatPercent(c.pctOfIncome)} of income)`).join(", ")}.`,
    });
  }

  lines.push({
    kind: "estimate",
    text: `For reference only: 50/30/20 on this income would be ${formatINR(res.fiftyThirtyTwenty.needs)} needs / ${formatINR(res.fiftyThirtyTwenty.wants)} wants / ${formatINR(res.fiftyThirtyTwenty.savings)} savings. It is an optional starting point, not a rule.`,
  });

  lines.push({
    kind: "assumption",
    text: `Bucket split as entered: needs ${formatPercent(res.bucketPct.need)}, wants ${formatPercent(res.bucketPct.want)}, savings ${formatPercent(res.bucketPct.savings)} of income.`,
  });

  return lines;
}

/** Explain a portfolio result. */
export function explainPortfolio(res: PortfolioResult): AssistantLine[] {
  const lines: AssistantLine[] = [];

  lines.push({
    kind: "fact",
    text: `Portfolio: ${formatINR(res.totalInvested)} invested, currently ${formatINR(res.totalValue)} — absolute gain/loss of ${formatINR(res.totalGain)} (${formatPercent(res.totalGainPct)}).`,
  });

  if (res.annualisedPct !== null) {
    lines.push({
      kind: "fact",
      text: `Annualised return across dated holdings averages ${formatPercent(res.annualisedPct)} (invested-weighted mean of per-asset CAGRs, not an XIRR). This is history, not a forecast.`,
    });
  } else {
    lines.push({
      kind: "estimate",
      text: "No purchase dates recorded, so no annualised return can be computed — only the absolute return above.",
    });
  }

  lines.push({
    kind: "fact",
    text: `Largest position: ${res.topHoldingName || "—"} at ${formatPercent(res.topHoldingPct)} of the portfolio. Allocation concentration index (HHI): ${Math.round(res.concentrationHhi)}.`,
  });

  if (res.weightedExpectedReturn !== null) {
    lines.push({
      kind: "assumption",
      text: `Your weighted expected return is ${formatPercent(res.weightedExpectedReturn * 100)} — this is your own assumption, not a guaranteed or projected return.`,
    });
  }

  if (!res.hasLivePrices) {
    lines.push({
      kind: "estimate",
      text: "All valuations are manually entered; no live market data source is connected.",
    });
  }

  return lines;
}

/** Explain a retirement computation. */
export function explainRetirement(res: RetirementResult): AssistantLine[] {
  const lines: AssistantLine[] = [];

  lines.push({
    kind: "fact",
    text: `In ${res.yearsToRetirement} years (age ${res.ageAtRetirement}), your retirement investments are projected at ${formatINR(res.projectedCorpus)} — ${formatINR(res.projectedCorpusReal)} in today's rupees after inflation.`,
  });

  lines.push({
    kind: "assumption",
    text: `Projected corpus is arithmetic on your inputs (returns and inflation), not a forecast. Spending at retirement is estimated at ${formatINR(res.futureAnnualSpending)} per year in future rupees.`,
  });

  if (res.gap > 0) {
    lines.push({
      kind: "caution",
      text: `Gap: the required corpus of ${formatINR(res.requiredCorpus)} exceeds the projection by ${formatINR(res.gap)}. Closing it needs roughly ${formatINR(Math.max(0, res.requiredCorpus - res.projectedCorpus))} more at retirement — via higher contributions, a longer horizon, or revised assumptions.`,
    });
  } else {
    lines.push({
      kind: "fact",
      text: `Under these assumptions the projection (${formatINR(res.projectedCorpus)}) exceeds the required corpus (${formatINR(res.requiredCorpus)}). Lower returns, higher inflation or a longer retirement could still change this.`,
    });
  }

  lines.push({
    kind: "note",
    text: `First-year withdrawal would be ${formatPercent(res.firstYearWithdrawalRate)} of the required corpus (${res.corpusYears.toFixed(1)} corpus years).`,
  });

  return lines;
}

/** Explain goals vs surplus. */
export function explainGoals(res: GoalsAggregate): AssistantLine[] {
  const lines: AssistantLine[] = [];

  const funded = res.results.filter((g) => g.alreadyFunded);
  const active = res.results.filter((g) => !g.alreadyFunded);

  lines.push({
    kind: "fact",
    text: `${res.results.length} goal(s): ${active.length} need funding${funded.length ? `, ${funded.length} already covered by current savings` : ""}.`,
  });

  if (active.length > 0) {
    lines.push({
      kind: "fact",
      text: `Required across all goals: ${formatINR(res.totalRequiredMonthly)} per month, against an available surplus of ${formatINR(res.availableSurplus)} (${formatPercent(res.utilisationPct)} utilisation).`,
    });
  }

  for (const w of res.warnings) lines.push({ kind: "caution", text: w });

  if (res.remainingSurplus >= 0 && active.length > 0) {
    lines.push({
      kind: "note",
      text: `After funding every goal you would keep ${formatINR(res.remainingSurplus)} per month unallocated.`,
    });
  }

  return lines;
}
