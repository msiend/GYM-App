import type { Profile, WorkoutPlan, SetLog, Session } from "./types";
import { exercises } from "../data/exercises";
export const uid = () => crypto.randomUUID();
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function eligible(p: Profile) {
  return exercises.filter(
    (e) =>
      (e.equipment === "Bodyweight" ||
        p.equipment === "Full gym" ||
        (p.equipment === "Dumbbells" && e.equipment === "Dumbbells") ||
        (p.equipment === "Bands" && e.equipment === "Bands")) &&
      !p.restrictions
        .toLowerCase()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .some((s) =>
          `${e.name} ${e.muscle} ${e.pattern}`.toLowerCase().includes(s),
        ),
  );
}
export function generatePlan(p: Profile): WorkoutPlan {
  const beginner = ["Complete beginner", "Less than 3 months"].includes(
    p.experience,
  );
  const count = beginner ? Math.min(3, p.days.length) : p.days.length;
  const split =
    count <= 3
      ? "Full body"
      : count === 4
        ? "Upper / lower"
        : "Push / pull / legs";
  const available = eligible(p).filter(
    (e) => !["Cardio", "Mobility", "Stretching"].includes(e.category),
  );
  const selectedDays = beginner
    ? Array.from(
        { length: count },
        (_, i) => p.days[Math.floor((i * p.days.length) / count)],
      )
    : p.days;
  const days = p.medical
    ? []
    : selectedDays.map((day, i) => {
        const focus =
          split === "Full body"
            ? "Full body"
            : split === "Upper / lower"
              ? i % 2
                ? "Lower body"
                : "Upper body"
              : ["Push", "Pull", "Legs"][i % 3];
        const patterns =
          focus === "Full body"
            ? ["Squat", "Push", "Pull", "Hinge", "Core"]
            : focus === "Upper body"
              ? ["Push", "Pull", "Push", "Isolation", "Core"]
              : focus === "Lower body"
                ? ["Squat", "Hinge", "Squat", "Isolation", "Core"]
                : focus === "Push"
                  ? ["Push", "Push", "Isolation", "Core"]
                  : focus === "Pull"
                    ? ["Pull", "Pull", "Isolation", "Core"]
                    : ["Squat", "Hinge", "Squat", "Core"];
        const seen = new Set<string>();
        const picked = patterns
          .map((pattern, j) => {
            const focusMuscles =
              focus === "Lower body" || focus === "Legs"
                ? ["Quadriceps", "Hamstrings", "Glutes", "Calves", "Abs"]
                : focus === "Push"
                  ? ["Chest", "Shoulders", "Triceps", "Abs"]
                  : focus === "Pull"
                    ? ["Back", "Biceps", "Forearms", "Abs"]
                    : focus === "Upper body"
                      ? [
                          "Chest",
                          "Back",
                          "Shoulders",
                          "Biceps",
                          "Triceps",
                          "Forearms",
                          "Abs",
                        ]
                      : null;
            const candidates = available.filter(
              (e) =>
                e.pattern === pattern &&
                !seen.has(e.id) &&
                (!focusMuscles || focusMuscles.includes(e.muscle)),
            );
            const exercise =
              candidates[(i + j) % Math.max(1, candidates.length)];
            if (exercise) seen.add(exercise.id);
            return exercise;
          })
          .filter((e) => !!e)
          .slice(0, Math.max(2, Math.floor((p.duration - 10) / 7)));
        return {
          day,
          focus,
          exercises: picked.map((e) => ({
            exerciseId: e.id,
            sets:
              beginner || p.age >= 65
                ? 2
                : p.goal === "Flexibility & endurance"
                  ? 2
                  : 3,
            reps:
              p.goal === "Strength building" && !beginner
                ? 6
                : e.pattern === "Core"
                  ? 20
                  : 12,
            rest: p.goal === "Strength building" ? 120 : 75,
          })),
        };
      });
  return { id: "current", created: localDate(), split, days };
}
export function nutrition(p: Profile) {
  const blocked = p.age < 18 || p.nutritionRisk || p.medical;
  const bmr =
    10 * p.weight +
    6.25 * p.height -
    5 * p.age +
    (p.gender === "Male" ? 5 : p.gender === "Female" ? -161 : -78);
  const maintenance = Math.round(bmr * p.activity);
  const kcal = Math.round(
    maintenance *
      (p.nutritionGoal === "Fat loss"
        ? 0.9
        : p.nutritionGoal === "Muscle building"
          ? 1.05
          : 1),
  );
  const lean = p.bodyFat
    ? Math.round(p.weight * (1 - p.bodyFat / 100) * 10) / 10
    : null;
  const reference =
    p.proteinMethod === "Lean mass" && lean
      ? lean
      : p.proteinMethod === "Reference weight" && p.referenceWeight
        ? p.referenceWeight
        : p.weight;
  const factor = ["Muscle building", "Lean muscle building"].includes(
    p.nutritionGoal,
  )
    ? 1.6
    : 1.2;
  const protein = Math.round(reference * factor);
  const fat = Math.round((kcal * 0.3) / 9);
  return {
    blocked,
    bmr: Math.round(bmr),
    maintenance,
    kcal,
    lean,
    fatMass: lean ? p.weight - lean : null,
    protein,
    min: Math.round(reference * 1.2),
    max: Math.round(reference * 2),
    perMeal: Math.round(protein / p.meals),
    carbs: Math.round((kcal - protein * 4 - fat * 9) / 4),
    fat,
    reference,
    factor,
    method:
      p.proteinMethod === "Lean mass" && lean
        ? "Estimated lean mass"
        : p.proteinMethod === "Reference weight" && p.referenceWeight
          ? "Clinician-provided reference weight"
          : "Total body weight",
  };
}
export function progression(
  sessions: Session[],
  logs: SetLog[],
  exerciseId: string,
  repTarget: number,
) {
  const recent = sessions
    .filter((s) => s.status === "complete")
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((s) =>
      logs.some((l) => l.sessionId === s.id && l.exerciseId === exerciseId),
    )
    .slice(0, 2);
  const sets = logs.filter(
    (l) =>
      recent.some((s) => s.id === l.sessionId) && l.exerciseId === exerciseId,
  );
  if (sets.some((l) => l.pain))
    return "Stop painful movements and seek appropriate guidance before resuming.";
  if (sets.some((l) => l.rpe >= 9 || l.reps < repTarget - 3))
    return "Keep the load steady or reduce it. Prioritize technique and recovery.";
  if (
    recent.length === 2 &&
    sets.length >= 4 &&
    sets.every(
      (l) => l.done && l.reps >= repTarget && l.technique && l.rpe <= 8,
    ) &&
    new Set(sets.map((l) => l.weight)).size === 1
  )
    return "Two consistent sessions. Consider the smallest available load increase next time, only if technique and recovery feel good. You decide.";
  return "Build consistent, comfortable repetitions before increasing load. Leave 2–3 repetitions in reserve.";
}
