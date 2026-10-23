import { describe, expect, it } from "vitest";
import {
  computeTax,
  getTaxYearConfig,
  monthlyTds,
  slabTax,
  SUPPORTED_FY,
} from "../tax-engine";

/**
 * Verified examples.
 *
 * FY 2025-26 (AY 2026-27) figures cross-checked against the Income Tax
 * Department AY 2026-27 guide (incometax.gov.in/iec/foportal/help/
 * individual/return-applicable-1) and KPMG's Budget 2025-26 summary —
 * see the `sources` field of each tax-year config.
 *
 * FY 2024-25: Finance Act 2024 slabs (3/7/10/12/15L), SD ₹75,000,
 * 87A ₹25,000 up to ₹7L.
 */

describe("slab tax", () => {
  const slabs = getTaxYearConfig("FY 2025-26").newRegime.slabs.below60;

  it("computes progressive tax across slabs", () => {
    // ₹10,00,000 → 0–4L nil, 4–8L @5% = 20,000, 8–10L @10% = 20,000
    expect(slabTax(1_000_000, slabs).total).toBe(40_000);
  });

  it("top slab has no upper bound", () => {
    // ₹50,00,000 → previous bands: 20k+40k+60k+80k+100k = 3,00,000; 26L @30% = 7,80,000
    expect(slabTax(5_000_000, slabs).total).toBe(10_80_000);
  });

  it("returns zero for nil-rate income", () => {
    expect(slabTax(400_000, slabs).total).toBe(0);
    expect(slabTax(0, slabs).total).toBe(0);
  });
});

describe("FY 2025-26 new regime", () => {
  it("nil tax up to ₹12,00,000 taxable income (87A rebate ₹60,000)", () => {
    const res = computeTax({ taxableIncome: 1_200_000, regime: "new", fy: "FY 2025-26", age: 30 });
    expect(res.slabTax).toBe(60_000);
    expect(res.rebate87A).toBe(60_000);
    expect(res.totalTax).toBe(0);
    expect(res.cess).toBe(0);
  });

  it("salaried nil tax up to ₹12,75,000 gross (after ₹75,000 SD)", () => {
    const res = computeTax({
      taxableIncome: 1_275_000 - 75_000,
      regime: "new",
      fy: "FY 2025-26",
      age: 30,
    });
    expect(res.totalTax).toBe(0);
  });

  it("applies marginal relief just above ₹12,00,000", () => {
    // ₹12,10,000: 0–4L nil, 4–8L @5 = 20,000, 8–12L @10 = 40,000,
    // 12–12.1L @15 = 1,500 → slab tax 61,500. Excess over the threshold is
    // 10,000, so tax payable is limited to 10,000 + 4% cess = 10,400.
    const res = computeTax({ taxableIncome: 1_210_000, regime: "new", fy: "FY 2025-26", age: 30 });
    expect(res.slabTax).toBe(61_500);
    expect(res.rebateMarginalRelief).toBe(51_500);
    expect(res.taxBeforeSurcharge).toBe(10_000);
    expect(res.totalTax).toBe(10_400);
  });

  it("no relief far above the threshold", () => {
    const res = computeTax({ taxableIncome: 3_000_000, regime: "new", fy: "FY 2025-26", age: 30 });
    expect(res.rebateMarginalRelief).toBe(0);
    // 0–4L nil, 4–8 @5=20k, 8–12 @10=40k, 12–16 @15=60k, 16–20 @20=80k, 20–24 @25=100k, 24–30 @30=180k → 4,80,000 + 4% = 4,99,200
    expect(res.slabTax).toBe(480_000);
    expect(res.totalTax).toBe(499_200);
  });

  it("effective and marginal rates differ and are sane", () => {
    const res = computeTax({ taxableIncome: 2_400_000, regime: "new", fy: "FY 2025-26", age: 30 });
    // Slab tax 3,00,000 → +4% = 3,12,000. Effective = 13%.
    expect(res.totalTax).toBe(312_000);
    expect(res.effectiveRate).toBeCloseTo(13, 5);
    // Next rupee falls in the 30% band → marginal ≈ 31.2%.
    expect(res.marginalRate).toBeCloseTo(31.2, 1);
  });
});

describe("FY 2025-26 old regime", () => {
  it("nil tax up to ₹5,00,000 with ₹12,500 rebate", () => {
    const res = computeTax({ taxableIncome: 500_000, regime: "old", fy: "FY 2025-26", age: 30 });
    expect(res.slabTax).toBe(12_500);
    expect(res.rebate87A).toBe(12_500);
    expect(res.totalTax).toBe(0);
  });

  it("computes 20% band correctly at ₹8,00,000", () => {
    const res = computeTax({ taxableIncome: 800_000, regime: "old", fy: "FY 2025-26", age: 30 });
    // 0–2.5L nil, 2.5–5L @5 = 12,500, 5–8L @20 = 60,000 → 72,500 + 4% = 75,400
    expect(res.slabTax).toBe(72_500);
    expect(res.totalTax).toBe(75_400);
  });

  it("applies 30% band above ₹10,00,000", () => {
    const res = computeTax({ taxableIncome: 1_500_000, regime: "old", fy: "FY 2025-26", age: 30 });
    // 12,500 + 1,00,000 + 5L@30 = 1,50,000 → 2,62,500 + 4% = 2,73,000
    expect(res.slabTax).toBe(262_500);
    expect(res.totalTax).toBe(273_000);
  });

  it("senior citizen gets ₹3,00,000 nil band", () => {
    const res = computeTax({ taxableIncome: 300_000, regime: "old", fy: "FY 2025-26", age: 65 });
    expect(res.totalTax).toBe(0);
    const young = computeTax({ taxableIncome: 300_000, regime: "old", fy: "FY 2025-26", age: 30 });
    expect(young.slabTax).toBe(2_500); // 5% of 50,000
  });
});

describe("surcharge", () => {
  it("applies 10% surcharge above ₹50L in the new regime", () => {
    const res = computeTax({ taxableIncome: 6_000_000, regime: "new", fy: "FY 2025-26", age: 40 });
    expect(res.surchargeRate).toBe(0.1);
    expect(res.surcharge).toBe(res.taxBeforeSurcharge * 0.1);
    expect(res.cess).toBeCloseTo((res.taxBeforeSurcharge + res.surcharge) * 0.04, 2);
  });

  it("caps new-regime surcharge at 25% (37% does not apply)", () => {
    const res = computeTax({ taxableIncome: 60_000_000, regime: "new", fy: "FY 2025-26", age: 40 });
    expect(res.surchargeRate).toBe(0.25);
    const old = computeTax({ taxableIncome: 60_000_000, regime: "old", fy: "FY 2025-26", age: 40 });
    expect(old.surchargeRate).toBe(0.37);
  });

  it("surcharge marginal relief caps the jump at ₹50L", () => {
    // Just above 50L: tax+surcharge cannot exceed tax at 50L + excess.
    const res = computeTax({ taxableIncome: 5_100_000, regime: "new", fy: "FY 2025-26", age: 40 });
    const at50 = computeTax({ taxableIncome: 5_000_000, regime: "new", fy: "FY 2025-26", age: 40 });
    expect(res.surchargeMarginalRelief).toBeGreaterThan(0);
    expect(res.taxBeforeSurcharge + res.surcharge).toBeLessThanOrEqual(
      at50.taxBeforeSurcharge + 100_000
    );
  });
});

describe("regression across financial years", () => {
  it("FY 2023-24 new regime: nil up to ₹7L, ₹25,000 rebate", () => {
    const res = computeTax({ taxableIncome: 700_000, regime: "new", fy: "FY 2023-24", age: 30 });
    // 3–6L @5 = 15,000, 6–7L @10 = 10,000 → 25,000, exactly the 87A rebate.
    expect(res.slabTax).toBe(25_000);
    expect(res.rebate87A).toBe(25_000);
    expect(res.totalTax).toBe(0);
  });

  it("FY 2024-25 new regime: nil up to ₹7L, tax at ₹8L", () => {
    const nil = computeTax({ taxableIncome: 700_000, regime: "new", fy: "FY 2024-25", age: 30 });
    expect(nil.totalTax).toBe(0);
    // ₹8,00,000: 3–7L @5 = 20,000, 7–8L @10 = 10,000 → 30,000 + 4% = 31,200
    const t = computeTax({ taxableIncome: 800_000, regime: "new", fy: "FY 2024-25", age: 30 });
    expect(t.slabTax).toBe(30_000);
    expect(t.totalTax).toBe(31_200);
  });

  it("FY 2023-24 vs FY 2024-25 differ: new-regime slabs changed", () => {
    const a = computeTax({ taxableIncome: 1_000_000, regime: "new", fy: "FY 2023-24", age: 30 });
    const b = computeTax({ taxableIncome: 1_000_000, regime: "new", fy: "FY 2024-25", age: 30 });
    // FY23-24: 3–6 @5 = 15,000, 6–9 @10 = 30,000, 9–10 @15 = 15,000 → 60,000
    expect(a.slabTax).toBe(60_000);
    // FY24-25: 3–7 @5 = 20,000, 7–10 @10 = 30,000 → 50,000
    expect(b.slabTax).toBe(50_000);
  });

  it("FY 2024-25 new regime standard deduction is ₹75,000, old is ₹50,000", () => {
    expect(getTaxYearConfig("FY 2024-25").newRegime.standardDeduction).toBe(75_000);
    expect(getTaxYearConfig("FY 2024-25").oldRegime.standardDeduction).toBe(50_000);
  });

  it("every supported FY carries provenance with source URLs and effective dates", () => {
    for (const fy of SUPPORTED_FY) {
      const cfg = getTaxYearConfig(fy);
      expect(cfg.fy).toBe(fy);
      expect(cfg.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(cfg.sources.length).toBeGreaterThan(0);
      for (const s of cfg.sources) {
        expect(s.url).toMatch(/^https:\/\//);
        expect(s.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      expect(cfg.cess).toBe(0.04);
    }
  });

  it("rounds total tax to nearest ₹10", () => {
    const res = computeTax({ taxableIncome: 1_000_057, regime: "old", fy: "FY 2025-26", age: 30 });
    expect(res.totalTax % 10).toBe(0);
  });

  it("monthly TDS is annual tax ÷ 12", () => {
    expect(monthlyTds(273_000)).toBe(22_750);
    expect(monthlyTds(0)).toBe(0);
  });

  it("non-residents do not receive the 87A rebate", () => {
    const res = computeTax({
      taxableIncome: 500_000,
      regime: "old",
      fy: "FY 2025-26",
      age: 30,
      isResident: false,
    });
    expect(res.rebate87A).toBe(0);
    expect(res.totalTax).toBe(13_000); // 12,500 + 4%
  });
});
