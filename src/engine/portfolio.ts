/**
 * Portfolio tracker (manual entries).
 *
 * portfolio return % = ((current − invested) / invested) × 100  — ABSOLUTE.
 * Annualised return uses a holding-period CAGR per asset when the purchase
 * date is known:  (current / invested)^(365 / daysHeld) − 1
 * Absolute and annualised returns are never conflated; a portfolio-level
 * annualised figure is the invested-weighted mean of per-asset annualised
 * returns, and is labelled as such (it is not an XIRR).
 *
 * Live market data: this build has NO market-data integration, so every
 * valuation is explicitly labelled "manually entered" — see valuationSource.
 */

export type AssetCategory =
  | "equity"
  | "indexFund"
  | "mutualFund"
  | "debt"
  | "fd"
  | "rd"
  | "ppf"
  | "epf"
  | "nps"
  | "gold"
  | "realEstate"
  | "cash"
  | "other";

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  equity: "Equity shares",
  indexFund: "Index funds",
  mutualFund: "Mutual funds",
  debt: "Debt funds",
  fd: "Fixed deposits",
  rd: "Recurring deposits",
  ppf: "PPF",
  epf: "EPF",
  nps: "NPS",
  gold: "Gold",
  realEstate: "Real estate",
  cash: "Cash / savings",
  other: "Other",
};

export type ValuationSource = "manual" | "marketData";

export interface AssetEntry {
  id: string;
  name: string;
  category: AssetCategory;
  invested: number;
  currentValue: number;
  /** ISO date string; optional. */
  purchaseDate?: string;
  /** User's expected annual return assumption for this asset. */
  expectedReturn?: number;
  /** Known fees/taxes, if entered. */
  fees?: number;
  valuationSource: ValuationSource;
  /** e.g. "Manually entered — updated 2026-10-23" */
  sourceNote?: string;
}

export interface AssetResult {
  entry: AssetEntry;
  gain: number;
  gainPct: number;
  /** null when purchase date missing. */
  annualisedPct: number | null;
  allocationPct: number;
  weight: number;
}

export interface PortfolioResult {
  assets: AssetResult[];
  totalInvested: number;
  totalValue: number;
  totalGain: number;
  totalGainPct: number;
  /** Invested-weighted mean of per-asset annualised returns; null if no dates. */
  annualisedPct: number | null;
  allocation: { category: AssetCategory; label: string; value: number; pct: number }[];
  /** Share of the largest single position (% of portfolio). */
  topHoldingPct: number;
  topHoldingName: string;
  /** Herfindahl index of allocation shares (0–10,000). */
  concentrationHhi: number;
  /** Invested-weighted expected return from user assumptions. */
  weightedExpectedReturn: number | null;
  hasLivePrices: boolean;
  warnings: string[];
}

/** Absolute return %, guarded against zero invested. */
export function absoluteReturnPct(invested: number, current: number): number {
  if (invested <= 0) return 0;
  return ((current - invested) / invested) * 100;
}

/** Annualised (CAGR) return from a holding period in days; null if invalid. */
export function annualisedReturnPct(
  invested: number,
  current: number,
  daysHeld: number
): number | null {
  if (invested <= 0 || current <= 0 || daysHeld <= 0) return null;
  const ratio = current / invested;
  if (ratio <= 0) return null;
  return (Math.pow(ratio, 365 / daysHeld) - 1) * 100;
}

function daysBetween(isoDate: string, now: Date): number | null {
  const t = Date.parse(isoDate);
  if (Number.isNaN(t)) return null;
  const days = Math.floor((now.getTime() - t) / 86_400_000);
  return days > 0 ? days : null;
}

export function computePortfolio(
  entries: AssetEntry[],
  now: Date = new Date()
): PortfolioResult {
  const warnings: string[] = [];
  const valid = entries.filter((e) => e.invested >= 0 && e.currentValue >= 0);
  if (valid.length !== entries.length) {
    warnings.push("Some entries had invalid values and were skipped.");
  }

  const totalInvested = valid.reduce((s, e) => s + e.invested, 0);
  const totalValue = valid.reduce((s, e) => s + e.currentValue, 0);
  const totalGain = totalValue - totalInvested;
  const totalGainPct = absoluteReturnPct(totalInvested, totalValue);

  const assets: AssetResult[] = valid.map((entry) => {
    const days = entry.purchaseDate ? daysBetween(entry.purchaseDate, now) : null;
    return {
      entry,
      gain: entry.currentValue - entry.invested,
      gainPct: absoluteReturnPct(entry.invested, entry.currentValue),
      annualisedPct:
        days === null ? null : annualisedReturnPct(entry.invested, entry.currentValue, days),
      allocationPct: totalValue > 0 ? (entry.currentValue / totalValue) * 100 : 0,
      weight: totalInvested > 0 ? entry.invested / totalInvested : 0,
    };
  });

  // Category allocation on current value.
  const catMap = new Map<AssetCategory, number>();
  for (const e of valid) catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.currentValue);
  const allocation = [...catMap.entries()]
    .map(([category, value]) => ({
      category,
      label: ASSET_CATEGORY_LABELS[category],
      value,
      pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Concentration: largest single position by current value.
  let topName = "—";
  let topValue = 0;
  for (const e of valid) {
    if (e.currentValue > topValue) {
      topValue = e.currentValue;
      topName = e.name;
    }
  }
  const topHoldingPct = totalValue > 0 ? (topValue / totalValue) * 100 : 0;

  const concentrationHhi =
    totalValue > 0
      ? valid.reduce((s, e) => s + Math.pow((e.currentValue / totalValue) * 100, 2), 0)
      : 0;

  // Weighted expected return (on invested weights) — user assumptions only.
  const withReturn = assets.filter((a) => typeof a.entry.expectedReturn === "number");
  const weightSum = withReturn.reduce((s, a) => s + a.weight, 0);
  const weightedExpectedReturn =
    weightSum > 0
      ? withReturn.reduce((s, a) => s + (a.entry.expectedReturn ?? 0) * a.weight, 0) / weightSum
      : null;

  // Portfolio-level annualised: invested-weighted mean of asset annualised.
  const withCagr = assets.filter((a) => a.annualisedPct !== null);
  const cagrWeightSum = withCagr.reduce((s, a) => s + a.weight, 0);
  const annualisedPct =
    cagrWeightSum > 0
      ? withCagr.reduce((s, a) => s + (a.annualisedPct ?? 0) * a.weight, 0) / cagrWeightSum
      : null;

  const hasLivePrices = valid.some((e) => e.valuationSource === "marketData");
  if (!hasLivePrices && valid.length > 0) {
    warnings.push(
      "All valuations are manually entered — no live market data is connected to this build."
    );
  }

  return {
    assets,
    totalInvested,
    totalValue,
    totalGain,
    totalGainPct,
    annualisedPct,
    allocation,
    topHoldingPct,
    topHoldingName: topName,
    concentrationHhi,
    weightedExpectedReturn,
    hasLivePrices,
    warnings,
  };
}
