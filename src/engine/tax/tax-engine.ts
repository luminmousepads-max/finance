import type { AgeSlabs, Regime, Slab, TaxYearConfig } from "./config-schema";
import { FY_2023_24 } from "./fy2023-24";
import { FY_2024_25 } from "./fy2024-25";
import { FY_2025_26 } from "./fy2025-26";
import { addMoney, fromPaise, mulMoney, roundToTen, toPaise } from "../../lib/money";

export type { Regime, TaxYearConfig } from "./config-schema";

export const SUPPORTED_FY = ["FY 2023-24", "FY 2024-25", "FY 2025-26"] as const;
export type SupportedFY = (typeof SUPPORTED_FY)[number];

const REGISTRY: Record<SupportedFY, TaxYearConfig> = {
  "FY 2023-24": FY_2023_24,
  "FY 2024-25": FY_2024_25,
  "FY 2025-26": FY_2025_26,
};

export function getTaxYearConfig(fy: string): TaxYearConfig {
  const cfg = REGISTRY[fy as SupportedFY];
  // Fall back to the latest supported year; callers surface the FY label.
  return cfg ?? REGISTRY["FY 2025-26"];
}

export type AgeBand = "below60" | "age60to79" | "age80plus";

export interface TaxInput {
  /** Total income under the chosen regime (₹), after exemptions & deductions. */
  taxableIncome: number;
  regime: Regime;
  fy: SupportedFY;
  age: number;
  /** Resident needed for 87A rebate (rebate is only for residents). */
  isResident?: boolean;
}

export interface SlabRow {
  from: number;
  to: number | null;
  rate: number;
  incomeInSlab: number;
  tax: number;
}

export interface TaxResult {
  fy: string;
  ay: string;
  regime: Regime;
  /** Rounded to nearest ₹10 per Sec 288B convention. */
  taxableIncomeRounded: number;
  slabRows: SlabRow[];
  slabTax: number;
  rebate87A: number;
  rebateMarginalRelief: number;
  taxBeforeSurcharge: number;
  surchargeRate: number;
  surcharge: number;
  surchargeMarginalRelief: number;
  cess: number;
  totalTax: number;
  /** totalTax / taxableIncome × 100 */
  effectiveRate: number;
  /** Rate on the next rupee of income, at this income level. */
  marginalRate: number;
  effectiveDate: string;
  sources: TaxYearConfig["sources"];
}

function ageBandFor(age: number): AgeBand {
  if (age >= 80) return "age80plus";
  if (age >= 60) return "age60to79";
  return "below60";
}

function slabsFor(cfg: TaxYearConfig, regime: Regime, age: number): Slab[] {
  const ageSlabs: AgeSlabs = regime === "new" ? cfg.newRegime.slabs : cfg.oldRegime.slabs;
  return ageSlabs[ageBandFor(age)];
}

/** Progressive slab tax on taxable income. All in rupees, paise-accumulated. */
export function slabTax(taxableIncome: number, slabs: Slab[]): { total: number; rows: SlabRow[] } {
  const rows: SlabRow[] = [];
  let remaining = Math.max(0, taxableIncome);
  let lower = 0;
  let totalPaise = 0;
  for (const slab of slabs) {
    if (remaining <= 0) break;
    const width = slab.upTo === null ? remaining : Math.max(0, slab.upTo - lower);
    const inSlab = Math.min(remaining, width);
    const taxPaise = toPaise(mulMoney(inSlab, slab.rate));
    rows.push({
      from: lower,
      to: slab.upTo,
      rate: slab.rate,
      incomeInSlab: inSlab,
      tax: fromPaise(taxPaise),
    });
    totalPaise += taxPaise;
    remaining -= inSlab;
    lower = slab.upTo ?? lower + width;
  }
  return { total: fromPaise(totalPaise), rows };
}

/** Highest surcharge band whose threshold the income exceeds. */
function surchargeRateFor(cfg: TaxYearConfig, regime: Regime, totalIncome: number): number {
  let rate = 0;
  for (const band of cfg.surcharge) {
    if (totalIncome > band.above) rate = band.rate;
  }
  // New regime caps surcharge at 25%.
  if (regime === "new") rate = Math.min(rate, cfg.maxSurchargeRate);
  return rate;
}

interface CoreResult {
  /** Unrounded total — used for the marginal-rate probe so that the ₹10
   *  display rounding cannot distort the marginal computation. */
  totalTaxUnrounded: number;
  slabRows: SlabRow[];
  slabTax: number;
  rebate87A: number;
  rebateMarginalRelief: number;
  taxBeforeSurcharge: number;
  surchargeRate: number;
  surcharge: number;
  surchargeMarginalRelief: number;
  cess: number;
  totalTax: number;
}

/**
 * One full pass of slab tax → rebate → surcharge → cess, without the
 * marginal-rate probe (so probes can call this without recursing).
 */
function computeCore(
  taxableRounded: number,
  cfg: TaxYearConfig,
  regime: Regime,
  slabs: Slab[],
  isResident: boolean
): CoreResult {
  const regimeRules = regime === "new" ? cfg.newRegime : cfg.oldRegime;
  const { total: baseTax, rows } = slabTax(taxableRounded, slabs);

  // Sec 87A rebate (residents only) and its marginal relief just above the
  // rebate ceiling.
  let rebate87A = 0;
  let rebateMarginalRelief = 0;
  let taxBeforeSurcharge = baseTax;
  if (isResident && taxableRounded <= regimeRules.rebate87A.upToTaxableIncome) {
    rebate87A = Math.min(regimeRules.rebate87A.maxRebate, baseTax);
    taxBeforeSurcharge = baseTax - rebate87A;
  } else if (isResident && regimeRules.rebateMarginalRelief) {
    const excess = taxableRounded - regimeRules.rebate87A.upToTaxableIncome;
    if (excess > 0 && baseTax > excess) {
      rebateMarginalRelief = baseTax - excess;
      taxBeforeSurcharge = excess;
    }
  }

  // Surcharge on income tax, with marginal relief at each threshold.
  const surchargeRate = surchargeRateFor(cfg, regime, taxableRounded);
  let surcharge = mulMoney(taxBeforeSurcharge, surchargeRate);
  let surchargeMarginalRelief = 0;
  if (surchargeRate > 0) {
    const threshold = [...cfg.surchargeMarginalReliefThresholds]
      .sort((a, b) => b - a)
      .find((t) => taxableRounded > t);
    if (threshold !== undefined) {
      // Tax + surcharge here must not exceed tax at the threshold plus the
      // income above it.
      const { total: taxAtThreshold } = slabTax(threshold, slabs);
      const cap = taxAtThreshold + (taxableRounded - threshold);
      if (taxBeforeSurcharge + surcharge > cap) {
        surchargeMarginalRelief = taxBeforeSurcharge + surcharge - cap;
        surcharge = Math.max(0, cap - taxBeforeSurcharge);
      }
    }
  }

  const cess = mulMoney(taxBeforeSurcharge + surcharge, cfg.cess);
  const totalTaxUnrounded = addMoney(taxBeforeSurcharge, surcharge, cess);
  const totalTax = roundToTen(totalTaxUnrounded);

  return {
    totalTaxUnrounded,
    slabRows: rows,
    slabTax: baseTax,
    rebate87A,
    rebateMarginalRelief,
    taxBeforeSurcharge,
    surchargeRate,
    surcharge,
    surchargeMarginalRelief,
    cess,
    totalTax,
  };
}

/**
 * Core income-tax computation for one regime.
 *
 * Steps: slab tax → Sec 87A rebate (+ marginal relief) → surcharge
 * (with marginal relief) → 4% Health & Education Cess → round to ₹10.
 * The marginal rate is probed by re-running the same core ₹1,000 higher.
 */
export function computeTax(input: TaxInput): TaxResult {
  const cfg = getTaxYearConfig(input.fy);
  const slabs = slabsFor(cfg, input.regime, input.age);
  const taxable = Math.max(0, input.taxableIncome);
  const taxableRounded = roundToTen(taxable);
  const isResident = input.isResident !== false;

  const core = computeCore(taxableRounded, cfg, input.regime, slabs, isResident);
  const probe = computeCore(taxableRounded + 1000, cfg, input.regime, slabs, isResident);
  const marginalRate =
    ((probe.totalTaxUnrounded - core.totalTaxUnrounded) / 1000) * 100;

  return {
    fy: cfg.fy,
    ay: cfg.ay,
    regime: input.regime,
    taxableIncomeRounded: taxableRounded,
    slabRows: core.slabRows,
    slabTax: core.slabTax,
    rebate87A: core.rebate87A,
    rebateMarginalRelief: core.rebateMarginalRelief,
    taxBeforeSurcharge: core.taxBeforeSurcharge,
    surchargeRate: core.surchargeRate,
    surcharge: core.surcharge,
    surchargeMarginalRelief: core.surchargeMarginalRelief,
    cess: core.cess,
    totalTax: core.totalTax,
    effectiveRate: taxable > 0 ? (core.totalTax / taxable) * 100 : 0,
    marginalRate,
    effectiveDate: cfg.effectiveFrom,
    sources: cfg.sources,
  };
}

/** Monthly TDS estimate: annual tax ÷ 12. */
export function monthlyTds(totalTax: number): number {
  return fromPaise(toPaise(totalTax) / 12);
}
