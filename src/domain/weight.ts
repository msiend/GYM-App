const poundsPerKg = 2.2046226218487757;
/** Canonical stored load stays in kg; display/edit follows the workout preference. */
export function displayedLoad(kg: number, unit: string) {
  return Math.round(kg * (unit === "lbs" ? poundsPerKg : 1) * 100) / 100;
}
export function storedLoad(value: number, unit: string) {
  return (
    (Number.isFinite(value) ? Math.max(0, Math.min(1000, value)) : 0) /
    (unit === "lbs" ? poundsPerKg : 1)
  );
}
