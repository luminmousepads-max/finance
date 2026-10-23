/**
 * Application state: raw user inputs only. Everything displayed anywhere —
 * every number, every chart point — comes from `derive()`, which runs the
 * calculation engine over these inputs. Screens never do arithmetic.
 */

import type { Regime, SupportedFY } from "../engine/tax/tax-engine";
import type { AssetEntry, AssetCategory } from "../engine/portfolio";
import type { BudgetCategory } from "../engine/budget";
import type { GoalInput, GoalKind } from "../engine/goals";
import type { CityCategory } from "../engine/salary";

export type SalaryBasis = "ctc" | "gross" | "taxable";
export type Employment = "salaried" | "selfEmployed" | "businessOwner";

export interface AppState {
  onboarded: boolean;

  // Step 1 — annual salary
  /** Annual salary entered in LPA (decimal, e.g. 12.5). */
  salaryLpa: number;
  salaryBasis: SalaryBasis;
  fy: SupportedFY;
  employment: Employment;
  regime: Regime;

  // Step 2 — salary structure (optional; estimate mode when absent)
  structureMode: "estimate" | "detailed";
  basicAnnual: number;
  hraAnnual: number;
  specialAllowanceAnnual: number;
  variablePayAnnual: number;
  employerPfAnnual: number;
  employeePfAnnual: number;
  professionalTaxMonthly: number;
  gratuityInCtcAnnual: number;
  otherBenefitsAnnual: number;
  otherDeductionsAnnual: number;
  /** Rent paid per month, for HRA exemption (old regime). */
  rentMonthly: number;
  cityCategory: CityCategory;
  employerPfInCtc: boolean;
  gratuityInCtc: boolean;
  /** Other income sources, annual. */
  otherIncomeAnnual: number;

  // Old-regime deductions (₹/year)
  section80C: number;
  section80D: number;
  homeLoanInterest24b: number;
  otherChapterVIA: number;

  // Step 3 — personal profile (all optional)
  age: number;
  city: string;
  stateName: string;
  dependents: number;
  currentSavings: number;
  emergencySavings: number;
  monthlyExpenses: number;
  /** Essential (non-discretionary) monthly expenses for emergency fund. */
  essentialMonthlyExpenses: number;
  existingEmiMonthly: number;
  currentInvestmentsMonthly: number;
  insuranceHealthCover: number;
  insuranceHealthPremium: number;
  insuranceTermCover: number;
  insuranceTermPremium: number;
  insuranceOutstandingLoans: number;
  insuranceFamilyExpense: number;
  insuranceEarners: number;
  riskTolerance: "conservative" | "moderate" | "aggressive";
  retirementAgeTarget: number;

  // Budget (monthly)
  budget: Partial<Record<BudgetCategory, number>>;

  // Investments
  sipMonthly: number;
  sipYears: number;
  sipAnnualRate: number;
  sipAnnualStepUp: number;
  sipBeginningOfMonth: boolean;
  lumpSumPrincipal: number;
  lumpSumYears: number;
  lumpSumAnnualRate: number;
  inflationRate: number;

  // Portfolio
  portfolio: AssetEntry[];

  // Loans
  loanPrincipal: number;
  loanAnnualRate: number;
  loanYears: number;
  loanKind: "home" | "personal" | "vehicle" | "education";
  prepayAfterMonth: number;
  prepayAmount: number;
  prepayStrategy: "tenure" | "emi";

  // Retirement
  retirementCurrentCorpus: number;
  retirementMonthly: number;
  retirementReturn: number;
  retirementPostReturn: number;
  retirementSpendingToday: number;
  retirementDurationYears: number;

  // Goals
  goals: GoalInput[];
}

export const DEFAULT_STATE: AppState = {
  onboarded: false,

  salaryLpa: 0,
  salaryBasis: "ctc",
  fy: "FY 2025-26",
  employment: "salaried",
  regime: "new",

  structureMode: "estimate",
  basicAnnual: 0,
  hraAnnual: 0,
  specialAllowanceAnnual: 0,
  variablePayAnnual: 0,
  employerPfAnnual: 0,
  employeePfAnnual: 0,
  professionalTaxMonthly: 200,
  gratuityInCtcAnnual: 0,
  otherBenefitsAnnual: 0,
  otherDeductionsAnnual: 0,
  rentMonthly: 0,
  cityCategory: "nonMetro",
  employerPfInCtc: true,
  gratuityInCtc: true,
  otherIncomeAnnual: 0,

  section80C: 0,
  section80D: 0,
  homeLoanInterest24b: 0,
  otherChapterVIA: 0,

  age: 30,
  city: "",
  stateName: "",
  dependents: 0,
  currentSavings: 0,
  emergencySavings: 0,
  monthlyExpenses: 0,
  essentialMonthlyExpenses: 0,
  existingEmiMonthly: 0,
  currentInvestmentsMonthly: 0,
  insuranceHealthCover: 0,
  insuranceHealthPremium: 0,
  insuranceTermCover: 0,
  insuranceTermPremium: 0,
  insuranceOutstandingLoans: 0,
  insuranceFamilyExpense: 0,
  insuranceEarners: 1,
  riskTolerance: "moderate",
  retirementAgeTarget: 60,

  budget: {},

  sipMonthly: 10_000,
  sipYears: 10,
  sipAnnualRate: 0.12,
  sipAnnualStepUp: 0,
  sipBeginningOfMonth: false,
  lumpSumPrincipal: 100_000,
  lumpSumYears: 10,
  lumpSumAnnualRate: 0.11,
  inflationRate: 0.06,

  portfolio: [],

  loanPrincipal: 5_000_000,
  loanAnnualRate: 0.085,
  loanYears: 20,
  loanKind: "home",
  prepayAfterMonth: 24,
  prepayAmount: 200_000,
  prepayStrategy: "tenure",

  retirementCurrentCorpus: 500_000,
  retirementMonthly: 15_000,
  retirementReturn: 0.11,
  retirementPostReturn: 0.07,
  retirementSpendingToday: 600_000,
  retirementDurationYears: 25,

  goals: [],
};

export const STORAGE_KEY = "arth:v1";

export function loadState(): AppState {
  if (typeof localStorage === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — app continues in memory only.
  }
}

export function clearState(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export const EMPTY_GOAL = (kind: GoalKind = "custom"): GoalInput => ({
  id: `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  name: "",
  kind,
  targetAmount: 0,
  years: 5,
  currentSavings: 0,
  expectedReturn: 0.1,
});

export const EMPTY_ASSET = (): AssetEntry => ({
  id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  name: "",
  category: "equity" as AssetCategory,
  invested: 0,
  currentValue: 0,
  purchaseDate: "",
  expectedReturn: undefined,
  valuationSource: "manual",
});
