import { describe, expect, it } from "vitest";
import {
  addMoney,
  divMoney,
  fromPaise,
  mulMoney,
  percentOf,
  roundToTen,
  safeDiv,
  subMoney,
  toPaise,
} from "../money";

describe("money arithmetic", () => {
  it("converts rupees to integer paise without float drift", () => {
    expect(toPaise(0.1)).toBe(10);
    expect(toPaise(19.99)).toBe(1999);
    expect(toPaise(1234567.89)).toBe(123456789);
    expect(fromPaise(1999)).toBe(19.99);
  });

  it("accumulates additions exactly (0.1 + 0.2 problem)", () => {
    expect(addMoney(0.1, 0.2)).toBe(0.3);
    expect(addMoney(0.1, 0.1, 0.1)).toBe(0.3);
    // 100 additions of 0.01 = 1.00
    const sum = addMoney(...Array(100).fill(0.01));
    expect(sum).toBe(1);
  });

  it("subtracts in paise space", () => {
    expect(subMoney(1, 0.9)).toBe(0.1);
    expect(subMoney(0.3, 0.1)).toBe(0.2);
  });

  it("multiplies with half-away-from-zero rounding at paisa", () => {
    expect(mulMoney(100, 0.12)).toBe(12);
    expect(mulMoney(12_500, 0.12)).toBe(1500);
    // 0.05 * 19% — rounds at paisa, not float noise
    expect(mulMoney(1.05, 0.19)).toBe(0.2);
  });

  it("divides guarded", () => {
    expect(divMoney(100, 3)).toBe(33.33);
    expect(divMoney(100, 0)).toBe(0);
  });

  it("rounds to nearest ₹10 (Sec 288B convention), half away from zero", () => {
    expect(roundToTen(12_345)).toBe(12_350);
    expect(roundToTen(12_344)).toBe(12_340);
    expect(roundToTen(5)).toBe(10);
    expect(roundToTen(-15)).toBe(-20);
  });

  it("percentOf and safeDiv handle zero denominators", () => {
    expect(percentOf(50, 0)).toBe(0);
    expect(percentOf(25, 100)).toBe(25);
    expect(safeDiv(10, 0, -1)).toBe(-1);
  });
});
