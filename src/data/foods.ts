import additional from "./indian-foods.json";
import starter from "./starter-foods.json";
import type { Food } from "../domain/types";

export const foods: Food[] = [
  ...(starter as Food[]),
  ...(additional as Food[]),
];
const allergenNames = [
  ["milk", "dairy", "lactose", "दूध"],
  ["peanut", "peanuts", "groundnut", "groundnuts", "मूंगफली"],
  ["soy", "soya", "soybean", "soybeans", "सोया"],
  [
    "nuts",
    "tree nuts",
    "almond",
    "almonds",
    "cashew",
    "cashews",
    "walnut",
    "walnuts",
  ],
  ["egg", "eggs", "अंडा"],
  ["gluten", "wheat", "गेहूं"],
  ["fish", "salmon", "tuna", "tilapia"],
  ["shellfish", "shrimp", "prawn", "prawns"],
];
const tokens = (value: string) =>
  value
    .toLowerCase()
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
export function allowedFoods(
  diet: string,
  allergies: string,
  dislikes = "",
  library: Food[] = foods,
) {
  const allergyTokens = tokens(allergies);
  const exclusions = [
    ...new Set([
      ...allergyTokens.flatMap(
        (token) =>
          allergenNames.find((names) => names.includes(token)) || [token],
      ),
      ...tokens(dislikes),
    ]),
  ];
  const byId = new Map(library.map((food) => [food.id, food]));
  function allowed(food: Food, seen = new Set<string>()): boolean {
    if (seen.has(food.id)) return false;
    const text = [food.name, ...(food.aliases || []), ...food.allergens]
      .join(" ")
      .toLowerCase();
    if (exclusions.some((token) => text.includes(token))) return false;
    if (
      !(
        food.diet === "Vegan" ||
        diet === "Non-vegetarian" ||
        diet === food.diet ||
        (["Eggetarian", "Pescatarian"].includes(diet) &&
          food.diet === "Vegetarian") ||
        (diet === "Pescatarian" && food.diet === "Eggetarian")
      )
    )
      return false;
    const next = new Set(seen).add(food.id);
    return (
      !food.recipe ||
      food.recipe.every((item) => {
        const ingredient = byId.get(item.foodId);
        return !!ingredient && allowed(ingredient, next);
      })
    );
  }
  return library.filter((food) => allowed(food));
}
