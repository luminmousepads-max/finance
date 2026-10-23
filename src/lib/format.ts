/**
 * Indian number formatting: ₹12,50,000 style grouping, lakh/crore labels.
 * Presentation only — never used for arithmetic.
 */

const inr = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inrPaise = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹12,50,000 — nearest rupee, Indian digit grouping. */
export function formatINR(value: number, opts: { paise?: boolean } = {}): string {
  if (!Number.isFinite(value)) return "₹—";
  const abs = Math.abs(value);
  const body = opts.paise ? inrPaise.format(abs) : inr.format(Math.round(abs));
  return `${value < 0 ? "−" : ""}₹${body}`;
}

/** Plain number with Indian grouping (no symbol): 12,50,000 */
export function formatNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * Short Indian-unit label for axis ticks and chips:
 * 85,000 → "85 K", 4,50,000 → "4.5 L", 1,20,00,000 → "1.2 Cr"
 */
export function shortINR(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)} Cr`;
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)} L`;
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)} K`;
  return `${sign}₹${Math.round(abs)}`;
}

function trim(x: number): string {
  const r = Math.round(x * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** "₹12.5 LPA" from a numeric LPA value. */
export function formatLPA(lpa: number): string {
  if (!Number.isFinite(lpa)) return "—";
  const t = Math.round(lpa * 100) / 100;
  return `${Number.isInteger(t) ? t : t.toFixed(2)} LPA`;
}

/** Percent with sensible defaults: 18.2% */
export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

/** Signed delta, e.g. "+₹1,20,000" / "−₹1,20,000" */
export function formatDelta(value: number): string {
  const s = formatINR(Math.abs(value));
  return value < 0 ? `−${s}` : `+${s}`;
}
