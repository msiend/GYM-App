import { db } from "../../data/db";
import type { MealPlan } from "../../domain/types";
export function validPortion(grams: number) {
  return Number.isFinite(grams) && grams >= 1 && grams <= 2000;
}
export async function saveMealItem(item: MealPlan) {
  if (!validPortion(item.grams)) throw new Error("Invalid meal portion");
  await db.transaction("rw", db.meals, async () => {
    await db.meals
      .filter((row) => row.day === item.day && row.slot === item.slot)
      .modify({ time: item.time });
    await db.meals.put(item);
  });
}
