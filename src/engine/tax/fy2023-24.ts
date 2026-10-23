import type { TaxYearConfig } from "./config-schema";

/**
 * FY 2023-24 (AY 2024-25). Finance (No. 2) Act, 2023 notified the revised
 * new-regime slabs effective 1 April 2023 (Union Budget 2023-24).
 */
export const FY_2023_24: TaxYearConfig = {
  fy: "FY 2023-24",
  ay: "AY 2024-25",
  effectiveFrom: "2023-04-01",
  cess: 0.04,
  surcharge: [
    { above: 5_000_000, rate: 0.1 },
    { above: 10_000_000, rate: 0.15 },
    { above: 20_000_000, rate: 0.25 },
    { above: 50_000_000, rate: 0.37 },
  ],
  maxSurchargeRate: 0.25, // new-regime cap; 37% band exists only in old regime
  surchargeMarginalReliefThresholds: [5_000_000, 10_000_000, 20_000_000, 50_000_000],
  newRegime: {
    slabs: {
      below60: [
        { upTo: 300_000, rate: 0 },
        { upTo: 600_000, rate: 0.05 },
        { upTo: 900_000, rate: 0.1 },
        { upTo: 1_200_000, rate: 0.15 },
        { upTo: 1_500_000, rate: 0.2 },
        { upTo: null, rate: 0.3 },
      ],
      age60to79: [
        { upTo: 300_000, rate: 0 },
        { upTo: 600_000, rate: 0.05 },
        { upTo: 900_000, rate: 0.1 },
        { upTo: 1_200_000, rate: 0.15 },
        { upTo: 1_500_000, rate: 0.2 },
        { upTo: null, rate: 0.3 },
      ],
      age80plus: [
        { upTo: 300_000, rate: 0 },
        { upTo: 600_000, rate: 0.05 },
        { upTo: 900_000, rate: 0.1 },
        { upTo: 1_200_000, rate: 0.15 },
        { upTo: 1_500_000, rate: 0.2 },
        { upTo: null, rate: 0.3 },
      ],
    },
    standardDeduction: 50_000,
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
      name: "Finance (No. 2) Act, 2023 — revised new-regime slabs (Sec 115BAC)",
      url: "https://www.indiabudget.gov.in/doc/finance_act.pdf",
      effectiveDate: "2023-04-01",
    },
    {
      name: "Income Tax Department — Salaried Individuals guide",
      url: "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-3",
      effectiveDate: "2023-04-01",
    },
  ],
  notes: [
    "New regime is the default from AY 2024-25 for taxpayers other than those with business/profession income who exercise the exclusion option.",
    "Old-regime slabs differ by age (below 60 / 60–79 / 80+); new-regime slabs are age-flat.",
  ],
};
