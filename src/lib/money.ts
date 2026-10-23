/**
 * Decimal-safe money arithmetic.
 *
 * Convention: all money values crossing the engine boundary are rupees (number).
 * Inside arithmetic that could accumulate rounding error (tax slabs, EMI,
 * interest accruals) we convert to integer paise, operate, and convert back.
 *
 * Rounding conventions used across Arth:
 * - Rate multiplications round half away from zero, to the nearest paisa.
 * - Income tax payable is rounded to the nearest ₹10 (Sec. 288B convention)
 *   at the final stage of the tax engine; intermediate values are not rounded.
 * - Display rounding is a presentation concern (see format.ts), never engine.
 */

export const PAISE_PER_RUPEE = 100;

function roundHalfAwayFromZero(x: number): number {
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

/** Rupees → integer paise. */
export function toPaise(rupees: number): number {
  return roundHalfAwayFromZero(rupees * PAISE_PER_RUPEE);
}

/** Integer paise → rupees. */
export function fromPaise(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

/** Sum of rupee values, accumulated in paise. */
export function addMoney(...rupees: number[]): number {
  return fromPaise(rupees.reduce((acc, r) => acc + toPaise(r), 0));
}

/** Difference a − b in paise-exact arithmetic. */
export function subMoney(a: number, b: number): number {
  return fromPaise(toPaise(a) - toPaise(b));
}

/** Multiply a rupee amount by a rate, rounding half away from zero at paisa level. */
export function mulMoney(rupees: number, rate: number): number {
  return fromPaise(roundHalfAwayFromZero(toPaise(rupees) * rate));
}

/** Divide, rounding half away from zero at paisa level. Guard against /0 → returns 0. */
export function divMoney(rupees: number, divisor: number): number {
  if (divisor === 0) return 0;
  return fromPaise(roundHalfAwayFromZero(toPaise(rupees) / divisor));
}

/** Percentage of an amount: part/whole × 100, guarded against /0. */
export function percentOf(part: number, whole: number): number {
  if (whole === 0) return 0;
  return (part / whole) * 100;
}

/** Round a rupee amount to the nearest whole rupee, half away from zero. */
export function roundToRupee(rupees: number): number {
  return roundHalfAwayFromZero(rupees);
}

/** Round to the nearest ₹10 (Sec. 288B: rounding of income-tax payable). */
export function roundToTen(rupees: number): number {
  return roundHalfAwayFromZero(rupees / 10) * 10;
}

/** Clamp into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Guarded safe division for rates; returns fallback when denominator is 0. */
export function safeDiv(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(denominator) || denominator === 0) return fallback;
  return numerator / denominator;
}

/** True when a value is a finite number (accepts numeric strings from inputs). */
export function isNumeric(value: unknown): value is number {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string" && value.trim() !== "") {
    return Number.isFinite(Number(value));
  }
  return false;
}

/** Coerce an input-ish value to a finite number or 0. */
export function num(value: unknown): number {
  if (!isNumeric(value)) return 0;
  return typeof value === "string" ? Number(value) : value;
}
