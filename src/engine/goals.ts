/**
 * Financial goals engine.
 *
 * Required monthly contribution to hit a target from current savings:
 *   corpus FV = current × (1 + annualRate)^years
 *   shortfall = target − corpus FV
 *   P = shortfall / (((1 + r)^n − 1) / r),  r = annualRate / 12, n = months
 *   (P = shortfall / n when r = 0)
 *
 * Multiple goals are aggregated against the estimated monthly surplus; the
 * engine warns when combined targets exceed available surplus.
 */

import { MONTHS_PER_YEAR, monthlyRate } from "./investments";
import { addMoney, subMoney } from "../lib/money";

export type GoalKind =
  | "home"
  | "car"
  | "education"
  | "business"
  | "travel"
  | "emergencyFund"
  | "retirement"
  | "custom";

export const GOAL_KIND_LABELS: Record<GoalKind, string> = {
  home: "Buying a home",
  car: "Purchasing a car",
  education: "Higher education",
  business: "Starting a business",
  travel: "International travel",
  emergencyFund: "Emergency fund",
  retirement: "Retirement",
  custom: "Custom goal",
};

export interface GoalInput {
  id: string;
  name: string;
  kind: GoalKind;
  targetAmount: number;
  /** Years until the target date. */
  years: number;
  currentSavings: number;
  /** Nominal annual return assumed on this goal's corpus; 0 allowed. */
  expectedReturn: number;
}

export interface GoalResult {
  id: string;
  name: string;
  kind: GoalKind;
  targetAmount: number;
  years: number;
  /** FV of current savings at the target date. */
  savingsFv: number;
  /** Amount still to be funded. */
  shortfall: number;
  requiredMonthly: number;
  /** Whether current savings alone already exceed the target. */
  alreadyFunded: boolean;
}

export function computeGoal(goal: GoalInput): GoalResult {
  const years = Math.max(0, goal.years);
  const n = Math.round(years * MONTHS_PER_YEAR);
  const r = monthlyRate(goal.expectedReturn);
  const savingsFv =
    goal.currentSavings > 0
      ? goal.currentSavings * Math.pow(1 + goal.expectedReturn, years)
      : 0;
  const shortfall = Math.max(0, goal.targetAmount - savingsFv);

  let requiredMonthly: number;
  if (n === 0) {
    requiredMonthly = shortfall;
  } else if (r === 0) {
    requiredMonthly = shortfall / n;
  } else {
    const factor = (Math.pow(1 + r, n) - 1) / r;
    requiredMonthly = factor > 0 ? shortfall / factor : 0;
  }

  return {
    id: goal.id,
    name: goal.name,
    kind: goal.kind,
    targetAmount: goal.targetAmount,
    years,
    savingsFv,
    shortfall,
    requiredMonthly,
    alreadyFunded: shortfall <= 0,
  };
}

export interface GoalsAggregate {
  results: GoalResult[];
  totalRequiredMonthly: number;
  availableSurplus: number;
  /** Surplus after funding all goals (can be negative). */
  remainingSurplus: number;
  /** Sum of contribution requirements as % of surplus. */
  utilisationPct: number;
  warnings: string[];
}

export function computeGoalsAggregate(
  goals: GoalInput[],
  availableMonthlySurplus: number
): GoalsAggregate {
  const results = goals.filter((g) => g.targetAmount > 0).map(computeGoal);
  const totalRequiredMonthly = results.reduce((s, g) => addMoney(s, g.requiredMonthly), 0);
  const remainingSurplus = subMoney(availableMonthlySurplus, totalRequiredMonthly);
  const utilisationPct =
    availableMonthlySurplus > 0 ? (totalRequiredMonthly / availableMonthlySurplus) * 100 : 0;

  const warnings: string[] = [];
  if (totalRequiredMonthly > availableMonthlySurplus && availableMonthlySurplus >= 0) {
    warnings.push(
      `Combined goal contributions exceed your estimated monthly surplus by ₹${Math.round(totalRequiredMonthly - availableMonthlySurplus).toLocaleString("en-IN")} per month. Prioritise goals, extend timelines, or revisit expenses.`
    );
  }
  if (availableMonthlySurplus < 0) {
    warnings.push("Monthly surplus is negative — no goals can be funded until the budget balances.");
  }

  return {
    results,
    totalRequiredMonthly,
    availableSurplus: availableMonthlySurplus,
    remainingSurplus,
    utilisationPct,
    warnings,
  };
}
