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
    expect(exercises.length).toBe(63);
    expect(new Set(exercises.map((e) => e.id)).size).toBe(63);
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
    expect(new Set(foods.map((f) => f.id)).size).toBe(foods.length);
  });
});
