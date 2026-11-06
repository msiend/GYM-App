import type { Food, Intake, MealPlan, Profile } from "./types";

export const nutrientKeys = [
  "kcal",
  "protein",
  "carbs",
  "fat",
  "fiber",
] as const;
export type Nutrients = Record<(typeof nutrientKeys)[number], number>;
export function nutrientsFor(food: Food | undefined, grams: number): Nutrients {
  const amount = Number.isFinite(grams) && grams > 0 ? grams / 100 : 0;
  return Object.fromEntries(
    nutrientKeys.map((key) => [key, (food?.[key] || 0) * amount]),
  ) as Nutrients;
}
export function totalNutrients(
  items: Pick<Intake, "foodId" | "grams">[],
  foods: Food[],
): Nutrients {
  const byId = new Map(foods.map((food) => [food.id, food]));
  return items.reduce(
    (totals, item) => {
      const values = nutrientsFor(byId.get(item.foodId), item.grams);
      for (const key of nutrientKeys) totals[key] += values[key];
      return totals;
    },
    nutrientsFor(undefined, 0),
  );
}
export function nutritionSeries(
  dates: string[],
  logs: Intake[],
  foods: Food[],
) {
  return dates.map((date) => {
    const entries = logs.filter((log) => log.date === date);
    const totals = totalNutrients(entries, foods);
    return {
      date: date.slice(5),
      logged: entries.length > 0,
      protein: entries.length ? totals.protein : null,
      calories: entries.length ? totals.kcal : null,
    };
  });
}
export function proteinByMeal(items: Intake[], foods: Food[]) {
  return [...new Set(items.map((item) => item.meal))].map((meal) => ({
    meal,
    protein: totalNutrients(
      items.filter((item) => item.meal === meal),
      foods,
    ).protein,
  }));
}
export function groupMealItems(plans: MealPlan[], day: number) {
  const items = plans.filter((item) => item.day === day);
  return [...new Set(items.map((item) => item.slot))]
    .sort((a, b) => a - b)
    .map((slot) => ({
      slot,
      items: items
        .filter((item) => item.slot === slot)
        .sort(
          (a, b) =>
            (a.position ?? 999) - (b.position ?? 999) ||
            a.id.localeCompare(b.id),
        ),
    }));
}
export function mealSchedule(count: number) {
  const schedule: Record<number, [string, string][]> = {
    2: [
      ["Breakfast", "09:00"],
      ["Dinner", "19:00"],
    ],
    3: [
      ["Breakfast", "08:00"],
      ["Lunch", "13:00"],
      ["Dinner", "19:00"],
    ],
    4: [
      ["Breakfast", "08:00"],
      ["Lunch", "13:00"],
      ["Snack", "16:00"],
      ["Dinner", "19:00"],
    ],
    5: [
      ["Breakfast", "08:00"],
      ["Morning snack", "11:00"],
      ["Lunch", "13:00"],
      ["Afternoon snack", "16:00"],
      ["Dinner", "19:00"],
    ],
    6: [
      ["Breakfast", "08:00"],
      ["Morning snack", "10:30"],
      ["Lunch", "13:00"],
      ["Afternoon snack", "16:00"],
      ["Dinner", "19:00"],
      ["Evening snack", "21:00"],
    ],
  };
  return (schedule[count] || schedule[3]).map(([title, time]) => ({
    title,
    time,
  }));
}

export function nutrition(p: Profile) {
  const warnings: string[] = [];
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  const known = p.gender === "Male" || p.gender === "Female";
  const bmr =
    base + (p.gender === "Male" ? 5 : p.gender === "Female" ? -161 : -78);
  if (!known)
    warnings.push(
      "Sex-specific equation inputs were not provided. The energy midpoint is illustrative, not a separately validated equation.",
    );
  const maintenance = Math.round(bmr * p.activity);
  const multiplier =
    p.nutritionGoal === "Fat loss"
      ? 0.9
      : ["Muscle building", "Lean muscle building"].includes(p.nutritionGoal)
        ? 1.05
        : 1;
  const kcal = Math.round(maintenance * multiplier);
  const lean =
    p.bodyFat && Number.isFinite(p.bodyFat) && p.bodyFat > 0 && p.bodyFat < 100
      ? Math.round(p.weight * (1 - p.bodyFat / 100) * 10) / 10
      : null;
  const clinicalReference =
    p.proteinMethod === "Reference weight" &&
    p.referenceWeight &&
    Number.isFinite(p.referenceWeight) &&
    p.referenceWeight > 0
      ? p.referenceWeight
      : undefined;
  const reference = clinicalReference || p.weight;
  if (p.proteinMethod === "Lean mass")
    warnings.push(
      "Body-weight protein factors are not interchangeable with lean-mass factors. Lean mass is shown separately; this starting reference uses body weight. Ask a dietitian for a lean-mass-based target.",
    );
  if (p.proteinMethod === "Reference weight" && !clinicalReference)
    warnings.push(
      "No reference weight was supplied. The protein reference uses your current body weight.",
    );
  if (clinicalReference)
    warnings.push(
      "Reference-weight targets require individual professional guidance; the displayed factor is an illustrative starting point.",
    );
  const factor = [
    "Muscle building",
    "Lean muscle building",
    "Athletic performance",
    "Fat loss",
  ].includes(p.nutritionGoal)
    ? 1.6
    : 1.2;
  const protein = Math.round(reference * factor);
  const fat = Math.round((kcal * 0.3) / 9);
  const remaining = kcal - protein * 4 - fat * 9;
  const invalid =
    ![
      p.weight,
      p.height,
      p.age,
      p.activity,
      p.meals,
      bmr,
      kcal,
      protein,
      remaining,
    ].every(Number.isFinite) ||
    p.weight <= 0 ||
    p.height <= 0 ||
    p.meals < 2 ||
    p.meals > 6 ||
    bmr <= 0 ||
    kcal <= 0 ||
    remaining <= 0;
  const underweightDeficit =
    p.nutritionGoal === "Fat loss" && p.weight / (p.height / 100) ** 2 < 18.5;
  const blockReason =
    p.age < 18 || p.nutritionRisk || p.medical
      ? "Your screening needs individualized guidance before using personal targets."
      : underweightDeficit
        ? "A fat-loss target is not appropriate for the reported low body weight. Seek individual guidance."
        : invalid
          ? "Your energy and protein inputs do not form a usable estimate. Review your profile with a qualified dietitian."
          : "";
  return {
    blocked: !!blockReason,
    blockReason,
    warnings,
    bmr: Math.round(bmr),
    maintenance,
    kcal,
    lean,
    fatMass: lean === null ? null : Math.round((p.weight - lean) * 10) / 10,
    protein,
    min: Math.round(reference * 1.2),
    max: Math.round(reference * 2),
    perMeal: Math.round(protein / Math.max(1, p.meals)),
    carbs: Math.max(0, Math.round(remaining / 4)),
    fat,
    reference,
    factor,
    energyRange: known
      ? null
      : {
          min: Math.round((base - 161) * p.activity * multiplier),
          max: Math.round((base + 5) * p.activity * multiplier),
        },
    method: clinicalReference
      ? "Clinician-provided reference weight"
      : "Total body weight",
  };
}
