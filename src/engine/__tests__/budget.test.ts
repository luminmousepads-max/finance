import { describe, expect, it } from "vitest";
import { computeBudget } from "../budget";

describe("budget engine", () => {
  const income = 100_000;
  const inputs = {
    housing: 30_000,
    groceries: 12_000,
    utilities: 4_000,
    transport: 6_000,
    entertainment: 5_000,
    loanEmis: 15_000,
    savings: 10_000,
    investments: 8_000,
  };

  it("computes surplus and savings rate", () => {
    const r = computeBudget(income, inputs);
    // expenses (non-savings): 30+12+4+6+5+15 = 72,000; savings+invest = 18,000
    expect(r.totalExpenses).toBe(72_000);
    expect(r.savingsAndInvestments).toBe(18_000);
    expect(r.surplus).toBe(100_000 - 72_000 - 18_000); // 10,000
    expect(r.savingsRate).toBe(18);
    expect(r.warnings).toHaveLength(0);
  });

  it("category percentages of income sum correctly", () => {
    const r = computeBudget(income, inputs);
    const sum = r.categories.reduce((s, c) => s + c.pctOfIncome, 0);
    expect(sum).toBeCloseTo(90, 5); // 90% allocated, 10% unallocated surplus
    expect(r.categories.find((c) => c.key === "housing")!.pctOfIncome).toBe(30);
  });

  it("warns when planned expenses exceed income", () => {
    const r = computeBudget(income, { ...inputs, housing: 60_000, entertainment: 30_000 });
    expect(r.surplus).toBeLessThan(0);
    expect(r.warnings.some((w) => w.includes("exceed"))).toBe(true);
  });

  it("offers 50/30/20 only as reference figures", () => {
    const r = computeBudget(income, inputs);
    expect(r.fiftyThirtyTwenty).toEqual({ needs: 50_000, wants: 30_000, savings: 20_000 });
  });

  it("buckets split needs/wants/savings by category kind", () => {
    const r = computeBudget(income, inputs);
    expect(r.buckets.need).toBe(30_000 + 12_000 + 4_000 + 6_000 + 15_000);
    expect(r.buckets.want).toBe(5_000);
    expect(r.buckets.savings).toBe(18_000);
    expect(r.bucketPct.need).toBe(67);
  });

  it("zero income warns and does not divide by zero", () => {
    const r = computeBudget(0, inputs);
    expect(r.surplus).toBeLessThan(0);
    expect(r.warnings.some((w) => w.includes("not set"))).toBe(true);
    expect(r.categories.every((c) => c.pctOfIncome === 0)).toBe(true);
  });

  it("empty budget gives zero everything", () => {
    const r = computeBudget(income, {});
    expect(r.totalExpenses).toBe(0);
    expect(r.surplus).toBe(income);
    expect(r.savingsRate).toBe(0);
  });
});
