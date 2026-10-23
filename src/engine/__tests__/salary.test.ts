import { describe, expect, it } from "vitest";
import {
  buildTaxableIncome,
  computeHraExemption,
  computeTakeHome,
  estimateStructureFromCtc,
  grossSalaryOf,
  CTC_ESTIMATE_ASSUMPTIONS,
} from "../salary";

const ctx = (regime: "new" | "old" = "new" as const) => ({
  regime,
  fy: "FY 2025-26" as const,
  age: 30,
});

describe("CTC estimation (disclosed assumptions)", () => {
  it("derives components that sum back to CTC exactly", () => {
    const s = estimateStructureFromCtc({
      ctc: 1_200_000,
      cityCategory: "nonMetro",
      employerPfInCtc: true,
      gratuityInCtc: true,
      monthlyProfessionalTax: 200,
    });
    const A = CTC_ESTIMATE_ASSUMPTIONS;
    expect(s.basic).toBe(1_200_000 * A.basicShareOfCtc); // 4.8L
    expect(s.employerPf).toBeCloseTo(s.basic * 0.12, 2);
    // gross + employer PF + gratuity = CTC
    expect(grossSalaryOf(s) + s.employerPf + s.gratuityInCtc).toBeCloseTo(1_200_000, 2);
    expect(s.professionalTax).toBe(2_400);
  });

  it("handles small LPA values (4.5 LPA) without negative allowance", () => {
    const s = estimateStructureFromCtc({
      ctc: 450_000,
      cityCategory: "metro",
      employerPfInCtc: true,
      gratuityInCtc: true,
      monthlyProfessionalTax: 200,
    });
    expect(s.specialAllowance).toBeGreaterThanOrEqual(0);
    expect(grossSalaryOf(s)).toBeGreaterThan(0);
  });
});

describe("HRA exemption (Sec 10(13A))", () => {
  it("is the lowest of the three limbs", () => {
    // Basic 60k/mo = 7.2L/yr, HRA received 30k/mo = 3.6L, rent 24k/mo = 2.88L
    // limbs: actual 3.6L; rent − 10% salary = 2.88L − 72k = 2.16L; 40% of 7.2L = 2.88L (non-metro)
    const e = computeHraExemption({
      annualHraReceived: 360_000,
      annualRentPaid: 288_000,
      cityCategory: "nonMetro",
      salaryForHra: 720_000,
    });
    expect(e).toBe(216_000);
  });

  it("uses 50% limb in metro cities", () => {
    // same as above but metro → 50% = 3.6L, so rent limb 2.16L still lowest
    const metro = computeHraExemption({
      annualHraReceived: 360_000,
      annualRentPaid: 288_000,
      cityCategory: "metro",
      salaryForHra: 720_000,
    });
    expect(metro).toBe(216_000);
    // High rent → the 50% limb becomes binding
    const highRent = computeHraExemption({
      annualHraReceived: 600_000,
      annualRentPaid: 600_000,
      cityCategory: "metro",
      salaryForHra: 720_000,
    });
    expect(highRent).toBe(360_000); // 50% of 7.2L
  });

  it("returns 0 with no rent paid", () => {
    expect(
      computeHraExemption({
        annualHraReceived: 360_000,
        annualRentPaid: 0,
        cityCategory: "metro",
        salaryForHra: 720_000,
      })
    ).toBe(0);
  });
});

describe("taxable income build by regime", () => {
  const structure = {
    basic: 720_000,
    hra: 360_000,
    specialAllowance: 420_000,
    variablePay: 0,
    otherTaxableBenefits: 0,
    employerPf: 86_400,
    employeePf: 86_400,
    gratuityInCtc: 138_462,
    professionalTax: 2_400,
    otherDeductions: 0,
  };

  it("new regime: only standard deduction applies", () => {
    const b = buildTaxableIncome(structure, ctx("new"));
    expect(b.grossSalary).toBe(1_500_000);
    expect(b.standardDeduction).toBe(75_000);
    expect(b.hraExemption).toBe(0);
    expect(b.deductions80C).toBe(0);
    expect(b.taxableIncome).toBe(1_425_000);
    expect(b.warnings.some((w) => w.includes("HRA"))).toBe(false);
  });

  it("new regime warns when rent is declared (HRA not allowed)", () => {
    const b = buildTaxableIncome(structure, {
      ...ctx("new"),
      hra: {
        annualHraReceived: 360_000,
        annualRentPaid: 240_000,
        cityCategory: "nonMetro",
        salaryForHra: 720_000,
      },
      section80C: 150_000,
    });
    expect(b.warnings.some((w) => w.includes("not available under the new"))).toBe(true);
    expect(b.deductions80C).toBe(0);
  });

  it("old regime: SD + HRA + 80C capped at 1.5L", () => {
    const b = buildTaxableIncome(structure, {
      ...ctx("old"),
      section80C: 150_000,
      hra: {
        annualHraReceived: 360_000,
        annualRentPaid: 240_000,
        cityCategory: "nonMetro",
        salaryForHra: 720_000,
      },
    });
    expect(b.standardDeduction).toBe(50_000);
    expect(b.deductions80C).toBe(150_000);
    // rent − 10% salary = 2.4L − 72k = 1.68L; 40% salary = 2.88L; actual 3.6L → 1.68L
    expect(b.hraExemption).toBe(168_000);
    expect(b.taxableIncome).toBe(1_500_000 - 50_000 - 168_000 - 150_000);
  });

  it("old regime caps 80C at ₹1,50,000 with a warning", () => {
    const b = buildTaxableIncome(structure, { ...ctx("old"), section80C: 300_000 });
    expect(b.deductions80C).toBe(150_000);
    expect(b.warnings.some((w) => w.includes("capped"))).toBe(true);
  });
});

describe("take-home waterfall", () => {
  it("never subtracts employer PF twice: CTC − employer = gross, take-home from gross", () => {
    const s = estimateStructureFromCtc({
      ctc: 1_200_000,
      cityCategory: "nonMetro",
      employerPfInCtc: true,
      gratuityInCtc: true,
      monthlyProfessionalTax: 200,
    });
    const res = computeTakeHome(s, ctx("new"), 1_200_000);

    expect(res.grossSalary + res.employerContributions).toBeCloseTo(1_200_000, 1);
    expect(res.annualTakeHome).toBeCloseTo(
      res.grossSalary - res.employeePf - res.professionalTax - res.incomeTax,
      1
    );
    // monthly = annual/12 rounded to paisa → ×12 drifts by ≤6 paisa.
    expect(res.monthlyTakeHome * 12).toBeCloseTo(res.annualTakeHome, 0);

    // Waterfall endpoints are consistent.
    expect(res.waterfall[0].value).toBe(1_200_000);
    expect(res.waterfall.at(-1)!.value).toBeCloseTo(res.annualTakeHome, 5);
  });

  it("tax on a ₹12.75L gross salary (new regime) is nil for FY 2025-26", () => {
    // ctc = gross + employer + gratuity → pick gross of 12,75,000 directly
    const s = {
      basic: 510_000,
      hra: 255_000,
      specialAllowance: 510_000,
      variablePay: 0,
      otherTaxableBenefits: 0,
      employerPf: 61_200,
      employeePf: 61_200,
      gratuityInCtc: 0,
      professionalTax: 2_400,
      otherDeductions: 0,
    };
    const res = computeTakeHome(s, ctx("new"));
    expect(res.grossSalary).toBe(1_275_000);
    expect(res.taxableBuild.taxableIncome).toBe(1_200_000);
    expect(res.incomeTax).toBe(0);
    expect(res.annualTakeHome).toBe(1_275_000 - 61_200 - 2_400);
  });

  it("flags structure/CTC mismatch as a warning", () => {
    const s = estimateStructureFromCtc({
      ctc: 1_200_000,
      cityCategory: "nonMetro",
      employerPfInCtc: true,
      gratuityInCtc: false,
      monthlyProfessionalTax: 200,
    });
    const res = computeTakeHome(s, ctx("new"), 1_500_000); // wrong CTC
    expect(res.warnings.some((w) => w.includes("do not add up"))).toBe(true);
  });
});
