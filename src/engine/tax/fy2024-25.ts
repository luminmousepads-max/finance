import type { TaxYearConfig } from "./config-schema";

/**
 * FY 2024-25 (AY 2025-26). Finance Act, 2024 (Union Budget 2024-25, presented
 * 23 July 2024, effective 1 April 2024) raised the new-regime standard
 * deduction to ₹75,000 and widened new-regime slabs to the
 * 3/7/10/12/15 lakh bands, keeping the 87A rebate at ₹25,000 up to ₹7,00,000.
 */
export const FY_2024_25: TaxYearConfig = {
  fy: "FY 2024-25",
  ay: "AY 2025-26",
  effectiveFrom: "2024-04-01",
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
        { upTo: 300_000, rate: 0 },
        { upTo: 700_000, rate: 0.05 },
        { upTo: 1_000_000, rate: 0.1 },
        { upTo: 1_200_000, rate: 0.15 },
        { upTo: 1_500_000, rate: 0.2 },
        { upTo: null, rate: 0.3 },
      ],
      age60to79: [
        { upTo: 300_000, rate: 0 },
        { upTo: 700_000, rate: 0.05 },
        { upTo: 1_000_000, rate: 0.1 },
        { upTo: 1_200_000, rate: 0.15 },
        { upTo: 1_500_000, rate: 0.2 },
        { upTo: null, rate: 0.3 },
      ],
      age80plus: [
        { upTo: 300_000, rate: 0 },
        { upTo: 700_000, rate: 0.05 },
        { upTo: 1_000_000, rate: 0.1 },
        { upTo: 1_200_000, rate: 0.15 },
        { upTo: 1_500_000, rate: 0.2 },
        { upTo: null, rate: 0.3 },
      ],
    },
    standardDeduction: 75_000,
    rebate87A: { maxRebate: 25_000, upToTaxableIncome: 700_000 },
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
      name: "PIB — Union Budget 2024-25: Key Tax Reforms and Relief",
      url: "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2024/jul/doc2024726355001.pdf",
      effectiveDate: "2024-04-01",
    },
    {
      name: "Income Tax Department — Salaried Individuals, AY 2025-26",
      url: "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-3",
      effectiveDate: "2024-04-01",
    },
  ],
  notes: [
    "New-regime standard deduction is ₹75,000 (raised from ₹50,000 by Finance Act 2024).",
    "87A rebate of ₹25,000 applies to new-regime taxable income up to ₹7,00,000 — so a salaried person with gross salary up to ₹7,75,000 pays nil tax in the new regime.",
  ],
};
