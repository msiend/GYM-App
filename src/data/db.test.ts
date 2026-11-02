import "fake-indexeddb/auto";
import { beforeEach, describe, it, expect } from "vitest";
import { db, repository } from "./db";
import { importBackup } from "./backup";
import { profile } from "../domain/fixture";
import { allowedFoods } from "./foods";
beforeEach(async () => {
  await repository.clear();
});
describe("local data and backups", () => {
  it("persists profile and a set then roundtrips JSON", async () => {
    await db.profiles.put(profile);
    await db.sets.put({
      id: "a",
      sessionId: "s",
      exerciseId: "squat",
      index: 0,
      weight: 10,
      reps: 12,
      done: true,
      rpe: 7,
      pain: false,
      technique: true,
    });
    const json = JSON.stringify(await repository.export());
    await repository.clear();
    await importBackup(json);
    expect((await db.profiles.get("me"))?.name).toBe("Test");
    expect((await db.sets.get("a"))?.done).toBe(true);
  });
  it("rejects malformed or unknown references without clearing existing records", async () => {
    await db.profiles.put(profile);
    const backup = await repository.export();
    (backup.data as any).intake = [
      {
        id: "x",
        date: "2026-01-01",
        foodId: "unknown",
        grams: 100,
        meal: "Lunch",
      },
    ];
    await expect(importBackup(JSON.stringify(backup))).rejects.toThrow();
    expect(await db.profiles.count()).toBe(1);
    await expect(importBackup("{bad")).rejects.toThrow();
    expect(await db.profiles.count()).toBe(1);
  });
  it("filters dietary preferences and ingredient exclusions", () => {
    const list = allowedFoods("Vegan", "soy, peanuts", "rice");
    expect(list.length).toBeGreaterThan(0);
    expect(
      list.every(
        (f) =>
          f.diet === "Vegan" &&
          !f.allergens.includes("soy") &&
          !f.allergens.includes("peanuts") &&
          !f.name.toLowerCase().includes("rice"),
      ),
    ).toBe(true);
  });
});
