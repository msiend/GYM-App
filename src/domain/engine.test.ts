import { describe, it, expect, beforeEach } from "vitest";
import { generatePlan, nutrition, progression } from "./engine";
import type { Profile, Session, SetLog } from "./types";
import { profile } from "./fixture";
describe("personalized training and nutrition", () => {
  it("caps beginner frequency and uses full-body sessions", () => {
    const plan = generatePlan(profile);
    expect(plan.days).toHaveLength(3);
    expect(plan.split).toBe("Full body");
    expect(plan.days.every((d) => d.exercises.every((e) => e.sets === 2))).toBe(
      true,
    );
  });
  it("uses equipment and movement restrictions", () => {
    const plan = generatePlan({ ...profile, restrictions: "squat,plank" });
    expect(
      plan.days.every((d) =>
        d.exercises.every(
          (e) =>
            !["squat", "goblet", "plank", "press", "row", "pulldown"].includes(
              e.exerciseId,
            ),
        ),
      ),
    ).toBe(true);
  });
  it("selects upper/lower for experienced four-day training", () =>
    expect(
      generatePlan({
        ...profile,
        experience: "More than 1 year",
        days: [1, 2, 4, 5],
      }).split,
    ).toBe("Upper / lower"));
  it("withholds plans after medical screening", () =>
    expect(generatePlan({ ...profile, medical: true }).days).toEqual([]));
  it("calculates Mifflin, lean mass and conservative surplus", () => {
    const n = nutrition({
      ...profile,
      bodyFat: 25,
      proteinMethod: "Lean mass",
    });
    expect(n.bmr).toBe(1780);
    expect(n.lean).toBe(60);
    expect(n.protein).toBe(96);
    expect(n.kcal).toBe(Math.round(Math.round(1780 * 1.375) * 1.05));
  });
  it.each([{ age: 16 }, { nutritionRisk: true }, { medical: true }])(
    "blocks unrestricted nutrition for %o",
    (patch) => expect(nutrition({ ...profile, ...patch }).blocked).toBe(true),
  );
  it("does not invent lean mass when unavailable", () =>
    expect(nutrition(profile).lean).toBeNull());
  it("requires two completed sessions and good technique before progression", () => {
    const sessions: Session[] = [1, 2].map((i) => ({
      id: String(i),
      date: `2026-01-0${i}`,
      focus: "Full body",
      status: "complete",
      exercises: [],
      notes: "",
    }));
    const logs: SetLog[] = sessions.flatMap((s) =>
      [0, 1].map((i) => ({
        id: s.id + i,
        sessionId: s.id,
        exerciseId: "squat",
        index: i,
        weight: 10,
        reps: 12,
        done: true,
        rpe: 7,
        pain: false,
        technique: true,
      })),
    );
    expect(progression(sessions, logs, "squat", 12)).toContain(
      "Two consistent",
    );
    expect(
      progression(
        sessions,
        logs.map((l) => ({ ...l, pain: true })),
        "squat",
        12,
      ),
    ).toContain("Stop");
    expect(
      progression(
        sessions,
        logs.map((l) => ({ ...l, technique: false })),
        "squat",
        12,
      ),
    ).not.toContain("Two consistent");
  });
});
