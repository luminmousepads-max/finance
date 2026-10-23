/**
 * Monthly budget engine.
 *
 * surplus = monthly net income − monthly expenses
 * savings rate = savings / net income × 100
 *
 * 50/30/20 (needs/wants/savings) is offered only as an optional starting
 * point — never enforced. Negative surplus and over-budget states are warned.
 */

import { addMoney, percentOf, subMoney } from "../lib/money";

export type BudgetCategory =
  | "housing"
  | "groceries"
  | "utilities"
  | "transport"
  | "education"
  | "healthcare"
  | "insurance"
  | "entertainment"
  | "shopping"
  | "familySupport"
  | "loanEmis"
  | "savings"
  | "investments"
  | "misc";

export type WantKind = "need" | "want" | "savings";

export const BUDGET_CATEGORIES: { key: BudgetCategory; label: string; kind: WantKind }[] = [
  { key: "housing", label: "Housing / rent", kind: "need" },
  { key: "groceries", label: "Groceries", kind: "need" },
  { key: "utilities", label: "Utilities", kind: "need" },
  { key: "transport", label: "Transport", kind: "need" },
  { key: "education", label: "Education", kind: "need" },
  { key: "healthcare", label: "Healthcare", kind: "need" },
  { key: "insurance", label: "Insurance premiums", kind: "need" },
  { key: "entertainment", label: "Entertainment", kind: "want" },
  { key: "shopping", label: "Shopping", kind: "want" },
  { key: "familySupport", label: "Family support", kind: "need" },
  { key: "loanEmis", label: "Loan EMIs", kind: "need" },
  { key: "savings", label: "Savings", kind: "savings" },
  { key: "investments", label: "Investments", kind: "savings" },
  { key: "misc", label: "Miscellaneous", kind: "want" },
];

export type BudgetInputs = Partial<Record<BudgetCategory, number>>;

export interface BudgetResult {
  monthlyNetIncome: number;
  categories: { key: BudgetCategory; label: string; kind: WantKind; amount: number; pctOfIncome: number }[];
  totalExpenses: number;
  savingsAndInvestments: number;
  /** surplus counts savings & investments categories as planned outflow. */
  surplus: number;
  savingsRate: number;
  buckets: { need: number; want: number; savings: number };
  bucketPct: { need: number; want: number; savings: number };
  /** Optional 50/30/20 reference amounts against actual income. */
  fiftyThirtyTwenty: { needs: number; wants: number; savings: number };
  warnings: string[];
}

export function computeBudget(monthlyNetIncome: number, inputs: BudgetInputs): BudgetResult {
  const warnings: string[] = [];
  const income = Math.max(0, monthlyNetIncome);

  const categories = BUDGET_CATEGORIES.map((c) => {
    const amount = Math.max(0, inputs[c.key] ?? 0);
    return {
      key: c.key,
      label: c.label,
      kind: c.kind,
      amount,
      pctOfIncome: percentOf(amount, income),
    };
  });

  const totalExpenses = categories
    .filter((c) => c.kind !== "savings")
    .reduce((sum, c) => addMoney(sum, c.amount), 0);
  const savingsAndInvestments = categories
    .filter((c) => c.kind === "savings")
    .reduce((sum, c) => addMoney(sum, c.amount), 0);

  // Total planned outflow includes savings/investments: what is not available
  // to spend. Surplus = income − all planned outflow.
  const plannedOutflow = addMoney(totalExpenses, savingsAndInvestments);
  const surplus = subMoney(income, plannedOutflow);
  const savingsRate = income > 0 ? (savingsAndInvestments / income) * 100 : 0;

  const buckets = {
    need: categories.filter((c) => c.kind === "need").reduce((s, c) => addMoney(s, c.amount), 0),
    want: categories.filter((c) => c.kind === "want").reduce((s, c) => addMoney(s, c.amount), 0),
    savings: savingsAndInvestments,
  };
  const bucketPct = {
    need: percentOf(buckets.need, income),
    want: percentOf(buckets.want, income),
    savings: percentOf(buckets.savings, income),
  };

  const fiftyThirtyTwenty = {
    needs: income * 0.5,
    wants: income * 0.3,
    savings: income * 0.2,
  };

  if (income > 0 && surplus < 0) {
    warnings.push(
      `Planned expenses exceed monthly income by ₹${Math.abs(Math.round(surplus)).toLocaleString("en-IN")}. This budget is not fundable from take-home pay alone.`
    );
  }
  if (income > 0 && totalExpenses > income) {
    warnings.push("Non-savings expenses alone exceed monthly net income.");
  }
  if (income === 0) {
    warnings.push("Monthly net income is not set — percentages are unavailable.");
  }

  return {
    monthlyNetIncome: income,
    categories,
    totalExpenses,
    savingsAndInvestments,
    surplus,
    savingsRate,
    buckets,
    bucketPct,
    fiftyThirtyTwenty,
    warnings,
  };
}
