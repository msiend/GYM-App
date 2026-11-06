import { describe, expect, it } from "vitest";
import { foods, allowedFoods } from "../data/foods";
import { indianMeals } from "../data/recipes";
import { profile } from "./fixture";
import {
  groupMealItems,
  mealSchedule,
  nutrition,
  nutritionSeries,
  proteinByMeal,
  totalNutrients,
} from "./nutrition";
import { buildMealIdeas } from "../features/nutrition/meal-ideas";
import type { Food, Intake, MealPlan } from "./types";
const library = [...foods, ...indianMeals];
describe("nutrition audit", () => {
  it("reproduces the screenshot's cooked-portion energy without adding rounded item values", () => {
    const total = totalNutrients(
      [
        { foodId: "spinach", grams: 100 },
        { foodId: "toor-cooked", grams: 150 },
        { foodId: "brown", grams: 180 },
      ],
      foods,
    );
    expect(total.kcal).toBeCloseTo(425.9, 5);
    expect(Math.round(total.kcal)).toBe(426);
    expect(total.protein).toBeCloseTo(18.042, 5);
  });
  it("keeps raw, cooked and sprouted values separate", () => {
    expect(
      totalNutrients([{ foodId: "moong-dry", grams: 100 }], foods).protein,
    ).toBe(23.86);
    expect(
      totalNutrients([{ foodId: "moong-cooked", grams: 100 }], foods).protein,
    ).toBe(7.02);
    expect(
      totalNutrients([{ foodId: "moong-sprouts-raw", grams: 100 }], foods)
        .protein,
    ).toBe(3.04);
    expect(foods.find((f) => f.id === "tofu")?.protein).toBe(17.27);
    expect(
      foods.every((f) => f.sourceId && f.source.includes("SR28 (2015)")),
    ).toBe(true);
  });
  it("uses body-weight protein factors without silently substituting lean mass", () => {
    const result = nutrition({
      ...profile,
      bodyFat: 25,
      proteinMethod: "Lean mass",
    });
    expect(result.lean).toBe(60);
    expect(result.reference).toBe(80);
    expect(result.protein).toBe(128);
    expect(result.warnings.join(" ")).toMatch(/not interchangeable/);
    expect(
      nutrition({
        ...profile,
        proteinMethod: "Reference weight",
        referenceWeight: 65,
      }).protein,
    ).toBe(104);
    expect(
      nutrition({
        ...profile,
        proteinMethod: "Reference weight",
      }).warnings.join(" "),
    ).toMatch(/No reference weight/);
  });
  it("uses consistent goal adjustments and preserves equation uncertainty", () => {
    expect(nutrition(profile).bmr).toBe(1780);
    expect(nutrition({ ...profile, gender: "Female" }).bmr).toBe(1614);
    expect(
      nutrition({ ...profile, nutritionGoal: "Lean muscle building" }).kcal,
    ).toBe(nutrition(profile).kcal);
    const unspecified = nutrition({ ...profile, gender: "Prefer not to say" });
    expect(unspecified.energyRange!.min).toBeLessThan(unspecified.kcal);
    expect(unspecified.energyRange!.max).toBeGreaterThan(unspecified.kcal);
    expect(unspecified.warnings.length).toBeGreaterThan(0);
  });
  it("withholds unsuitable or impossible targets and never returns negative carbs", () => {
    expect(
      nutrition({
        ...profile,
        nutritionGoal: "Fat loss",
        weight: 50,
        height: 180,
      }).blocked,
    ).toBe(true);
    const impossible = nutrition({
      ...profile,
      weight: 25,
      proteinMethod: "Reference weight",
      referenceWeight: 350,
    });
    expect(impossible.blocked).toBe(true);
    expect(impossible.carbs).toBe(0);
    for (const patch of [
      { age: 16 },
      { medical: true },
      { nutritionRisk: true },
    ])
      expect(nutrition({ ...profile, ...patch }).blocked).toBe(true);
  });
  it("counts protein for snacks, workouts and custom meal names", () => {
    const logs: Intake[] = [
      {
        id: "1",
        date: "2026-11-06",
        foodId: "milk",
        grams: 200,
        meal: "Snack",
      },
      {
        id: "2",
        date: "2026-11-06",
        foodId: "chana",
        grams: 100,
        meal: "Meal 5",
      },
      {
        id: "3",
        date: "2026-11-06",
        foodId: "banana",
        grams: 100,
        meal: "Pre-workout",
      },
    ];
    const groups = proteinByMeal(logs, foods);
    expect(groups.map((g) => g.meal)).toEqual([
      "Snack",
      "Meal 5",
      "Pre-workout",
    ]);
    expect(groups.reduce((sum, g) => sum + g.protein, 0)).toBeCloseTo(
      totalNutrients(logs, foods).protein,
      6,
    );
    const series = nutritionSeries(["2026-11-05", "2026-11-06"], logs, foods);
    expect(series[0]).toEqual({
      date: "11-05",
      logged: false,
      protein: null,
      calories: null,
    });
    expect(series[1].protein).toBeCloseTo(16.25, 5);
  });
  it("orders existing meal slots even when IndexedDB IDs put lunch first", () => {
    const item = (id: string, slot: number): MealPlan => ({
      id,
      day: 5,
      slot,
      title: ["Breakfast", "Lunch", "Dinner"][slot],
      foodId: "rice",
      grams: 100,
      notes: "",
      time: "12:00",
    });
    expect(
      groupMealItems([item("a", 1), item("b", 2), item("z", 0)], 5).map(
        (g) => g.items[0].title,
      ),
    ).toEqual(["Breakfast", "Lunch", "Dinner"]);
  });
  it("filters recipe ingredients, allergy synonyms and semicolon-separated exclusions", () => {
    const safe = allowedFoods(
      "Vegetarian",
      "dairy; soya\ngroundnuts",
      "onion",
      library,
    );
    for (const id of [
      "milk",
      "tofu",
      "peanut",
      "peanut-butter",
      "meal-oats-pb",
      "meal-rajma-rice",
      "meal-chana-salad",
    ])
      expect(safe.map((f) => f.id)).not.toContain(id);
    expect(safe.map((f) => f.id)).toContain("meal-dal-rice");
    const unknown = {
      ...indianMeals[0],
      id: "missing",
      recipe: [{ foodId: "missing-ingredient", grams: 10 }],
    } as Food;
    expect(
      allowedFoods("Vegan", "", "", [...library, unknown]).map((f) => f.id),
    ).not.toContain("missing");
  });
  it("allows eggs, dairy and fish for pescatarians while excluding meat", () => {
    const ids = allowedFoods("Pescatarian", "", "", library).map(
      (food) => food.id,
    );
    expect(ids).toContain("egg");
    expect(ids).toContain("milk");
    expect(ids).toContain("fish");
    expect(ids).not.toContain("chicken");
  });
  it.each([2, 3, 4, 5, 6])(
    "generates exactly %i meal slots per day across diets and retains safe food choices",
    (count) => {
      for (const diet of [
        "Vegan",
        "Vegetarian",
        "Eggetarian",
        "Non-vegetarian",
        "Pescatarian",
      ]) {
        const safe = allowedFoods(diet, "peanuts", "onion", library);
        let id = 0;
        const ideas = buildMealIdeas(
          { ...profile, diet, meals: count },
          safe,
          () => String(id++),
        );
        expect(ideas.length).toBeGreaterThan(0);
        for (let day = 0; day < 7; day++) {
          const groups = groupMealItems(ideas, day);
          expect(groups).toHaveLength(count);
          expect(groups.map((g) => g.items[0].time)).toEqual(
            mealSchedule(count).map((m) => m.time),
          );
          for (const item of groups.flatMap((g) => g.items))
            expect(safe.some((f) => f.id === item.foodId)).toBe(true);
        }
      }
    },
  );
});
