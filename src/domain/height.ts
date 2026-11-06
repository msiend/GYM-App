/** Height is always stored in centimetres, regardless of the input unit. */
export function feetInchesToCm(feet: string, inches: string): number {
  if (!feet.trim() || !inches.trim()) return NaN;
  const ft = Number(feet),
    inch = Number(inches);
  if (
    !Number.isInteger(ft) ||
    ft < 0 ||
    !Number.isFinite(inch) ||
    inch < 0 ||
    inch >= 12
  )
    return NaN;
  return Math.round((ft * 12 + inch) * 2.54 * 10000) / 10000;
}

export function cmToFeetInches(cm: number) {
  // Round total inches before splitting so rounding never displays 12 inches.
  const total = Math.round((cm / 2.54) * 100) / 100;
  return {
    feet: String(Math.floor(total / 12)),
    inches: String(Math.round((total % 12) * 100) / 100),
  };
}

export function displayHeight(cm: number, unit: "cm" | "ft" = "ft") {
  const { feet, inches } = cmToFeetInches(cm);
  return unit === "cm" ? `${cm} cm` : `${feet} ft ${inches} in`;
}
