/**
 * Derivation layer — the single source of every displayed figure.
 *
 * Screens call `derive(state)` (via useDerived) and render the results.
 * No screen performs arithmetic; charts read the same objects as tables.
 */

import type { AppState } from "./AppState";
import {
  buildTaxableIncome,
  computeTakeHome,
  estimateStructureFromCtc,
  splitTaxByOtherIncome,
} from "../engine/salary";
import type { SalaryStructureInput, TaxContextInput } from "../engine/salary";
import { computeBudget } from "../engine/budget";
import { computeEmergencyFund, reviewInsurance } from "../engine/emergency";
import { computeRetirement, retirementProjectionPath } from "../engine/retirement";
import { computeGoalsAggregate } from "../engine/goals";
import { computePortfolio } from "../engine/portfolio";
import { computeTax } from "../engine/tax/tax-engine";
import {
  buildProjection,
  lumpSumFutureValue,
  realReturn,
  sipFutureValue,
  stepUpSipFutureValue,
} from "../engine/investments";
import { buildAmortization, prepaymentEffect } from "../engine/loans";
import { addMoney, subMoney } from "../lib/money";

export interface Derived {
  /** CTC in ₹ from the LPA entry (basis-adjusted label). */
  annualAmount: number;
  /**
   * Consistent expense/surplus summary used by overview-style views:
   * - when the budget planner has entries, its numbers are authoritative;
   * - otherwise the profile's monthly expenses are used, so the surplus card
   *   never contradicts the expenses card.
   */
  summary: {
    monthlyExpenses: number;
    monthlySurplus: number;
    savingsRate: number;
    source: "budget" | "profile" | "none";
  };
  isEstimateStructure: boolean;
  structure: SalaryStructureInput;
  taxContext: TaxContextInput;
  takeHome: ReturnType<typeof computeTakeHome>;
  /** Tax under both regimes for side-by-side comparison. */
  bothRegimes: ReturnType<typeof computeTax>[];
  /** Tax caused by non-salary income (for honest net income). */
  taxSplit: ReturnType<typeof splitTaxByOtherIncome>;
  /** All-in annual post-tax income available for budgeting. */
  annualNetIncome: number;
  monthlyNetIncome: number;
  budget: ReturnType<typeof computeBudget>;
  /** monthly surplus actually usable (budget surplus is the source). */
  monthlySurplus: number;
  sip: ReturnType<typeof sipFutureValue>;
  stepUpSip: ReturnType<typeof stepUpSipFutureValue>;
  lumpSum: ReturnType<typeof lumpSumFutureValue>;
  sipProjection: ReturnType<typeof buildProjection>;
  realReturn: number;
  portfolio: ReturnType<typeof computePortfolio>;
  amortization: ReturnType<typeof buildAmortization>;
  prepayment: ReturnType<typeof prepaymentEffect>;
  retirement: ReturnType<typeof computeRetirement>;
  retirementPath: ReturnType<typeof retirementProjectionPath>;
  goals: ReturnType<typeof computeGoalsAggregate>;
  emergency: ReturnType<typeof computeEmergencyFund>;
  insurance: ReturnType<typeof reviewInsurance>;
  warnings: string[];
}

export function derive(s: AppState): Derived {
  const warnings: string[] = [];

  const annualAmount = s.salaryLpa * 100_000;
  const structureMode = s.structureMode;

  const estimate = estimateStructureFromCtc({
    ctc: annualAmount,
    cityCategory: s.cityCategory,
    employerPfInCtc: s.employerPfInCtc,
    gratuityInCtc: s.gratuityInCtc,
    monthlyProfessionalTax: s.professionalTaxMonthly,
  });

  const structure: SalaryStructureInput =
    structureMode === "detailed"
      ? {
          basic: s.basicAnnual,
          hra: s.hraAnnual,
          specialAllowance: s.specialAllowanceAnnual,
          variablePay: s.variablePayAnnual,
          otherTaxableBenefits: s.otherBenefitsAnnual,
          employerPf: s.employerPfAnnual,
          employeePf: s.employeePfAnnual,
          gratuityInCtc: s.gratuityInCtcAnnual,
          professionalTax: s.professionalTaxMonthly * 12,
          otherDeductions: s.otherDeductionsAnnual,
        }
      : estimate;

  const taxContext: TaxContextInput = {
    regime: s.regime,
    fy: s.fy,
    age: s.age,
    otherIncome: s.otherIncomeAnnual,
    section80C: s.section80C,
    section80D: s.section80D,
    homeLoanInterest24b: s.homeLoanInterest24b,
    otherChapterVIADeductions: s.otherChapterVIA,
    hra:
      s.rentMonthly > 0
        ? {
            annualHraReceived: structure.hra,
            annualRentPaid: s.rentMonthly * 12,
            cityCategory: s.cityCategory,
            salaryForHra: structure.basic,
          }
        : undefined,
  };

  const takeHome = computeTakeHome(
    structure,
    taxContext,
    structureMode === "detailed" ? undefined : annualAmount
  );

  // Side-by-side regime comparison: same underlying taxable income figure is
  // NOT transferable between regimes (deductions differ), so rebuild per regime.
  const bothRegimes = (["new", "old"] as const).map((regime) => {
    const ctx = { ...taxContext, regime };
    const b = buildTaxableIncome(structure, ctx);
    return computeTax({
      taxableIncome: b.taxableIncome,
      regime,
      fy: s.fy,
      age: s.age,
    });
  });

  const taxSplit = splitTaxByOtherIncome(takeHome.taxableBuild, taxContext);

  // Net income for budgeting: salary take-home + other income − tax on it.
  const annualNetIncome = addMoney(
    takeHome.annualTakeHome,
    subMoney(s.otherIncomeAnnual, taxSplit.taxOnOtherIncome)
  );
  const monthlyNetIncome = annualNetIncome / 12;

  const budget = computeBudget(monthlyNetIncome, s.budget);
  const monthlySurplus = budget.surplus;

  const sipInput = {
    monthlyAmount: s.sipMonthly,
    annualRate: s.sipAnnualRate,
    years: s.sipYears,
    beginningOfMonth: s.sipBeginningOfMonth,
  };
  const sip = sipFutureValue(sipInput);
  const stepUpSip = stepUpSipFutureValue({
    ...sipInput,
    annualStepUp: s.sipAnnualStepUp,
  });
  const lumpSum = lumpSumFutureValue({
    principal: s.lumpSumPrincipal,
    annualRate: s.lumpSumAnnualRate,
    years: s.lumpSumYears,
  });
  const sipProjection = buildProjection({
    ...sipInput,
    annualStepUp: s.sipAnnualStepUp,
  });
  const realReturnRate = realReturn(s.sipAnnualRate, s.inflationRate);

  const portfolio = computePortfolio(s.portfolio);

  const loanInput = {
    principal: s.loanPrincipal,
    annualRate: s.loanAnnualRate,
    tenureMonths: s.loanYears * 12,
  };
  const amortization = buildAmortization(loanInput);
  const prepayment = prepaymentEffect({
    ...loanInput,
    afterMonth: s.prepayAfterMonth,
    extraPrincipal: s.prepayAmount,
    strategy: s.prepayStrategy,
  });

  const retirement = computeRetirement({
    currentAge: s.age,
    retirementAge: s.retirementAgeTarget,
    retirementDurationYears: s.retirementDurationYears,
    currentCorpus: s.retirementCurrentCorpus,
    monthlyContribution: s.retirementMonthly,
    expectedReturn: s.retirementReturn,
    postRetirementReturn: s.retirementPostReturn,
    inflation: s.inflationRate,
    annualSpendingToday: s.retirementSpendingToday,
  });
  const retirementPath = retirementProjectionPath({
    currentAge: s.age,
    retirementAge: s.retirementAgeTarget,
    retirementDurationYears: s.retirementDurationYears,
    currentCorpus: s.retirementCurrentCorpus,
    monthlyContribution: s.retirementMonthly,
    expectedReturn: s.retirementReturn,
    postRetirementReturn: s.retirementPostReturn,
    inflation: s.inflationRate,
    annualSpendingToday: s.retirementSpendingToday,
  });

  // Summary consistency: only trust the budget planner when it has entries.
  const budgetHasEntries = Object.values(s.budget).some((v) => (v ?? 0) > 0);
  const summary = budgetHasEntries
    ? {
        monthlyExpenses: budget.totalExpenses,
        monthlySurplus: budget.surplus,
        savingsRate: budget.savingsRate,
        source: "budget" as const,
      }
    : s.monthlyExpenses > 0
      ? {
          monthlyExpenses: s.monthlyExpenses,
          monthlySurplus: monthlyNetIncome - s.monthlyExpenses - s.currentInvestmentsMonthly,
          savingsRate:
            monthlyNetIncome > 0
              ? ((monthlyNetIncome - s.monthlyExpenses - s.currentInvestmentsMonthly) / monthlyNetIncome) * 100
              : 0,
          source: "profile" as const,
        }
      : { monthlyExpenses: 0, monthlySurplus: monthlyNetIncome, savingsRate: 0, source: "none" as const };

  // Goals are funded from the same surplus shown on Overview.
  const goals = computeGoalsAggregate(s.goals, summary.monthlySurplus);

  const emergency = computeEmergencyFund({
    essentialMonthlyExpenses:
      s.essentialMonthlyExpenses > 0 ? s.essentialMonthlyExpenses : s.monthlyExpenses,
    targetMonths: 6,
    currentEmergencySavings: s.emergencySavings,
  });

  const insurance = reviewInsurance({
    health: {
      label: "Health",
      annualPremium: s.insuranceHealthPremium,
      coverAmount: s.insuranceHealthCover,
    },
    termLife: {
      label: "Term life",
      annualPremium: s.insuranceTermPremium,
      coverAmount: s.insuranceTermCover,
    },
    other: [],
    annualOutstandingLoans: s.insuranceOutstandingLoans,
    annualFamilyExpense: s.insuranceFamilyExpense,
    incomeEarners: s.insuranceEarners,
  });

  warnings.push(...takeHome.warnings, ...budget.warnings, ...goals.warnings, ...emergency.warnings);

  return {
    summary,
    annualAmount,
    isEstimateStructure: structureMode === "estimate",
    structure,
    taxContext,
    takeHome,
    bothRegimes,
    taxSplit,
    annualNetIncome,
    monthlyNetIncome,
    budget,
    monthlySurplus,
    sip,
    stepUpSip,
    lumpSum,
    sipProjection,
    realReturn: realReturnRate,
    portfolio,
    amortization,
    prepayment,
    retirement,
    retirementPath,
    goals,
    emergency,
    insurance,
    warnings,
  };
}
