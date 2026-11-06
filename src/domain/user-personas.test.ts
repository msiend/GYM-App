import { describe, expect, it } from "vitest";
import { profile } from "./fixture";
import {
  eligible,
  exerciseMinutes,
  generatePlan,
  needsTrainingGuidance,
} from "./engine";
import { equipmentItems, hasEquipment, requiredEquipment } from "./equipment";
import { exerciseById, exercises } from "../data/exercises";
import {
  bodyParts,
  matchesBodyPart,
  matchesExerciseSearch,
} from "./body-parts";
import type { Profile } from "./types";

describe("partial gym and exercise discovery", () => {
  it("distinguishes machine variants rather than assuming one purchase supplies both", () => {
    const p: Profile = {
      ...profile,
      equipment: "Partial gym",
      experience: "More than 1 year",
      equipmentInventory: [
        "seated-leg-curl",
        "biceps-machine",
        "dip-bars",
        "seated-calf-machine",
        "cable",
      ],
    };
    for (const id of [
      "db-seated-leg-curl",
      "db-machine-bicep-curl",
      "db-dips---triceps-version",
      "db-seated-calf-raise",
    ])
      expect(hasEquipment(p, exerciseById(id)), id).toBe(true);
    for (const id of [
      "db-lying-leg-curls",
      "db-machine-triceps-extension",
      "db-dip-machine",
      "db-standing-calf-raises",
      "db-cable-crossover",
    ])
      expect(hasEquipment(p, exerciseById(id)), id).toBe(false);
    expect(
      hasEquipment(
        { ...p, equipmentInventory: ["dual-cable"] },
        exerciseById("db-face-pull"),
      ),
    ).toBe(true);
  });
  it("maps every gym exercise to known equipment or a confirmed bench", () => {
    for (const e of exercises.filter((e) => e.equipment === "Gym")) {
      expect(
        requiredEquipment(e).length > 0 ||
          e.id === "db-flat-bench-lying-leg-raise",
        e.id,
      ).toBe(true);
      for (const required of requiredEquipment(e))
        expect(equipmentItems.some((x) => x.id === required)).toBe(true);
    }
  });
  it("does not treat a partial gym as full gym access", () => {
    const p: Profile = {
      ...profile,
      equipment: "Partial gym",
      equipmentInventory: ["dumbbells", "pulldown", "leg-press"],
      supports: ["bench"],
    };
    const choices = eligible(p);
    expect(choices.some((e) => e.id === "press")).toBe(true);
    expect(choices.some((e) => e.id === "pulldown")).toBe(true);
    expect(choices.some((e) => e.id === "db-leg-press")).toBe(true);
    expect(
      choices.some(
        (e) =>
          e.id === "db-lying-leg-curls" ||
          e.id === "db-barbell-squat" ||
          e.id === "db-cable-crossover",
      ),
    ).toBe(false);
    expect(
      hasEquipment(
        { ...p, equipmentInventory: ["barbell", "rack"], supports: [] },
        exerciseById("db-barbell-bench-press---medium-grip"),
      ),
    ).toBe(false);
    expect(
      eligible({ ...p, equipmentInventory: [], supports: [] }).every(
        (e) => e.equipment === "Bodyweight",
      ),
    ).toBe(true);
  });
  it("filters by supporting muscles and searches Sanskrit/Hindi yoga names offline", () => {
    expect(matchesBodyPart(exerciseById("press"), "arms")).toBe(true);
    expect(matchesBodyPart(exerciseById("squat"), "thighs")).toBe(true);
    expect(matchesBodyPart(exerciseById("squat"), "chest")).toBe(false);
    expect(
      matchesExerciseSearch(exerciseById("yoga-mountain"), "ताड़ासन"),
    ).toBe(true);
    expect(matchesExerciseSearch(exerciseById("yoga-child"), "Balasana")).toBe(
      true,
    );
    for (const group of bodyParts)
      expect(exercises.some((e) => matchesBodyPart(e, group.id))).toBe(true);
    expect(exercises.filter((e) => e.category === "Yoga")).toHaveLength(8);
    expect(
      generatePlan({
        ...profile,
        equipment: "Full gym",
        goal: "Flexibility & endurance",
      })
        .days.flatMap((d) => d.exercises)
        .every((e) => exerciseById(e.exerciseId).category !== "Yoga"),
    ).toBe(true);
  });
});

describe("representative user profile matrix", () => {
  it("checks 6,000 profiles across age, gender, experience, goal, equipment and recovery", () => {
    let count = 0;
    const configurations: Partial<Profile>[] = [
      { equipment: "Full gym" },
      {
        equipment: "Partial gym",
        equipmentInventory: ["dumbbells", "pulldown", "leg-press"],
        supports: ["bench"],
      },
      { equipment: "Partial gym", equipmentInventory: [] },
      { equipment: "Bands", supports: ["anchor"] },
      { equipment: "Dumbbells", supports: ["bench"] },
      { equipment: "Dumbbells", supports: [] },
      { equipment: "Home workout" },
      { equipment: "Limited equipment" },
    ];
    for (const age of [16, 18, 35, 65, 80])
      for (const gender of ["Female", "Male", "Prefer not to say"])
        for (const experience of [
          "Complete beginner",
          "Less than 3 months",
          "3–6 months",
          "6–12 months",
          "More than 1 year",
        ])
          for (const goal of [
            "General fitness",
            "Fat loss",
            "Muscle building",
            "Strength building",
            "Flexibility & endurance",
          ] as const)
            for (const equipment of configurations)
              for (const recovery of ["Normal recovery", "Limited recovery"]) {
                const available = 2 + (count % 5);
                const p: Profile = {
                  ...profile,
                  ...equipment,
                  age,
                  gender,
                  experience,
                  goal,
                  recovery,
                  duration: [20, 30, 45, 60, 75, 90][count % 6],
                  days: Array.from({ length: available }, (_, i) => i + 1),
                };
                const plan = generatePlan(p);
                if (age < 18) expect(plan.days).toHaveLength(0);
                else {
                  const cap =
                    experience === "Complete beginner" ||
                    experience === "Less than 3 months" ||
                    recovery === "Limited recovery"
                      ? 3
                      : experience === "3–6 months"
                        ? 4
                        : 6;
                  expect(plan.days).toHaveLength(available);
                  expect(
                    plan.days.filter((d) => d.kind === "strength").length,
                  ).toBeLessThanOrEqual(Math.min(available, cap));
                  for (const day of plan.days) {
                    expect(p.days).toContain(day.day);
                    const minutes =
                      10 +
                      day.exercises.reduce(
                        (sum, item) =>
                          sum +
                          exerciseMinutes(item, exerciseById(item.exerciseId)),
                        0,
                      );
                    expect(minutes).toBeLessThanOrEqual(p.duration);
                    for (const item of day.exercises) {
                      const e = exerciseById(item.exerciseId);
                      expect(hasEquipment(p, e)).toBe(true);
                      if (day.kind === "light")
                        expect(["Cardio", "Mobility", "Stretching"]).toContain(
                          e.category,
                        );
                      else
                        expect([
                          "Yoga",
                          "Cardio",
                          "Mobility",
                          "Stretching",
                        ]).not.toContain(e.category);
                      if (age >= 65 || recovery === "Limited recovery")
                        expect(item.sets).toBeLessThanOrEqual(2);
                    }
                  }
                }
                count++;
              }
    expect(count).toBe(6000);
  }, 30000);
  it("handles restriction wording and health screening without treating 'no pain' as a diagnosis", () => {
    for (const restrictions of ["none", "No pain", "no injuries", "N/A"])
      expect(needsTrainingGuidance({ ...profile, restrictions })).toBe(false);
    expect(
      eligible({
        ...profile,
        equipment: "Full gym",
        restrictions: "avoid squats; no plank",
      }).every(
        (e) => !e.name.toLowerCase().includes("squat") && e.id !== "plank",
      ),
    ).toBe(true);
    for (const patch of [
      { medical: true },
      { nutritionRisk: true },
      { restrictions: "back pain" },
      { restrictions: "shoulder injury" },
      { age: 16 },
    ])
      expect(generatePlan({ ...profile, ...patch }).days).toHaveLength(0);
  });
});
