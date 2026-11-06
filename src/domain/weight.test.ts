import { expect, it } from "vitest";
import { displayedLoad, storedLoad } from "./weight";
it("keeps canonical loads in kg while preserving fractional loads and pound-based edits", () => {
  expect(displayedLoad(10, "lbs")).toBe(22.05);
  expect(displayedLoad(0.25, "kg")).toBe(0.25);
  expect(displayedLoad(storedLoad(24, "lbs"), "lbs")).toBe(24);
  expect(storedLoad(22.0462262185, "lbs")).toBeCloseTo(10, 8);
  expect(storedLoad(-1, "kg")).toBe(0);
});
