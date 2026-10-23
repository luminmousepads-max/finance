/**
 * Salary & take-home engine.
 *
 * Two modes:
 * - "estimate": user gives only CTC; components are derived from disclosed
 *   percentage assumptions (labelled as estimates everywhere in the UI).
 * - "detailed": user supplies each salary-slip component.
 *
 * Rules enforced here:
 * - Employer PF is a cost to company, NOT employee income — it is subtracted
 *   from CTC to reach gross salary and never again from take-home.
 * - Employee PF is a payroll deduction from the employee's gross, not an
 *   extra cut on top of CTC.
 * - HRA exemption is computed only when the old regime is selected and the
 *   user supplies rent paid; the new regime allows no HRA exemption.
 */

import type { Regime, SupportedFY } from "./tax/tax-engine";
import { computeTax, getTaxYearConfig } from "./tax/tax-engine";
import type { TaxInput, TaxResult } from "./tax/tax-engine";
import { addMoney, clamp, divMoney, mulMoney, subMoney, toPaise } from "../lib/money";

export type CityCategory = "metro" | "nonMetro";

export interface SalaryStructureInput {
  /** Annual gross salary components (₹). */
  basic: number;
  hra: number;
  specialAllowance: number;
  variablePay: number;
  otherTaxableBenefits: number;
  /** Employer PF for the year (part of CTC, not take-home). */
  employerPf: number;
  /** Employee PF deducted from gross. */
  employeePf: number;
  /** Gratuity accrued inside CTC. */
  gratuityInCtc: number;
  /** Professional tax for the year (₹), state-dependent. */
  professionalTax: number;
  /** Other payroll deductions (NPS employer, insurance premium…). */
  otherDeductions: number;
}

export interface HraInput {
  annualHraReceived: number;
  annualRentPaid: number;
  cityCategory: CityCategory;
  /** Basic + DA, the salary base for HRA exemption. */
  salaryForHra: number;
}

export interface CtcEstimateInput {
  ctc: number;
  cityCategory: CityCategory;
  /** Set false when employer PF is not part of the CTC (rare). */
  employerPfInCtc: boolean;
  gratuityInCtc: boolean;
  /** Monthly professional tax; default 200 (₹2,400/yr) where levied. */
  monthlyProfessionalTax: number;
}

export interface TaxContextInput {
  regime: Regime;
  fy: SupportedFY;
  age: number;
  isResident?: boolean;
  /** Income from sources other than salary (rent, interest, freelance…). */
  otherIncome?: number;
  /** Old-regime deductions the user declares. */
  section80C?: number;
  section80D?: number;
  homeLoanInterest24b?: number;
  otherChapterVIADeductions?: number;
  hra?: HraInput;
}

export interface TaxableIncomeBuild {
  grossSalary: number;
  otherIncome: number;
  hraExemption: number;
  standardDeduction: number;
  deductions80C: number;
  deductions80D: number;
  homeLoanInterest24b: number;
  otherChapterVIA: number;
  totalExemptionsDeductions: number;
  taxableIncome: number;
  regimeAllows: { hra: boolean; c80: boolean; d80: boolean; loan24b: boolean; otherVIA: boolean };
  warnings: string[];
}

export interface TakeHomeResult {
  ctc: number;
  grossSalary: number;
  employerContributions: number;
  employeePf: number;
  professionalTax: number;
  otherDeductions: number;
  incomeTax: number;
  taxResult: TaxResult;
  taxableIncome: number;
  annualTakeHome: number;
  monthlyTakeHome: number;
  /** CTC → take-home waterfall rows for the chart. */
  waterfall: { label: string; value: number; kind: "start" | "deduction" | "end" }[];
  /** Salary retained outside take-home (employer PF + gratuity accrual). */
  retainedOutsideTakeHome: number;
  warnings: string[];
  taxableBuild: TaxableIncomeBuild;
}

/**
 * HRA exemption under Sec 10(13A) — lowest of:
 * (a) actual HRA received,
 * (b) rent paid − 10% of salary,
 * (c) 50% of salary in Mumbai/Delhi/Kolkata/Chennai, else 40%.
 */
export function computeHraExemption(hra: HraInput): number {
  const salary = Math.max(0, hra.salaryForHra);
  const rent = Math.max(0, hra.annualRentPaid);
  if (rent === 0 || hra.annualHraReceived === 0) return 0;
  const pct = hra.cityCategory === "metro" ? 0.5 : 0.4;
  const a = Math.max(0, hra.annualHraReceived);
  const b = Math.max(0, rent - mulMoney(salary, 0.1));
  const c = mulMoney(salary, pct);
  return Math.min(a, b, c);
}

/** Disclosed default structure used when only CTC is known. */
export const CTC_ESTIMATE_ASSUMPTIONS = {
  basicShareOfCtc: 0.4,
  hraShareOfBasic: 0.5,
  employerPfRate: 0.12,
  /** Statutory PF wage ceiling, ₹15,000/month. */
  pfWageCeilingMonthly: 15_000,
  /** Gratuity accrual ≈ 15 days' wages per year of service. */
  gratuityFactorOfBasic: 15 / 26 / 5,
} as const;

/** Derive a full salary structure from CTC alone (explicitly an estimate). */
export function estimateStructureFromCtc(input: CtcEstimateInput): SalaryStructureInput {
  const A = CTC_ESTIMATE_ASSUMPTIONS;
  const basic = mulMoney(input.ctc, A.basicShareOfCtc);
  const hra = mulMoney(basic, A.hraShareOfBasic);
  const employerPf = input.employerPfInCtc
    ? mulMoney(basic, A.employerPfRate)
    : 0;
  const gratuity = input.gratuityInCtc ? mulMoney(basic, A.gratuityFactorOfBasic) : 0;
  // Special allowance absorbs everything unallocated.
  const specialAllowance = Math.max(
    0,
    subMoney(input.ctc, addMoney(basic, hra, employerPf, gratuity))
  );
  return {
    basic,
    hra,
    specialAllowance,
    variablePay: 0,
    otherTaxableBenefits: 0,
    employerPf,
    // Employee PF matches employer PF on the same base by default.
    employeePf: employerPf,
    gratuityInCtc: gratuity,
    professionalTax: mulMoney(input.monthlyProfessionalTax, 12),
    otherDeductions: 0,
  };
}

/** Gross salary = all employee-side annual earnings. */
export function grossSalaryOf(s: SalaryStructureInput): number {
  return addMoney(
    s.basic,
    s.hra,
    s.specialAllowance,
    s.variablePay,
    s.otherTaxableBenefits
  );
}

/** Build taxable income for a regime from a salary structure + context. */
export function buildTaxableIncome(
  s: SalaryStructureInput,
  ctx: TaxContextInput
): TaxableIncomeBuild {
  const cfg = getTaxYearConfig(ctx.fy);
  const rules = ctx.regime === "new" ? cfg.newRegime : cfg.oldRegime;
  const warnings: string[] = [];

  const grossSalary = grossSalaryOf(s);

  const hraExemption =
    rules.allowsHra && ctx.hra ? computeHraExemption(ctx.hra) : 0;
  if (ctx.regime === "new" && ctx.hra && ctx.hra.annualRentPaid > 0) {
    warnings.push(
      "HRA exemption is not available under the new tax regime; rent paid does not reduce your new-regime taxable income."
    );
  }

  const standardDeduction = Math.min(rules.standardDeduction, grossSalary);

  const clampDeduction = (declared: number | undefined, cap: number | null, allowed: boolean) => {
    if (!allowed || !declared || declared <= 0) return 0;
    if (cap === null) return declared;
    if (declared > cap) {
      warnings.push(`Deduction capped at ₹${cap.toLocaleString("en-IN")} by statute.`);
      return cap;
    }
    return declared;
  };

  const deductions80C = clampDeduction(ctx.section80C, 150_000, rules.allows80C);
  const deductions80D = clampDeduction(ctx.section80D, 100_000, rules.allows80D);
  const homeLoanInterest24b = clampDeduction(
    ctx.homeLoanInterest24b,
    200_000,
    rules.allowsHomeLoanInterest24b
  );
  const otherChapterVIA = clampDeduction(
    ctx.otherChapterVIADeductions,
    null,
    rules.allowsOtherChapterVIA
  );

  if (ctx.regime === "new" && (ctx.section80C || ctx.section80D || ctx.homeLoanInterest24b)) {
    warnings.push(
      "Sec 80C/80D/24(b) deductions are not available under the new tax regime; they are ignored here."
    );
  }

  const totalExemptionsDeductions = addMoney(
    hraExemption,
    standardDeduction,
    deductions80C,
    deductions80D,
    homeLoanInterest24b,
    otherChapterVIA
  );

  const otherIncome = Math.max(0, ctx.otherIncome ?? 0);
  const taxableIncome = Math.max(
    0,
    subMoney(addMoney(grossSalary, otherIncome), totalExemptionsDeductions)
  );

  return {
    grossSalary,
    otherIncome,
    hraExemption,
    standardDeduction,
    deductions80C,
    deductions80D,
    homeLoanInterest24b,
    otherChapterVIA,
    totalExemptionsDeductions,
    taxableIncome,
    regimeAllows: {
      hra: rules.allowsHra,
      c80: rules.allows80C,
      d80: rules.allows80D,
      loan24b: rules.allowsHomeLoanInterest24b,
      otherVIA: rules.allowsOtherChapterVIA,
    },
    warnings,
  };
}

/** Full CTC → take-home computation for a given regime. */
export function computeTakeHome(
  s: SalaryStructureInput,
  ctx: TaxContextInput,
  ctc?: number
): TakeHomeResult {
  const warnings: string[] = [];
  const grossSalary = grossSalaryOf(s);
  const build = buildTaxableIncome(s, ctx);
  warnings.push(...build.warnings);

  const taxResult = computeTax({
    taxableIncome: build.taxableIncome,
    regime: ctx.regime,
    fy: ctx.fy,
    age: ctx.age,
    isResident: ctx.isResident,
  });

  // Take-home = gross − (employee PF + professional tax + other deductions) − tax.
  const payrollDeductions = addMoney(s.employeePf, s.professionalTax, s.otherDeductions);
  const annualTakeHome = Math.max(
    0,
    subMoney(subMoney(grossSalary, payrollDeductions), taxResult.totalTax)
  );
  const monthlyTakeHome = divMoney(annualTakeHome, 12);

  const employerContributions = addMoney(s.employerPf, s.gratuityInCtc);
  const totalCtc = ctc ?? addMoney(grossSalary, employerContributions);
  const retainedOutsideTakeHome = employerContributions;

  const waterfall: TakeHomeResult["waterfall"] = [
    { label: "Annual CTC", value: totalCtc, kind: "start" },
    { label: "Employer PF", value: -s.employerPf, kind: "deduction" },
    { label: "Gratuity accrual", value: -s.gratuityInCtc, kind: "deduction" },
    { label: "Gross salary", value: grossSalary, kind: "end" },
    { label: "Employee PF", value: -s.employeePf, kind: "deduction" },
    { label: "Professional tax", value: -s.professionalTax, kind: "deduction" },
    { label: "Other deductions", value: -s.otherDeductions, kind: "deduction" },
    { label: "Income tax", value: -taxResult.totalTax, kind: "deduction" },
    { label: "Take-home pay", value: annualTakeHome, kind: "end" },
  ];

  // Sanity: CTC must equal gross + employer contributions; a mismatch means
  // the user's structure is internally inconsistent.
  if (toPaise(totalCtc) !== toPaise(addMoney(grossSalary, employerContributions))) {
    warnings.push(
      `Salary components (₹${Math.round(addMoney(grossSalary, employerContributions)).toLocaleString("en-IN")}) do not add up to the stated CTC (₹${Math.round(totalCtc).toLocaleString("en-IN")}). Check the structure.`
    );
  }

  return {
    ctc: totalCtc,
    grossSalary,
    employerContributions,
    employeePf: s.employeePf,
    professionalTax: s.professionalTax,
    otherDeductions: s.otherDeductions,
    incomeTax: taxResult.totalTax,
    taxResult,
    taxableIncome: build.taxableIncome,
    annualTakeHome,
    monthlyTakeHome,
    waterfall,
    retainedOutsideTakeHome,
    warnings,
    taxableBuild: build,
  };
}

/** Clamp professional tax to the constitutional ceiling of ₹2,500/year. */
export function clampProfessionalTax(annualPt: number): number {
  return clamp(annualPt, 0, 2_500);
}

/**
 * Attribute tax to non-salary income by difference:
 * tax(salary + other) − tax(salary alone). The difference is the amount of
 * total tax caused by the other income — used so "net income" for the budget
 * is honest when other income exists.
 */
export function splitTaxByOtherIncome(
  build: TaxableIncomeBuild,
  ctx: TaxContextInput
): { totalTax: number; taxOnSalaryOnly: number; taxOnOtherIncome: number } {
  const base: TaxInput = {
    taxableIncome: build.taxableIncome,
    regime: ctx.regime,
    fy: ctx.fy,
    age: ctx.age,
    isResident: ctx.isResident,
  };
  const totalTax = computeTax(base).totalTax;
  const taxOnSalaryOnly = computeTax({
    ...base,
    taxableIncome: Math.max(0, build.taxableIncome - build.otherIncome),
  }).totalTax;
  return {
    totalTax,
    taxOnSalaryOnly,
    taxOnOtherIncome: Math.max(0, totalTax - taxOnSalaryOnly),
  };
}
