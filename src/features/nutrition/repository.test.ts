import "fake-indexeddb/auto";
import { beforeEach, expect, it } from "vitest";
import { db, repository } from "../../data/db";
import { importBackup } from "../../data/backup";
import { saveMealItem } from "./repository";
const base = {
  day: 5,
  slot: 1,
  title: "Lunch",
  time: "12:00",
  notes: "",
  grams: 100,
};
beforeEach(async () => {
  await repository.clear();
});
it("edits meal time for the full meal while retaining sibling portions and positions", async () => {
  await db.meals.bulkPut([
    { ...base, id: "a", foodId: "spinach", position: 0 },
    { ...base, id: "b", foodId: "brown", grams: 180, position: 1 },
  ]);
  await saveMealItem({
    ...base,
    id: "b",
    foodId: "brown",
    grams: 150,
    time: "13:30",
    position: 1,
  });
  expect((await db.meals.get("a"))?.time).toBe("13:30");
  expect((await db.meals.get("a"))?.grams).toBe(100);
  const backup = await repository.export();
  await repository.clear();
  await importBackup(JSON.stringify(backup));
  expect((await db.meals.get("b"))?.position).toBe(1);
  expect((await db.meals.get("b"))?.grams).toBe(150);
});
it("rejects invalid portions without changing saved meal records", async () => {
  await db.meals.put({ ...base, id: "a", foodId: "rice" });
  await expect(
    saveMealItem({ ...base, id: "a", foodId: "rice", grams: NaN }),
  ).rejects.toThrow();
  expect((await db.meals.get("a"))?.grams).toBe(100);
});
