/**
 * Tax configuration schema. Tax rules live here — never inline in the engine
 * or UI — so a financial year can be added or corrected without touching
 * calculation code.
 */

export type Regime = "new" | "old";

export interface Slab {
  /** Upper bound of the slab in ₹ (inclusive), null for the top slab. */
  upTo: number | null;
  /** Rate as a fraction, e.g. 0.05 for 5%. */
  rate: number;
}

export interface SurchargeBand {
  /** Surcharge applies when total income exceeds this amount (₹). */
  above: number;
  rate: number;
}

export interface AgeSlabs {
  below60: Slab[];
  age60to79: Slab[];
  age80plus: Slab[];
}

export interface RegimeRules {
  slabs: AgeSlabs;
  /** Standard deduction for salaried/pension income (₹). */
  standardDeduction: number;
  /** Sec 87A rebate: max amount and taxable-income eligibility ceiling. */
  rebate87A: { maxRebate: number; upToTaxableIncome: number };
  /**
   * Marginal relief just above the 87A ceiling: tax cannot exceed the amount
   * by which taxable income exceeds the ceiling.
   */
  rebateMarginalRelief: boolean;
  /** Section 10(13A) HRA exemption permitted under this regime. */
  allowsHra: boolean;
  /** Sec 80C permitted (EPF, PPF, ELSS, life insurance, principal repayment…). */
  allows80C: boolean;
  /** Sec 80D permitted. */
  allows80D: boolean;
  /** Sec 24(b) self-occupied home-loan interest permitted. */
  allowsHomeLoanInterest24b: boolean;
  /** Other Ch VI-A deductions (80CCD(1B), 80TTA/TTB, 80G etc.). */
  allowsOtherChapterVIA: boolean;
}

export interface TaxYearConfig {
  fy: string;
  ay: string;
  effectiveFrom: string;
  /** Health & Education Cess as a fraction of (tax + surcharge). */
  cess: number;
  /** Surcharge bands on income tax, applied per regime via maxSurchargeRate. */
  surcharge: SurchargeBand[];
  /**
   * Highest surcharge rate applicable under the regime. The new regime caps
   * surcharge at 25% (37% does not apply).
   */
  maxSurchargeRate: number;
  /** Surcharge marginal relief thresholds (₹). */
  surchargeMarginalReliefThresholds: number[];
  newRegime: RegimeRules;
  oldRegime: RegimeRules;
  /** Provenance, recorded per FY as required by the spec. */
  sources: { name: string; url: string; effectiveDate: string }[];
  notes: string[];
}
