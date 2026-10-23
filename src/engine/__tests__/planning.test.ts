import { describe, expect, it } from "vitest";
import { computeEmergencyFund, reviewInsurance } from "../emergency";
import {
  computeRetirement,
  futureValueOfContributions,
  futureValueOfCorpus,
  requiredCorpus,
  requiredMonthlyForGap,
  retirementProjectionPath,
} from "../retirement";
import { computeGoal, computeGoalsAggregate } from "../goals";
import {
  absoluteReturnPct,
  annualisedReturnPct,
  computePortfolio,
} from "../portfolio";

describe("emergency fund", () => {
  it("target = essential monthly expenses × target months", () => {
    const r = computeEmergencyFund({
      essentialMonthlyExpenses: 40_000,
      targetMonths: 6,
      currentEmergencySavings: 100_000,
    });
    expect(r.target).toBe(240_000);
    expect(r.remaining).toBe(140_000);
    expect(r.monthsCovered).toBe(2.5);
    expect(r.progressPct).toBeCloseTo(41.666, 2);
  });

  it("zero essential expenses does not divide by zero", () => {
    const r = computeEmergencyFund({
      essentialMonthlyExpenses: 0,
      targetMonths: 6,
      currentEmergencySavings: 50_000,
    });
    expect(r.target).toBe(0);
    expect(r.monthsCovered).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("warns for targets under 3 months without blocking", () => {
    const r = computeEmergencyFund({
      essentialMonthlyExpenses: 30_000,
      targetMonths: 2,
      currentEmergencySavings: 0,
    });
    expect(r.warnings.some((w) => w.includes("3 months"))).toBe(true);
  });

  it("reports fully funded state", () => {
    const r = computeEmergencyFund({
      essentialMonthlyExpenses: 30_000,
      targetMonths: 6,
      currentEmergencySavings: 200_000,
    });
    expect(r.remaining).toBe(0);
    expect(r.progressPct).toBeGreaterThan(100);
  });
});

describe("insurance review (no invented requirements)", () => {
  it("flags missing cover as review items, never an exact requirement", () => {
    const r = reviewInsurance({
      health: { label: "Health", annualPremium: 12_000, coverAmount: 0 },
      termLife: { label: "Term", annualPremium: 0, coverAmount: 0 },
      other: [],
      annualOutstandingLoans: 30_000_00,
      annualFamilyExpense: 600_000,
      incomeEarners: 1,
    });
    expect(r.gaps.length).toBeGreaterThan(0);
    expect(r.totalAnnualPremium).toBe(12_000);
    expect(r.loanCoverReference).toBe(3_000_000); // matches ₹30,00,000 as entered
  });

  it("sums premiums across policies", () => {
    const r = reviewInsurance({
      health: { label: "h", annualPremium: 12_000, coverAmount: 500_000 },
      termLife: { label: "t", annualPremium: 9_000, coverAmount: 1_000_000 },
      other: [{ label: "o", annualPremium: 3_000, coverAmount: 200_000 }],
      annualOutstandingLoans: 0,
      annualFamilyExpense: 0,
      incomeEarners: 2,
    });
    expect(r.totalAnnualPremium).toBe(24_000);
    expect(r.gaps).toHaveLength(0);
  });
});

describe("retirement planner", () => {
  const input = {
    currentAge: 30,
    retirementAge: 60,
    retirementDurationYears: 25,
    currentCorpus: 1_000_000,
    monthlyContribution: 25_000,
    expectedReturn: 0.11,
    postRetirementReturn: 0.07,
    inflation: 0.06,
    annualSpendingToday: 900_000,
  };

  it("projects corpus = FV(existing) + FV(contributions)", () => {
    const r = computeRetirement(input);
    expect(r.yearsToRetirement).toBe(30);
    expect(r.corpusFromExisting).toBeCloseTo(
      futureValueOfCorpus(1_000_000, 0.11, 30),
      4
    );
    expect(r.corpusFromContributions).toBeCloseTo(
      futureValueOfContributions(25_000, 0.11, 30),
      4
    );
    // addMoney() rounds each part to paisa before summing (≤1 paisa drift).
    expect(r.projectedCorpus).toBeCloseTo(r.corpusFromExisting + r.corpusFromContributions, 1);
    expect(r.projectedCorpus).toBeGreaterThan(50_000_000);
  });

  it("inflation-adjusts the corpus to today's rupees", () => {
    const r = computeRetirement(input);
    expect(r.projectedCorpusReal).toBeCloseTo(
      r.projectedCorpus / Math.pow(1.06, 30),
      4
    );
    expect(r.projectedCorpusReal).toBeLessThan(r.projectedCorpus);
  });

  it("computes required corpus as growing-annuity PV", () => {
    const r = computeRetirement(input);
    const firstYear = 900_000 * Math.pow(1.06, 30);
    expect(r.futureAnnualSpending).toBeCloseTo(firstYear, 4);
    expect(r.requiredCorpus).toBeCloseTo(
      requiredCorpus(firstYear, 0.07, 0.06, 25),
      4
    );
    expect(r.corpusYears).toBeCloseTo(r.requiredCorpus / firstYear, 4);
    expect(r.firstYearWithdrawalRate).toBeCloseTo(
      (firstYear / r.requiredCorpus) * 100,
      6
    );
  });

  it("handles equal return and inflation (R = g branch)", () => {
    // E × N / (1 + R) — must not divide by (R − g) = 0
    expect(requiredCorpus(100_000, 0.06, 0.06, 20)).toBeCloseTo(
      (100_000 * 20) / 1.06,
      6
    );
  });

  it("warns on a shortfall, stays silent when funded", () => {
    const shortfall = computeRetirement(input);
    if (shortfall.gap > 0) {
      expect(shortfall.warnings.some((w) => w.includes("falls short"))).toBe(true);
    }
    const comfortable = computeRetirement({
      ...input,
      currentCorpus: 50_000_000,
      monthlyContribution: 100_000,
      retirementDurationYears: 10,
    });
    if (comfortable.gap <= 0) {
      expect(comfortable.warnings.some((w) => w.includes("falls short"))).toBe(false);
    }
  });

  it("warns when retirement age is not in the future", () => {
    const r = computeRetirement({ ...input, currentAge: 60, retirementAge: 55 });
    expect(r.warnings.some((w) => w.includes("above your current age"))).toBe(true);
  });

  it("projection path starts at current corpus and ends at projected", () => {
    const r = computeRetirement(input);
    const path = retirementProjectionPath(input);
    expect(path).toHaveLength(31);
    expect(path[0].corpus).toBeCloseTo(1_000_000, 6);
    expect(path.at(-1)!.corpus).toBeCloseTo(r.projectedCorpus, 1);
  });

  it("required monthly for the gap is finite and positive", () => {
    const p = requiredMonthlyForGap(1_000_000, 0.1, 10);
    expect(p).toBeGreaterThan(0);
    expect(Number.isFinite(p)).toBe(true);
    expect(requiredMonthlyForGap(0, 0.1, 10)).toBe(0);
    expect(requiredMonthlyForGap(1_000_000, 0.1, 0)).toBe(0);
  });
});

describe("financial goals", () => {
  const goal = {
    id: "g1",
    name: "Home down payment",
    kind: "home" as const,
    targetAmount: 2_000_000,
    years: 5,
    currentSavings: 300_000,
    expectedReturn: 0.1,
  };

  it("required monthly funds the shortfall after compounding current savings", () => {
    const r = computeGoal(goal);
    const savingsFv = 300_000 * Math.pow(1.1, 5);
    expect(r.savingsFv).toBeCloseTo(savingsFv, 6);
    expect(r.shortfall).toBeCloseTo(2_000_000 - savingsFv, 6);
    expect(r.requiredMonthly).toBeGreaterThan(0);
    // Round-trip: annuity of requiredMonthly for 5y at 10% ≈ shortfall
    const n = 60;
    const rr = 0.1 / 12;
    const fv = r.requiredMonthly * ((Math.pow(1 + rr, n) - 1) / rr);
    expect(fv).toBeCloseTo(r.shortfall, 4);
  });

  it("zero rate → shortfall / n", () => {
    const r = computeGoal({ ...goal, expectedReturn: 0, currentSavings: 0 });
    expect(r.requiredMonthly).toBeCloseTo(2_000_000 / 60, 6);
  });

  it("marks a goal already funded when savings exceed target", () => {
    const r = computeGoal({ ...goal, currentSavings: 3_000_000 });
    expect(r.alreadyFunded).toBe(true);
    expect(r.shortfall).toBe(0);
    expect(r.requiredMonthly).toBe(0);
  });

  it("aggregates goals and warns when they exceed surplus", () => {
    const goals = [
      goal,
      { ...goal, id: "g2", name: "Car", kind: "car" as const, targetAmount: 1_500_000 },
    ];
    const agg = computeGoalsAggregate(goals, 10_000);
    expect(agg.results).toHaveLength(2);
    expect(agg.totalRequiredMonthly).toBeGreaterThan(10_000);
    expect(agg.remainingSurplus).toBeLessThan(0);
    expect(agg.warnings.some((w) => w.includes("exceed"))).toBe(true);
    expect(agg.utilisationPct).toBeGreaterThan(100);
  });

  it("fits comfortably when surplus is ample", () => {
    const agg = computeGoalsAggregate([goal], 100_000);
    expect(agg.remainingSurplus).toBeGreaterThan(0);
    expect(agg.warnings).toHaveLength(0);
  });

  it("negative surplus warns", () => {
    const agg = computeGoalsAggregate([goal], -5_000);
    expect(agg.warnings.some((w) => w.includes("negative"))).toBe(true);
  });
});

describe("portfolio tracker", () => {
  const now = new Date("2026-10-23T00:00:00Z");
  const entries = [
    {
      id: "a1",
      name: "Nifty 50 Index Fund",
      category: "indexFund" as const,
      invested: 500_000,
      currentValue: 650_000,
      purchaseDate: "2022-10-23",
      expectedReturn: 0.12,
      valuationSource: "manual" as const,
    },
    {
      id: "a2",
      name: "PPF",
      category: "ppf" as const,
      invested: 300_000,
      currentValue: 340_000,
      purchaseDate: "2023-10-23",
      expectedReturn: 0.071,
      valuationSource: "manual" as const,
    },
    {
      id: "a3",
      name: "Gold",
      category: "gold" as const,
      invested: 200_000,
      currentValue: 180_000,
      valuationSource: "manual" as const,
    },
  ];

  it("absolute return = ((current − invested) / invested) × 100", () => {
    expect(absoluteReturnPct(100_000, 120_000)).toBe(20);
    expect(absoluteReturnPct(0, 10)).toBe(0);
    expect(absoluteReturnPct(100_000, 80_000)).toBe(-20);
  });

  it("annualised return uses CAGR over days held", () => {
    // Doubling in ~365 days → ~100%
    expect(annualisedReturnPct(100_000, 200_000, 365)).toBeCloseTo(100, 6);
    expect(annualisedReturnPct(100_000, 100_000, 365)).toBeCloseTo(0, 6);
    expect(annualisedReturnPct(0, 10, 365)).toBeNull();
    expect(annualisedReturnPct(10, 20, 0)).toBeNull();
  });

  it("sums values and computes gain, allocation, concentration", () => {
    const r = computePortfolio(entries, now);
    expect(r.totalInvested).toBe(1_000_000);
    expect(r.totalValue).toBe(1_170_000);
    expect(r.totalGain).toBe(170_000);
    expect(r.totalGainPct).toBe(17);
    // Allocation on current value sums to 100
    expect(r.allocation.reduce((s, a) => s + a.pct, 0)).toBeCloseTo(100, 6);
    // Largest position is the index fund at 650k
    expect(r.topHoldingName).toBe("Nifty 50 Index Fund");
    expect(r.topHoldingPct).toBeCloseTo((650_000 / 1_170_000) * 100, 6);
    // HHI: sum of squared % shares
    expect(r.concentrationHhi).toBeGreaterThan(0);
  });

  it("distinguishes absolute from annualised", () => {
    const r = computePortfolio(entries, now);
    expect(r.annualisedPct).not.toBeNull();
    // Portfolio absolute is 17%; annualised differs (weighted CAGR)
    expect(r.annualisedPct).not.toBeCloseTo(17, 3);
    const noDates = computePortfolio(
      entries.map((e) => ({ ...e, purchaseDate: undefined })),
      now
    );
    expect(noDates.annualisedPct).toBeNull();
    expect(noDates.totalGainPct).toBe(17); // absolute still available
  });

  it("weighted expected return uses invested weights of user assumptions", () => {
    const r = computePortfolio(entries, now);
    // weights: 0.5, 0.3, 0.2 → but gold has no assumption → renormalise over 0.8
    expect(r.weightedExpectedReturn).toBeCloseTo((0.5 * 0.12 + 0.3 * 0.071) / 0.8, 6);
  });

  it("labels all-manual valuations as such (no live data claim)", () => {
    const r = computePortfolio(entries, now);
    expect(r.hasLivePrices).toBe(false);
    expect(r.warnings.some((w) => w.includes("manually entered"))).toBe(true);
  });
});
