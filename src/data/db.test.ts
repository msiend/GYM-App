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
describe("custom foods and versioned backups", () => {
  const custom = {
    id: "custom-soya",
    name: "My soya chunks",
    kcal: 340,
    protein: 50,
    carbs: 30,
    fat: 1,
    fiber: 10,
    state: "dry, as sold",
    diet: "Vegan",
    allergens: ["soy"],
    source: "User-entered product label",
    verification: "user-entered",
  };
  it("roundtrips custom foods and their intake references in v3", async () => {
    await db.customFoods.put(custom);
    await db.intake.put({
      id: "i",
      date: "2026-11-02",
      foodId: custom.id,
      grams: 50,
      meal: "Lunch",
    });
    const backup = await repository.export();
    expect(backup.version).toBe(3);
    await repository.clear();
    await importBackup(JSON.stringify(backup));
    expect((await db.customFoods.get(custom.id))?.protein).toBe(50);
    expect((await db.intake.get("i"))?.foodId).toBe(custom.id);
  });
  it("accepts existing v2 backups without a customFoods table", async () => {
    await db.profiles.put(profile);
    const backup = await repository.export();
    const legacy = { ...backup, version: 2 };
    delete legacy.data.customFoods;
    await db.customFoods.put(custom);
    await importBackup(JSON.stringify(legacy));
    expect(await db.customFoods.count()).toBe(0);
    expect((await db.profiles.get("me"))?.name).toBe("Test");
  });
  it("rejects invalid custom nutrient values without changing data", async () => {
    await db.profiles.put(profile);
    const backup = await repository.export();
    backup.data.customFoods = [{ ...custom, protein: 500 }];
    await expect(importBackup(JSON.stringify(backup))).rejects.toThrow();
    expect(await db.profiles.count()).toBe(1);
  });
});
describe("profile saves on local-IP browsers", () => {
  it("saves profile, plan and starting weight when randomUUID is unavailable; edits do not duplicate weight records", async () => {
    const original = globalThis.crypto;
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", {
      value: { getRandomValues: original.getRandomValues.bind(original) },
      configurable: true,
    });
    try {
      const { saveProfileAndPlan } = await import("./profile-repository");
      await saveProfileAndPlan(profile);
      expect((await db.profiles.get("me"))?.name).toBe("Test");
      expect(await db.plans.count()).toBe(1);
      expect(await db.weights.count()).toBe(1);
      await saveProfileAndPlan({ ...profile, name: "Updated" });
      expect((await db.profiles.get("me"))?.name).toBe("Updated");
      expect(await db.weights.count()).toBe(1);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
    }
  });
});
