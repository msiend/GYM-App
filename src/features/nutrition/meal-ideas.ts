import type { Food, MealPlan, Profile } from "../../domain/types";
import { mealSchedule } from "../../domain/nutrition";

type Component = { foodId: string; grams: number };
export function buildMealIdeas(
  profile: Profile,
  safe: Food[],
  createId: () => string,
): MealPlan[] {
  const choose = (ids: string[], day: number) => {
    const choices = ids.flatMap((id) => {
      const food = safe.find((food) => food.id === id);
      return food ? [food] : [];
    });
    return choices.length ? choices[day % choices.length] : undefined;
  };
  const plans: MealPlan[] = [];
  for (let day = 0; day < 7; day++)
    for (const [slot, { title, time }] of mealSchedule(
      profile.meals,
    ).entries()) {
      let components: Component[] = [];
      const breakfast = title === "Breakfast";
      const snack = title.toLowerCase().includes("snack");
      const recipe = choose(
        breakfast
          ? ["meal-oats-pb", "meal-curd-fruit", "meal-besan-cheela"]
          : snack
            ? [
                "meal-moong-chaat",
                "meal-chana-salad",
                "meal-peanut-sweetpotato",
              ]
            : [
                "meal-dal-rice",
                "meal-rajma-rice",
                "meal-chana-roti",
                "meal-toor-roti",
                "meal-moong-rice",
                "meal-quinoa-rajma",
              ],
        day + slot,
      );
      if (recipe)
        components = [{ foodId: recipe.id, grams: recipe.servingGrams || 100 }];
      else {
        const groups: [string[], number][] = breakfast
          ? [
              [["oats", "roti"], 50],
              [["curd", "tofu", "milk", "chana", "moong-cooked"], 150],
              [["banana", "apple", "papaya", "guava"], 100],
            ]
          : snack
            ? [
                [["apple", "banana", "guava", "papaya"], 120],
                [["curd", "tofu", "chana", "peanut", "almond"], 100],
              ]
            : [
                [
                  [
                    "lentils",
                    "moong-cooked",
                    "toor-cooked",
                    "rajma",
                    "chana",
                    "tofu",
                    "egg",
                    "chicken",
                    "fish",
                  ],
                  180,
                ],
                [["rice", "brown", "roti", "potato", "millet"], 150],
                [["spinach", "green-beans-cooked", "broccoli", "carrot"], 100],
                [["oil"], 5],
              ];
        for (const [ids, grams] of groups) {
          const food = choose(ids, day + slot);
          if (!food) continue;
          components.push({
            foodId: food.id,
            grams: ["peanut", "almond"].includes(food.id)
              ? 20
              : food.id === "roti"
                ? 60
                : grams,
          });
        }
        if (components.length < 2) return [];
      }
      for (const [position, item] of components.entries())
        plans.push({
          id: createId(),
          day,
          slot,
          title,
          time,
          ...item,
          position,
          notes:
            "Meal idea with illustrative portions; not matched to a personal calorie target. Adjust portions and dietary balance with qualified guidance where needed.",
        });
    }
  return plans;
}
