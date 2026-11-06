import { describe, it, expect } from "vitest";
import {
  eligible,
  exerciseMinutes,
  generatePlan,
  needsTrainingGuidance,
  prescribeExercise,
  progression,
  replacementOptions,
  PROGRAM_VERSION,
} from "./engine";
import { exercises, exerciseById } from "../data/exercises";
import { profile } from "./fixture";
import type { Profile, Session, SetLog } from "./types";

describe("catalog technique and metadata corrections", () => {
  it("corrects adduction direction, misleading labels and knee-travel claims", () => {
    const adduction = exerciseById("db-band-hip-adductions").instructions.join(
      " ",
    );
    expect(adduction).toContain("inward");
    expect(adduction).toContain("midline");
    expect(
      exerciseById("db-dumbbell-seated-one-leg-calf-raise").instructions.join(
        " ",
      ),
    ).toContain("heel, not the toes");
    expect(exerciseById("db-cable-seated-lateral-raise").name).toContain(
      "reverse fly",
    );
    expect(exerciseById("db-dumbbell-floor-press").muscle).toBe("Chest");
    const all = exercises.flatMap((e) => e.instructions).join(" ");
    expect(all).not.toMatch(
      /knees are past your toes.*undue stress|allow the weight to hyperextend|hold your breath as you lower|hands about 36 inches|raise your toes up as high/i,
    );
  });
  it("keeps IDs, complete instructions and valid categories across all 132 records", () => {
    expect(exercises).toHaveLength(132);
    expect(new Set(exercises.map((e) => e.id)).size).toBe(132);
    for (const e of exercises) {
      expect(e.instructions.length).toBeGreaterThanOrEqual(2);
      expect(e.instructions.every((s) => s.trim().length > 15)).toBe(true);
      expect(e.secondary).not.toContain(e.muscle);
      expect(new Set(e.secondary).size).toBe(e.secondary.length);
      if (e.pattern === "Isolation") expect(e.category).toBe("Isolation");
      expect(e.source).toBeTruthy();
    }
    for (const id of [
      "plank",
      "grip",
      "stretch",
      "walk",
      "march",
      "db-triceps-stretch",
      "db-bicycling-stationary",
    ])
      expect(exerciseById(id).tracking).toBe("seconds");
  });
  it("does not assign demanding bodyweight or barbell lifts to complete beginners", () => {
    const ids = eligible({ ...profile, equipment: "Full gym" }).map(
      (e) => e.id,
    );
    for (const id of [
      "db-pullups",
      "db-dips---triceps-version",
      "db-barbell-squat",
      "db-barbell-bench-press---medium-grip",
      "db-push-ups-with-feet-elevated",
      "db-band-good-morning",
    ])
      expect(ids).not.toContain(id);
  });
});

describe("equipment, time and movement coverage", () => {
  it("requires confirmed supports and keeps setup-sensitive references out of automatic plans", () => {
    const dumbbells = { ...profile, equipment: "Dumbbells" };
    expect(eligible(dumbbells).some((e) => e.requires?.length)).toBe(false);
    expect(
      eligible({ ...dumbbells, supports: ["bench"] }).some(
        (e) => e.id === "press",
      ),
    ).toBe(true);
    expect(
      eligible({ ...profile, equipment: "Bands" }).some(
        (e) => e.id === "bandrow",
      ),
    ).toBe(false);
    expect(
      eligible({ ...profile, equipment: "Bands", supports: ["anchor"] }).some(
        (e) => e.id === "bandrow",
      ),
    ).toBe(true);
    expect(
      eligible({
        ...profile,
        equipment: "Full gym",
        experience: "More than 1 year",
      }).every((e) => e.automatic !== false),
    ).toBe(true);
  });
  it("only offers replacements for compatible movement and muscle focus", () => {
    const alternatives = replacementOptions(
      { ...profile, equipment: "Full gym" },
      exerciseById("press"),
    );
    expect(alternatives.length).toBeGreaterThan(0);
    expect(
      alternatives.every((e) => e.pattern === "Push" && e.muscle === "Chest"),
    ).toBe(true);
    expect(
      alternatives.some(
        (e) => e.category === "Cardio" || e.muscle === "Shoulders",
      ),
    ).toBe(false);
  });
  it("accounts for both sides and longer strength rest without exceeding available time", () => {
    let checked = 0;
    for (const equipment of [
      "Full gym",
      "Dumbbells",
      "Bands",
      "Bodyweight",
      "Home workout",
      "Limited equipment",
    ])
      for (const duration of [20, 30, 45, 60, 75, 90])
        for (const experience of ["Complete beginner", "More than 1 year"])
          for (const goal of ["General fitness", "Strength building"] as const)
            for (const count of [2, 3, 4, 5, 6]) {
              const p: Profile = {
                ...profile,
                equipment,
                duration,
                experience,
                goal,
                days: Array.from({ length: count }, (_, i) => i + 1),
              };
              const plan = generatePlan(p);
              expect(plan.version).toBe(PROGRAM_VERSION);
              for (const day of plan.days) {
                expect(p.days).toContain(day.day);
                const estimate =
                  10 +
                  day.exercises.reduce(
                    (sum, item) =>
                      sum +
                      exerciseMinutes(item, exerciseById(item.exerciseId)),
                    0,
                  );
                expect(estimate).toBeLessThanOrEqual(duration);
                expect(day.estimatedMinutes).toBe(Math.ceil(estimate));
                for (const item of day.exercises) {
                  const e = exerciseById(item.exerciseId);
                  expect(eligible(p).some((x) => x.id === e.id)).toBe(true);
                  if (day.kind === "light")
                    expect(["Cardio", "Mobility", "Stretching"]).toContain(
                      e.category,
                    );
                  else
                    expect(["Cardio", "Mobility", "Stretching"]).not.toContain(
                      e.category,
                    );
                  if (
                    goal === "Strength building" &&
                    experience === "More than 1 year" &&
                    e.category === "Compound" &&
                    ["Push", "Pull", "Squat", "Hinge"].includes(e.pattern)
                  )
                    expect(item.rest).toBeGreaterThanOrEqual(120);
                }
              }
              checked++;
            }
    expect(checked).toBe(720);
    const item = { exerciseId: "row", sets: 2, reps: 12, rest: 90 };
    const row = exerciseById("row");
    expect(exerciseMinutes(item, row)).toBeGreaterThan(
      exerciseMinutes(item, { ...row, unilateral: false }),
    );
  });
  it("withholds adult automatic programs for health flags and under-18 profiles", () => {
    for (const patch of [
      { age: 16 },
      { medical: true },
      { restrictions: "back pain" },
      { restrictions: "घुटने में दर्द" },
    ]) {
      const p = { ...profile, ...patch };
      expect(needsTrainingGuidance(p)).toBe(true);
      expect(generatePlan(p).days).toEqual([]);
    }
    expect(
      needsTrainingGuidance({ ...profile, restrictions: "squat, shoulders" }),
    ).toBe(false);
    expect(
      generatePlan({ ...profile, days: [1, 1, 3, 5] }).days.map((d) => d.day),
    ).toEqual([1, 3, 5]);
  });
});

describe("conservative progression", () => {
  const sessions: Session[] = [1, 2].map((i) => ({
    id: String(i),
    date: `2026-11-0${i}`,
    status: "complete",
    focus: "Full body",
    notes: "",
    exercises: [{ exerciseId: "goblet", sets: 3, reps: 12, rest: 90 }],
  }));
  const logs: SetLog[] = sessions.flatMap((s) =>
    [0, 1, 2].map((index) => ({
      id: s.id + index,
      sessionId: s.id,
      exerciseId: "goblet",
      index,
      weight: 10,
      reps: 12,
      rpe: 7,
      done: true,
      pain: false,
      technique: true,
    })),
  );
  it("suggests a choice only after all prescribed sets on two separate days", () => {
    expect(progression(sessions, logs, "goblet", 12)).toContain(
      "Two consistent",
    );
    // Five total logs used to pass even though one prescribed set was missing.
    expect(progression(sessions, logs.slice(1), "goblet", 12)).not.toContain(
      "Two consistent",
    );
    expect(
      progression(
        sessions.map((s) => ({ ...s, date: "2026-11-02" })),
        logs,
        "goblet",
        12,
      ),
    ).not.toContain("Two consistent");
    expect(progression(sessions, logs, "goblet", 15)).not.toContain(
      "Two consistent",
    );
    expect(
      progression(
        sessions,
        logs.map((l) => ({ ...l, weight: 0 })),
        "goblet",
        12,
      ),
    ).not.toContain("Two consistent");
    expect(
      progression(sessions, logs, "goblet", 12, { recoveryLimited: true }),
    ).not.toContain("Two consistent");
  });
  it("does not use earlier good sessions to hide a skipped session or a volume change", () => {
    expect(
      progression(sessions, logs, "goblet", 12, { prescribedSets: 4 }),
    ).not.toContain("Two consistent");
    const skipped = { ...sessions[0], id: "skipped", date: "2026-11-03" };
    expect(
      progression([...sessions, skipped], logs, "goblet", 12),
    ).not.toContain("Two consistent");
  });
  it("prioritizes current pain, and does not apply kilogram progression to holds or bands", () => {
    const active = { ...sessions[0], id: "active", status: "active" as const };
    expect(
      progression(
        [...sessions, active],
        [...logs, { ...logs[0], sessionId: "active", pain: true }],
        "goblet",
        12,
      ),
    ).toContain("Stop painful");
    expect(progression(sessions, logs, "plank", 20)).toContain("timed hold");
    expect(progression(sessions, logs, "bandrow", 12)).toContain(
      "kilogram-based",
    );
  });
  it("uses lower beginner volume and avoids heavy low-rep core/isolation prescriptions", () => {
    const p = {
      ...profile,
      goal: "Strength building" as const,
      experience: "More than 1 year",
    };
    expect(
      prescribeExercise(p, exerciseById("db-external-rotation-with-band")).reps,
    ).toBe(15);
    expect(prescribeExercise(p, exerciseById("bird")).reps).toBe(8);
    expect(
      prescribeExercise({ ...p, duration: 20 }, exerciseById("goblet")).sets,
    ).toBe(2);
  });
});
