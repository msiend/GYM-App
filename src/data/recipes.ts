import type { Food } from "../domain/types";
import { foods } from "./foods";
const definitions = [
  {
    id: "meal-dal-rice",
    name: "Dal, rice & palak bowl",
    items: [
      ["lentils", 200],
      ["rice", 150],
      ["spinach", 100],
      ["oil", 5],
    ],
    aliases: ["dal chawal", "दाल चावल"],
  },
  {
    id: "meal-rajma-rice",
    name: "Rajma chawal bowl",
    items: [
      ["rajma", 200],
      ["rice", 150],
      ["tomato", 50],
      ["onion", 20],
      ["oil", 5],
    ],
    aliases: ["rajma rice", "राजमा चावल"],
  },
  {
    id: "meal-chana-roti",
    name: "Chana, roti & curd plate",
    items: [
      ["chana", 180],
      ["roti", 60],
      ["curd", 100],
      ["onion", 20],
    ],
    aliases: ["chole roti", "चना रोटी"],
  },
  {
    id: "meal-moong-chaat",
    name: "Cooked sprouted moong chaat",
    items: [
      ["moong-sprouts-cooked", 150],
      ["tomato", 50],
      ["cucumber", 50],
      ["onion", 20],
      ["oil", 5],
    ],
    aliases: ["sprouts chaat", "moong salad"],
  },
  {
    id: "meal-oats-pb",
    name: "Oats, milk, banana & peanut butter",
    items: [
      ["oats", 50],
      ["milk", 200],
      ["banana", 100],
      ["peanut-butter", 15],
    ],
    aliases: ["oats breakfast"],
  },
  {
    id: "meal-besan-cheela",
    name: "Besan cheela (illustrative recipe)",
    items: [
      ["besan", 60],
      ["onion", 30],
      ["tomato", 30],
      ["oil", 5],
    ],
    yield: 200,
    aliases: ["besan chilla", "बेसन चीला"],
  },
  {
    id: "meal-moong-rice",
    name: "Plain cooked moong & rice",
    items: [
      ["moong-cooked", 200],
      ["rice", 150],
      ["carrot", 60],
      ["oil", 5],
    ],
    aliases: ["moong rice", "khichdi-style bowl"],
  },
  {
    id: "meal-chana-salad",
    name: "Chana & cucumber salad",
    items: [
      ["chana", 180],
      ["cucumber", 80],
      ["tomato", 60],
      ["onion", 20],
      ["lemon", 15],
      ["oil", 5],
    ],
    aliases: ["chana chaat", "chickpea salad"],
  },
  {
    id: "meal-toor-roti",
    name: "Toor dal, roti & cooked vegetables",
    items: [
      ["toor-cooked", 180],
      ["roti", 60],
      ["green-beans-cooked", 100],
      ["oil", 5],
    ],
    aliases: ["arhar dal roti", "dal roti"],
  },
  {
    id: "meal-quinoa-rajma",
    name: "Quinoa & rajma bowl",
    items: [
      ["quinoa-cooked", 150],
      ["rajma", 150],
      ["tomato", 60],
      ["cucumber", 60],
      ["oil", 5],
    ],
    aliases: ["quinoa beans"],
  },
  {
    id: "meal-curd-fruit",
    name: "Curd, papaya & chia bowl",
    items: [
      ["yogurt-lowfat", 200],
      ["papaya", 120],
      ["chia", 10],
    ],
    aliases: ["dahi fruit bowl", "papaya curd"],
  },
  {
    id: "meal-peanut-sweetpotato",
    name: "Sweet potato & peanut chaat",
    items: [
      ["sweet-potato", 200],
      ["peanut", 20],
      ["onion", 20],
      ["lemon", 15],
    ],
    aliases: ["shakarkandi chaat", "sweet potato chaat"],
  },
] as const;
export const indianMeals: Food[] = definitions.map((def) => {
  const ingredients = def.items.map(([foodId, grams]) => ({ foodId, grams }));
  const yieldGrams =
    "yield" in def ? def.yield : ingredients.reduce((s, i) => s + i.grams, 0);
  const base = {
    id: def.id,
    name: def.name,
    state: "recipe estimate; quantities and cooked yield vary",
    diet: ingredients.some(
      (i) => foods.find((f) => f.id === i.foodId)?.diet === "Vegetarian",
    )
      ? "Vegetarian"
      : "Vegan",
    allergens: [
      ...new Set(
        ingredients.flatMap(
          (i) => foods.find((f) => f.id === i.foodId)!.allergens,
        ),
      ),
    ],
    source: `Calculated from listed USDA ingredient references. One illustrative batch = ${yieldGrams} g. Includes the listed oil only; change your portion or save your own label/recipe values.`,
    verification: "recipe-estimate",
    aliases: [...def.aliases],
    recipe: ingredients,
    servingGrams: yieldGrams,
  };
  const nutrients = Object.fromEntries(
    ["kcal", "protein", "carbs", "fat", "fiber"].map((key) => [
      key,
      Math.round(
        (ingredients.reduce(
          (s, i) =>
            s +
            (foods.find((f) => f.id === i.foodId)![key as "kcal"] * i.grams) /
              100,
          0,
        ) /
          yieldGrams) *
          10000,
      ) / 100,
    ]),
  );
  return { ...base, ...nutrients } as Food;
});
export const labelTemplates = [
  {
    name: "Soya chunks",
    aliases: "soy chunks, soy nuggets, meal maker",
    diet: "Vegan",
    allergens: "soy",
    state: "dry, as sold",
  },
  {
    name: "Paneer",
    aliases: "Indian cottage cheese",
    diet: "Vegetarian",
    allergens: "milk",
    state: "as sold",
  },
  {
    name: "Poha / flattened rice",
    aliases: "poha, chivda",
    diet: "Vegan",
    allergens: "",
    state: "dry, as sold",
  },
];
