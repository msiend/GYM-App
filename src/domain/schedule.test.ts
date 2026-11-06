import { describe, expect, it } from "vitest";
import { exerciseById } from "../data/exercises";
import { exerciseMinutes, generatePlan, scheduleCounts } from "./engine";
import { profile } from "./fixture";

describe("selected training days", () => {
  it.each([30, 45])(
    "honors all six beginner visits at %i minutes",
    (duration) => {
      const p = { ...profile, duration, days: [0, 1, 2, 3, 4, 6] };
      const plan = generatePlan(p);
      expect(scheduleCounts(plan)).toEqual({ total: 6, strength: 3, light: 3 });
      expect(plan.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 6, 0]);
      expect(plan.days.some((d) => d.day === 5)).toBe(false);
      for (const day of plan.days) {
        expect(day.exercises.length).toBeGreaterThan(0);
        expect(
          10 +
            day.exercises.reduce(
              (minutes, e) =>
                minutes + exerciseMinutes(e, exerciseById(e.exerciseId)),
              0,
            ),
        ).toBeLessThanOrEqual(duration);
        if (day.kind === "light") {
          expect(day.exercises.every((e) => e.sets === 1)).toBe(true);
          expect(
            day.exercises.every((e) =>
              ["Cardio", "Mobility", "Stretching"].includes(
                exerciseById(e.exerciseId).category,
              ),
            ),
          ).toBe(true);
        }
      }
    },
  );
  it.each([2, 3, 4, 5, 6])(
    "keeps exactly %i selected days at every experience level",
    (count) => {
      for (const experience of [
        "Complete beginner",
        "Less than 3 months",
        "3–6 months",
        "6–12 months",
        "More than 1 year",
      ]) {
        const days = [0, 2, 3, 4, 5, 6].slice(0, count);
        const plan = generatePlan({ ...profile, experience, days });
        expect(plan.days.map((d) => d.day).sort()).toEqual([...days].sort());
        expect(new Set(plan.days.map((d) => d.day)).size).toBe(count);
      }
    },
  );
  it("honors advanced six-day resistance training and limited-recovery choices", () => {
    const experienced = {
      ...profile,
      experience: "More than 1 year",
      equipment: "Full gym",
      duration: 30,
    };
    expect(scheduleCounts(generatePlan(experienced))).toEqual({
      total: 6,
      strength: 6,
      light: 0,
    });
    expect(
      scheduleCounts(
        generatePlan({ ...experienced, recovery: "Limited recovery" }),
      ),
    ).toEqual({ total: 6, strength: 3, light: 3 });
    expect(
      scheduleCounts(
        generatePlan({ ...experienced, preferredSplit: "Full body" }),
      ),
    ).toEqual({ total: 6, strength: 3, light: 3 });
    expect(
      scheduleCounts(
        generatePlan({ ...experienced, experience: "3–6 months" }),
      ),
    ).toEqual({ total: 6, strength: 4, light: 2 });
  });
  it("applies exclusions to easy days and retains health screening", () => {
    const p = { ...profile, restrictions: "walking" };
    const plan = generatePlan(p);
    expect(plan.days).toHaveLength(6);
    expect(
      plan.days
        .flatMap((d) => d.exercises)
        .some((e) => e.exerciseId === "walk"),
    ).toBe(false);
    for (const patch of [
      { medical: true },
      { age: 16 },
      { restrictions: "knee pain" },
    ])
      expect(generatePlan({ ...profile, ...patch }).days).toEqual([]);
  });
  it("understands existing plans with no day-kind metadata", () => {
    const plan = generatePlan({ ...profile, days: [1, 3, 5] });
    expect(
      scheduleCounts({ ...plan, days: plan.days.map(({ kind, ...d }) => d) }),
    ).toEqual({ total: 3, strength: 3, light: 0 });
  });
});
