/**
 * Emergency fund & insurance planner.
 *
 * emergency target = essential monthly expenses × target months.
 * The target months is a USER choice (employment stability, dependents) —
 * this engine never invents a "correct" number of months, and never invents
 * an exact insurance requirement: it reports coverage vs declared needs and
 * flags gaps as review items.
 */

import { addMoney, percentOf, subMoney } from "../lib/money";

export interface EmergencyInput {
  essentialMonthlyExpenses: number;
  targetMonths: number;
  currentEmergencySavings: number;
}

export interface EmergencyResult {
  target: number;
  current: number;
  remaining: number;
  monthsCovered: number;
  progressPct: number;
  warnings: string[];
}

export function computeEmergencyFund(input: EmergencyInput): EmergencyResult {
  const warnings: string[] = [];
  const essential = Math.max(0, input.essentialMonthlyExpenses);
  const months = Math.max(0, input.targetMonths);
  const current = Math.max(0, input.currentEmergencySavings);

  const target = essential * months;
  const remaining = Math.max(0, subMoney(target, current));
  const monthsCovered = essential > 0 ? current / essential : 0;

  if (target === 0) {
    warnings.push("Set essential monthly expenses and a target number of months to compute a target.");
  }
  if (months > 0 && months < 3) {
    warnings.push(
      "A target under 3 months is thin for most households — this is a prompt to reconsider, not a rule."
    );
  }

  return {
    target,
    current,
    remaining,
    monthsCovered,
    progressPct: target > 0 ? percentOf(current, target) : 0,
    warnings,
  };
}

export interface InsuranceCoverage {
  label: string;
  /** Annual premium actually paid, if known. */
  annualPremium: number;
  /** Sum insured / cover amount, if known. Leave 0 when unknown. */
  coverAmount: number;
}

export interface InsuranceReviewInput {
  health: InsuranceCoverage;
  termLife: InsuranceCoverage;
  other: InsuranceCoverage[];
  /** User-declared annual outstanding liabilities (loans) used as context. */
  annualOutstandingLoans: number;
  /** User-declared annual family living expenses, if known. */
  annualFamilyExpense: number;
  /** Number of income earners in the family. */
  incomeEarners: number;
}

export interface InsuranceReview {
  totalAnnualPremium: number;
  health: InsuranceCoverage;
  termLife: InsuranceCoverage;
  other: InsuranceCoverage[];
  /**
   * Coverage-vs-context figures. Deliberately NOT an "ideal cover" number:
   * we only state the reference bases and let the user decide.
   */
  loanCoverReference: number;
  familyExpenseCoverReference: number;
  gaps: string[];
}

/**
 * Reviews declared cover against user-declared context. Produces review
 * flags only — it deliberately does not output an "exact required cover",
 * because that needs information (income stability, dependents, existing
 * assets) this screen does not collect.
 */
export function reviewInsurance(input: InsuranceReviewInput): InsuranceReview {
  const gaps: string[] = [];
  const totalAnnualPremium = addMoney(
    input.health.annualPremium,
    input.termLife.annualPremium,
    input.other.reduce((s, c) => addMoney(s, c.annualPremium), 0)
  );

  if (input.health.coverAmount === 0) {
    gaps.push("Health cover amount not entered — add your policy sum insured to review adequacy.");
  }
  if (input.termLife.coverAmount === 0 && input.annualOutstandingLoans > 0) {
    gaps.push(
      "You have declared outstanding loans but no term-life cover amount — add it so dependents' exposure can be reviewed."
    );
  }
  if (input.incomeEarners === 1 && input.termLife.coverAmount === 0) {
    gaps.push("Single-income household with no term cover recorded — review this with an advisor.");
  }

  const loanCoverReference = input.annualOutstandingLoans;
  const familyExpenseCoverReference =
    input.annualFamilyExpense > 0
      ? input.annualFamilyExpense * (input.incomeEarners > 0 ? 1 : 1)
      : 0;

  return {
    totalAnnualPremium,
    health: input.health,
    termLife: input.termLife,
    other: input.other,
    loanCoverReference,
    familyExpenseCoverReference,
    gaps,
  };
}
