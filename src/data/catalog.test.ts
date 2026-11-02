import { describe, it, expect } from "vitest";
import { foods } from "./foods";
import { indianMeals } from "./recipes";
import { exercises } from "./exercises";
describe("offline sourced catalogs", () => {
  it("includes distinct USDA raw, cooked and sprouted moong references", () => {
    expect(foods.find((f) => f.id === "moong-dry")?.protein).toBe(23.86);
    expect(foods.find((f) => f.id === "moong-cooked")?.kcal).toBe(105);
    expect(foods.find((f) => f.id === "moong-sprouts-raw")?.protein).toBe(3.04);
    expect(foods.find((f) => f.id === "moong-sprouts-cooked")?.kcal).toBe(21);
    expect(foods.find((f) => f.id === "peanut-butter")?.sourceId).toBe("16398");
  });
  it("derives meal macros from component quantities and stated yield", () => {
    const meal = indianMeals.find((f) => f.id === "meal-dal-rice")!;
    const expected = meal.recipe!.reduce(
      (s, i) =>
        s + (foods.find((f) => f.id === i.foodId)!.kcal * i.grams) / 100,
      0,
    );
    expect((meal.kcal * meal.servingGrams!) / 100).toBeCloseTo(expected, 0);
    expect(meal.verification).toBe("recipe-estimate");
  });
  it("has unique stable IDs and offline instructions across all major muscle groups", () => {
    expect(exercises.length).toBe(120);
    expect(new Set(exercises.map((e) => e.id)).size).toBe(120);
    for (const m of [
      "Chest",
      "Back",
      "Shoulders",
      "Biceps",
      "Triceps",
      "Forearms",
      "Abs",
      "Quadriceps",
      "Hamstrings",
      "Glutes",
      "Calves",
    ])
      expect(
        exercises.some((e) => e.muscle === m && e.instructions.length > 0),
      ).toBe(true);
    expect(foods.length).toBe(100);
    expect(indianMeals.length).toBe(12);
    expect(new Set(foods.map((f) => f.id)).size).toBe(foods.length);
    for (const f of foods) {
      for (const k of ["kcal", "protein", "carbs", "fat", "fiber"] as const) {
        expect(Number.isFinite(f[k])).toBe(true);
        expect(f[k]).toBeGreaterThanOrEqual(0);
      }
      expect(f.state.length).toBeGreaterThan(0);
    }
    for (const e of exercises) {
      expect(e.instructions.length).toBeGreaterThan(0);
      expect(e.instructions.every((t) => t.trim().length > 0)).toBe(true);
      expect(["reps", "seconds"]).toContain(e.tracking);
    }
    expect(
      exercises.find((e) => e.id === "db-elliptical-trainer")?.category,
    ).toBe("Cardio");
    expect(exercises.find((e) => e.id === "db-triceps-stretch")?.category).toBe(
      "Stretching",
    );
    expect(foods.find((f) => f.id === "mango")?.sourceId).toBe("09176");
    expect(foods.find((f) => f.id === "quinoa-cooked")?.sourceId).toBe("20137");
  });
});

it("calculates every meal from valid component references and declares recipe estimates", () => {
  for (const meal of indianMeals) {
    expect(meal.verification).toBe("recipe-estimate");
    expect(meal.servingGrams).toBeGreaterThan(0);
    for (const item of meal.recipe!) {
      expect(foods.some((f) => f.id === item.foodId)).toBe(true);
    }
    const protein = meal.recipe!.reduce(
      (s, i) =>
        s + (foods.find((f) => f.id === i.foodId)!.protein * i.grams) / 100,
      0,
    );
    expect((meal.protein * meal.servingGrams!) / 100).toBeCloseTo(protein, 0);
  }
});
