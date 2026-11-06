import { describe, it, expect } from "vitest";
import { cmToFeetInches, feetInchesToCm, displayHeight } from "./height";

describe("height units", () => {
  it("converts feet and inches to the centimetres used by nutrition calculations", () => {
    expect(feetInchesToCm("5", "8")).toBe(172.72);
    expect(feetInchesToCm("6", "0")).toBe(182.88);
    expect(displayHeight(172.72)).toBe("5 ft 8 in");
    expect(displayHeight(172.72, "cm")).toBe("172.72 cm");
  });
  it("rejects missing values, decimal feet and out-of-range inches", () => {
    for (const [feet, inches] of [
      ["", "8"],
      ["5", ""],
      ["5.8", "0"],
      ["5", "12"],
      ["5", "-1"],
      ["NaN", "8"],
    ])
      expect(feetInchesToCm(feet, inches)).toBeNaN();
  });
  it("rounds inches without displaying 12 and preserves useful precision", () => {
    expect(cmToFeetInches(182.87999)).toEqual({ feet: "6", inches: "0" });
    for (const cm of [100, 170, 172.72, 180, 250]) {
      const height = cmToFeetInches(cm);
      expect(Number(height.inches)).toBeLessThan(12);
      expect(feetInchesToCm(height.feet, height.inches)).toBeCloseTo(cm, 1);
    }
  });
});
