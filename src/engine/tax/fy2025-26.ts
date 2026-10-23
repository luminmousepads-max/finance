import type { TaxYearConfig } from "./config-schema";

/**
 * FY 2025-26 (AY 2026-27). Finance Act, 2025 (Union Budget 2025-26, presented
 * 1 February 2025, effective 1 April 2025) revised new-regime slabs to
 * 4/8/12/16/20/24 lakh bands and raised the 87A rebate to ₹60,000 for taxable
 * income up to ₹12,00,000, with marginal relief just above the threshold.
 * Old-regime slabs, deductions and the ₹12,500/₹5,00,000 rebate are unchanged.
 */
export const FY_2025_26: TaxYearConfig = {
  fy: "FY 2025-26",
  ay: "AY 2026-27",
  effectiveFrom: "2025-04-01",
  cess: 0.04,
  surcharge: [
    { above: 5_000_000, rate: 0.1 },
    { above: 10_000_000, rate: 0.15 },
    { above: 20_000_000, rate: 0.25 },
    { above: 50_000_000, rate: 0.37 },
  ],
  maxSurchargeRate: 0.25,
  surchargeMarginalReliefThresholds: [5_000_000, 10_000_000, 20_000_000, 50_000_000],
  newRegime: {
    slabs: {
      below60: [
        { upTo: 400_000, rate: 0 },
        { upTo: 800_000, rate: 0.05 },
        { upTo: 1_200_000, rate: 0.1 },
        { upTo: 1_600_000, rate: 0.15 },
        { upTo: 2_000_000, rate: 0.2 },
        { upTo: 2_400_000, rate: 0.25 },
        { upTo: null, rate: 0.3 },
      ],
      age60to79: [
        { upTo: 400_000, rate: 0 },
        { upTo: 800_000, rate: 0.05 },
        { upTo: 1_200_000, rate: 0.1 },
        { upTo: 1_600_000, rate: 0.15 },
        { upTo: 2_000_000, rate: 0.2 },
        { upTo: 2_400_000, rate: 0.25 },
        { upTo: null, rate: 0.3 },
      ],
      age80plus: [
        { upTo: 400_000, rate: 0 },
        { upTo: 800_000, rate: 0.05 },
        { upTo: 1_200_000, rate: 0.1 },
        { upTo: 1_600_000, rate: 0.15 },
        { upTo: 2_000_000, rate: 0.2 },
        { upTo: 2_400_000, rate: 0.25 },
        { upTo: null, rate: 0.3 },
      ],
    },
    standardDeduction: 75_000,
    rebate87A: { maxRebate: 60_000, upToTaxableIncome: 1_200_000 },
    rebateMarginalRelief: true,
    allowsHra: false,
    allows80C: false,
    allows80D: false,
    allowsHomeLoanInterest24b: false,
    allowsOtherChapterVIA: false,
  },
  oldRegime: {
    slabs: {
      below60: [
        { upTo: 250_000, rate: 0 },
        { upTo: 500_000, rate: 0.05 },
        { upTo: 1_000_000, rate: 0.2 },
        { upTo: null, rate: 0.3 },
      ],
      age60to79: [
        { upTo: 300_000, rate: 0 },
        { upTo: 500_000, rate: 0.05 },
        { upTo: 1_000_000, rate: 0.2 },
        { upTo: null, rate: 0.3 },
      ],
      age80plus: [
        { upTo: 500_000, rate: 0 },
        { upTo: 1_000_000, rate: 0.2 },
        { upTo: null, rate: 0.3 },
      ],
    },
    standardDeduction: 50_000,
    rebate87A: { maxRebate: 12_500, upToTaxableIncome: 500_000 },
    rebateMarginalRelief: true,
    allowsHra: true,
    allows80C: true,
    allows80D: true,
    allowsHomeLoanInterest24b: true,
    allowsOtherChapterVIA: true,
  },
  sources: [
    {
      name: "Income Tax Department — AY 2026-27 return guide (slabs, rebate, surcharge, cess)",
      url: "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1",
      effectiveDate: "2025-04-01",
    },
    {
      name: "KPMG — Union Budget 2025-26 tax measures",
      url: "https://kpmg.com/xx/en/our-insights/gms-flash-alert/flash-alert-2025-035.html",
      effectiveDate: "2025-04-01",
    },
    {
      name: "PIB — Union Budget 2025-26 press release",
      url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2098406",
      effectiveDate: "2025-04-01",
    },
  ],
  notes: [
    "New regime is the default. 87A rebate of ₹60,000 makes new-regime tax nil for taxable income up to ₹12,00,000 (salaried: gross salary up to ₹12,75,000 after ₹75,000 standard deduction).",
    "Marginal relief applies just above ₹12,00,000: tax payable cannot exceed the amount by which taxable income exceeds ₹12,00,000.",
    "37% surcharge does not apply in the new regime; the maximum new-regime surcharge is 25%.",
  ],
};
