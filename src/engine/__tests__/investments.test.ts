import { describe, expect, it } from "vitest";
import {
  buildProjection,
  lumpSumFutureValue,
  realReturn,
  requiredMonthlyInvestment,
  sipFutureValue,
  stepUpSipFutureValue,
} from "../investments";

describe("SIP future value (ordinary annuity)", () => {
  it("matches the hand-verified annuity formula", () => {
    // ₹10,000/mo at 12% p.a. (r = 1%) for 10y (n = 120):
    // FV = 10000 × ((1.01^120 − 1)/0.01) = 10000 × 230.038689… = 23,00,386.90
    const out = sipFutureValue({ monthlyAmount: 10_000, annualRate: 0.12, years: 10 });
    expect(out.invested).toBe(1_200_000);
    expect(out.futureValue).toBeCloseTo(2_300_386.9, 0);
    expect(out.gain).toBeCloseTo(1_100_386.9, 0);
  });

  it("zero rate degenerates to P × n", () => {
    const out = sipFutureValue({ monthlyAmount: 5_000, annualRate: 0, years: 3 });
    expect(out.futureValue).toBe(5_000 * 36);
    expect(out.gain).toBe(0);
  });

  it("annuity-due is exactly (1 + r) times the ordinary annuity", () => {
    const end = sipFutureValue({ monthlyAmount: 10_000, annualRate: 0.12, years: 5 });
    const begin = sipFutureValue({
      monthlyAmount: 10_000,
      annualRate: 0.12,
      years: 5,
      beginningOfMonth: true,
    });
    expect(begin.futureValue).toBeCloseTo(end.futureValue * 1.01, 6);
  });

  it("zero-year SIP returns zero", () => {
    const out = sipFutureValue({ monthlyAmount: 10_000, annualRate: 0.12, years: 0 });
    expect(out.futureValue).toBe(0);
    expect(out.invested).toBe(0);
  });
});

describe("step-up SIP", () => {
  it("no step-up equals a plain SIP", () => {
    const step0 = stepUpSipFutureValue({
      monthlyAmount: 10_000,
      annualRate: 0.1,
      years: 6,
      annualStepUp: 0,
    });
    const plain = sipFutureValue({ monthlyAmount: 10_000, annualRate: 0.1, years: 6 });
    expect(step0.futureValue).toBeCloseTo(plain.futureValue, 6);
    expect(step0.invested).toBeCloseTo(plain.invested, 6);
  });

  it("10% annual step-up increases both invested and FV", () => {
    const step = stepUpSipFutureValue({
      monthlyAmount: 10_000,
      annualRate: 0.1,
      years: 10,
      annualStepUp: 0.1,
    });
    const plain = sipFutureValue({ monthlyAmount: 10_000, annualRate: 0.1, years: 10 });
    expect(step.invested).toBeGreaterThan(plain.invested);
    expect(step.futureValue).toBeGreaterThan(plain.futureValue);
    // Invested: 12 × 10k × (1.1^10 − 1)/0.1 ≈ 19,71,000 — grows by block.
    expect(step.invested).toBeCloseTo(
      120_000 * ((Math.pow(1.1, 10) - 1) / 0.1),
      4
    );
  });

  it("compounds each year-block for the remaining term only", () => {
    // 2-year, 10% step-up: year 1 pays 12×10k; year 2 pays 12×11k for 12 months.
    const out = stepUpSipFutureValue({
      monthlyAmount: 10_000,
      annualRate: 0.12,
      years: 2,
      annualStepUp: 0.1,
    });
    expect(out.invested).toBeCloseTo(120_000 + 132_000, 6);
    const r = 0.01;
    // year-1 block: FV of 12 end-of-month payments at month 12, compounded 12 more months
    const y1At12 = 10_000 * ((Math.pow(1 + r, 12) - 1) / r);
    const y2At24 = 11_000 * ((Math.pow(1 + r, 12) - 1) / r);
    expect(out.futureValue).toBeCloseTo(y1At12 * (1 + r) ** 12 + y2At24, 4);
  });
});

describe("lump sum", () => {
  it("FV = PV × (1 + i)^n", () => {
    // 1,00,000 at 12% for 10y = 1,00,000 × 3.105848 = 3,10,584.82
    const out = lumpSumFutureValue({ principal: 100_000, annualRate: 0.12, years: 10 });
    expect(out.futureValue).toBeCloseTo(310_584.82, 2);
    expect(out.gain).toBeCloseTo(210_584.82, 2);
  });

  it("zero rate leaves principal untouched", () => {
    const out = lumpSumFutureValue({ principal: 50_000, annualRate: 0, years: 7 });
    expect(out.futureValue).toBe(50_000);
    expect(out.gain).toBe(0);
  });
});

describe("real vs nominal returns", () => {
  it("real = (1 + nominal)/(1 + inflation) − 1", () => {
    expect(realReturn(0.12, 0.06)).toBeCloseTo((1.12 / 1.06) - 1, 10);
    expect(realReturn(0.12, 0.06)).toBeCloseTo(0.0566, 4);
  });

  it("zero inflation → real equals nominal", () => {
    expect(realReturn(0.1, 0)).toBeCloseTo(0.1, 10);
  });

  it("negative inflation handled without division blowup", () => {
    expect(realReturn(0.1, -1.5)).toBe(0.1); // guard: inflation ≤ −1
  });
});

describe("required monthly investment", () => {
  it("inverts the SIP formula", () => {
    // Target 50L in 10y at 12% from zero: P = 50L / 230.0387 = 21,735/mo
    const p = requiredMonthlyInvestment(5_000_000, 0, 0.12, 10);
    expect(p).toBeCloseTo(21_735.47, 1);
    // Feeding it back reproduces the target.
    expect(sipFutureValue({ monthlyAmount: p, annualRate: 0.12, years: 10 }).futureValue)
      .toBeCloseTo(5_000_000, 0);
  });

  it("returns 0 when existing corpus already exceeds the target", () => {
    expect(requiredMonthlyInvestment(1_000_000, 2_000_000, 0.1, 5)).toBe(0);
  });

  it("zero-rate path divides evenly", () => {
    const p = requiredMonthlyInvestment(120_000, 0, 0, 1);
    expect(p).toBeCloseTo(10_000, 6);
  });
});

describe("projection path", () => {
  it("builds one point per year with monotonic growth", () => {
    const pts = buildProjection({ monthlyAmount: 10_000, annualRate: 0.12, years: 5 });
    expect(pts).toHaveLength(5);
    expect(pts.at(-1)!.year).toBe(5);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].futureValue).toBeGreaterThan(pts[i - 1].futureValue);
    }
  });
});
