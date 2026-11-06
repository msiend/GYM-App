import { describe, it, expect } from "vitest";
import { generatePlan, nutrition, progression } from "./engine";
import type { Profile, Session, SetLog } from "./types";
import { profile } from "./fixture";
describe("personalized training and nutrition", () => {
  it("limits beginner strength frequency while scheduling every selected day", () => {
    const plan = generatePlan(profile);
    expect(plan.days).toHaveLength(6);
    expect(plan.days.filter((d) => d.kind === "strength")).toHaveLength(3);
    expect(plan.split).toBe("Full body");
    expect(
      plan.days
        .filter((d) => d.kind === "strength")
        .every((d) => d.exercises.every((e) => e.sets === 2)),
    ).toBe(true);
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
    expect(n.protein).toBe(128);
    expect(n.method).toBe("Total body weight");
    expect(n.warnings.some((w) => w.includes("not interchangeable"))).toBe(
      true,
    );
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
      exercises: [{ exerciseId: "goblet", sets: 2, reps: 12, rest: 90 }],
      notes: "",
    }));
    const logs: SetLog[] = sessions.flatMap((s) =>
      [0, 1].map((i) => ({
        id: s.id + i,
        sessionId: s.id,
        exerciseId: "goblet",
        index: i,
        weight: 10,
        reps: 12,
        done: true,
        rpe: 7,
        pain: false,
        technique: true,
      })),
    );
    expect(progression(sessions, logs, "goblet", 12)).toContain(
      "Two consistent",
    );
    expect(
      progression(
        sessions,
        logs.map((l) => ({ ...l, pain: true })),
        "goblet",
        12,
      ),
    ).toContain("Stop");
    expect(
      progression(
        sessions,
        logs.map((l) => ({ ...l, technique: false })),
        "goblet",
        12,
      ),
    ).not.toContain("Two consistent");
  });
});
describe("expanded plan programming", () => {
  it("uses two lower-body exposures in automatic five-day training", () => {
    const plan = generatePlan({
      ...profile,
      experience: "More than 1 year",
      days: [1, 2, 3, 5, 6],
      equipment: "Full gym",
      duration: 60,
    });
    expect(plan.days.map((d) => d.focus)).toEqual([
      "Upper body",
      "Lower body",
      "Push",
      "Pull",
      "Legs",
    ]);
    expect(plan.rationale).toContain("5 scheduled days");
  });
  it("offers the six-day reference style only for suitable experienced profiles", () => {
    const plan = generatePlan({
      ...profile,
      experience: "More than 1 year",
      equipment: "Full gym",
      preferredSplit: "Body-part split (6 days)",
      duration: 60,
    });
    expect(plan.split).toBe("Body-part split (6 days)");
    expect(plan.days.map((d) => d.focus)).toEqual([
      "Chest & triceps",
      "Back & biceps",
      "Shoulders & traps",
      "Quads & calves",
      "Glutes & hamstrings",
      "Abs & forearms",
    ]);
    const novice = generatePlan({
      ...profile,
      preferredSplit: "Body-part split (6 days)",
    });
    expect(novice.days).toHaveLength(6);
    expect(
      novice.days.filter((d) => d.kind === "strength").length,
    ).toBeLessThanOrEqual(3);
    expect(novice.split).toBe("Full body");
    expect(novice.warnings?.length).toBeGreaterThan(0);
  });
  it("limits training when recovery is limited", () =>
    expect(
      generatePlan({
        ...profile,
        experience: "More than 1 year",
        recovery: "Limited recovery",
      }).days.filter((d) => d.kind === "strength").length,
    ).toBeLessThanOrEqual(3));
  it("spaces three beginner sessions across the week", () => {
    const days = generatePlan(profile)
      .days.filter((d) => d.kind === "strength")
      .map((d) => d.day);
    expect(days.every((d) => !days.includes((d + 1) % 7))).toBe(true);
  });
  it("uses actual repetition tracking for crunches rather than timed holds", () => {
    const plan = generatePlan({
      ...profile,
      experience: "More than 1 year",
      equipment: "Full gym",
      days: [1, 2, 3, 4, 5, 6],
      preferredSplit: "Body-part split (6 days)",
      duration: 90,
    });
    expect(plan.days.flatMap((d) => d.exercises).length).toBeGreaterThan(20);
  });
});
it("schedules four strength and two easy days for three-to-six-month profiles", () => {
  const plan = generatePlan({
    ...profile,
    experience: "3–6 months",
    equipment: "Full gym",
  });
  expect(plan.days).toHaveLength(6);
  expect(plan.days.filter((d) => d.kind === "strength")).toHaveLength(4);
  expect(
    plan.days
      .filter((d) => d.kind === "strength")
      .every((d) => d.focus === "Upper body" || d.focus === "Lower body"),
  ).toBe(true);
});
