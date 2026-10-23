import { describe, expect, it } from "vitest";
import { buildAmortization, compareLoans, computeEmi, prepaymentEffect } from "../loans";

describe("EMI", () => {
  it("matches the standard formula", () => {
    // P = 10,00,000, 9% for 20y: r = 0.0075, n = 240
    // (1.0075)^240 = 6.0089; EMI = 1000000 × 0.0075 × 6.0089 / 5.0089 ≈ 8,997
    const emi = computeEmi({ principal: 1_000_000, annualRate: 0.09, tenureMonths: 240 });
    expect(emi).toBeGreaterThan(8_990);
    expect(emi).toBeLessThan(9_010);
    expect(emi).toBeCloseTo(8_997.26, 0);
  });

  it("zero-interest loan: EMI = P / n (no division by zero)", () => {
    expect(computeEmi({ principal: 120_000, annualRate: 0, tenureMonths: 12 })).toBe(10_000);
  });

  it("zero tenure returns 0", () => {
    expect(computeEmi({ principal: 100_000, annualRate: 0.1, tenureMonths: 0 })).toBe(0);
  });
});

describe("amortization", () => {
  it("clears the loan exactly at the last EMI", () => {
    const res = buildAmortization({ principal: 5_000_000, annualRate: 0.085, tenureMonths: 240 });
    expect(res.schedule).toHaveLength(240);
    expect(res.schedule.at(-1)!.closing).toBeCloseTo(0, 4);
    expect(res.totalRepayment).toBeCloseTo(res.emi * 240, 1);
    expect(res.totalInterest).toBeCloseTo(res.totalRepayment - 5_000_000, 1);
  });

  it("zero-interest schedule: total interest is zero", () => {
    const res = buildAmortization({ principal: 120_000, annualRate: 0, tenureMonths: 12 });
    expect(res.totalInterest).toBeCloseTo(0, 6);
    expect(res.totalRepayment).toBe(120_000);
    expect(res.emi).toBe(10_000);
  });

  it("first month's interest equals P × r", () => {
    const res = buildAmortization({ principal: 1_000_000, annualRate: 0.12, tenureMonths: 60 });
    expect(res.schedule[0].interest).toBeCloseTo(10_000, 4);
    expect(res.schedule[0].principal).toBeCloseTo(res.emi - 10_000, 4);
  });

  it("aggregates yearly buckets that reconcile with the schedule", () => {
    const res = buildAmortization({ principal: 3_000_000, annualRate: 0.09, tenureMonths: 120 });
    const sumInterest = res.yearly.reduce((s, y) => s + y.interest, 0);
    expect(sumInterest).toBeCloseTo(res.totalInterest, 4);
    expect(res.yearly.at(-1)!.balance).toBeCloseTo(0, 4);
  });

  it("interest always declines as principal grows (front-loaded interest)", () => {
    const res = buildAmortization({ principal: 1_000_000, annualRate: 0.1, tenureMonths: 120 });
    expect(res.schedule[0].interest).toBeGreaterThan(res.schedule[100].interest);
    expect(res.schedule[100].principal).toBeGreaterThan(res.schedule[0].principal);
  });
});

describe("prepayment", () => {
  it("strategy 'tenure' shortens the loan and saves interest", () => {
    const input = {
      principal: 5_000_000,
      annualRate: 0.085,
      tenureMonths: 240,
      afterMonth: 24,
      extraPrincipal: 500_000,
      strategy: "tenure" as const,
    };
    const base = buildAmortization(input);
    const pre = prepaymentEffect(input);
    expect(pre.monthsSaved).toBeGreaterThan(0);
    expect(pre.interestSaved).toBeGreaterThan(0);
    expect(pre.interestSaved).toBeLessThan(base.totalInterest);
    expect(pre.newEmi).toBe(base.emi); // EMI unchanged
  });

  it("strategy 'emi' reduces EMI, keeps tenure", () => {
    const input = {
      principal: 5_000_000,
      annualRate: 0.085,
      tenureMonths: 240,
      afterMonth: 24,
      extraPrincipal: 500_000,
      strategy: "emi" as const,
    };
    const base = buildAmortization(input);
    const pre = prepaymentEffect(input);
    expect(pre.newEmi).toBeLessThan(base.emi);
    expect(pre.monthsSaved).toBe(0);
    expect(pre.interestSaved).toBeGreaterThan(0);
    expect(pre.remainingMonths).toBe(216);
  });

  it("no extra principal → no saving", () => {
    const pre = prepaymentEffect({
      principal: 1_000_000,
      annualRate: 0.09,
      tenureMonths: 60,
      afterMonth: 12,
      extraPrincipal: 0,
      strategy: "tenure",
    });
    expect(pre.interestSaved).toBeCloseTo(0, 6);
    expect(pre.monthsSaved).toBe(0);
  });
});

describe("loan comparison", () => {
  it("crosses rates × tenures and higher rate costs more interest", () => {
    const rows = compareLoans(1_000_000, [0.08, 0.1], [5, 10]);
    expect(rows).toHaveLength(4);
    const cheap = rows.find((r) => r.rate === 0.08 && r.years === 10)!;
    const costly = rows.find((r) => r.rate === 0.1 && r.years === 10)!;
    expect(costly.emi).toBeGreaterThan(cheap.emi);
    expect(costly.totalInterest).toBeGreaterThan(cheap.totalInterest);
    // Longer tenure at same rate: lower EMI, more total interest
    const short5 = rows.find((r) => r.rate === 0.08 && r.years === 5)!;
    expect(short5.emi).toBeGreaterThan(cheap.emi);
    expect(short5.totalInterest).toBeLessThan(cheap.totalInterest);
  });
});
