import type { Profile, WorkoutPlan, SetLog, Session } from "./types";
import { exercises } from "../data/exercises";
export const uid = () => crypto.randomUUID();
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const splitOptions = [
  "Automatic",
  "Full body",
  "Upper / lower",
  "Push / pull / legs",
  "Body-part split (6 days)",
];
export function eligible(p: Profile) {
  const excluded = p.restrictions
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return exercises.filter(
    (e) =>
      (e.equipment === "Bodyweight" ||
        p.equipment === "Full gym" ||
        p.equipment === e.equipment) &&
      !excluded.some((s) =>
        `${e.name} ${e.muscle} ${e.secondary.join(" ")} ${e.pattern}`
          .toLowerCase()
          .includes(s),
      ) &&
      (!["Complete beginner", "Less than 3 months"].includes(p.experience) ||
        e.difficulty === "Beginner"),
  );
}
/** Pick the best-spaced available days, including the Sunday/Monday boundary. */
function spacedDays(available: number[], count: number) {
  let best = available.slice(0, count),
    score = -Infinity;
  for (let bits = 0; bits < 1 << available.length; bits++) {
    const subset = available.filter((_, i) => bits & (1 << i));
    if (subset.length !== count) continue;
    const sorted = [...subset].sort((a, b) => a - b);
    const gaps = sorted.map(
      (d, i) => (sorted[(i + 1) % sorted.length] - d + 7) % 7 || 7,
    );
    const value = Math.min(...gaps) * 100 - gaps.reduce((s, g) => s + g * g, 0);
    if (value > score) {
      score = value;
      best = subset;
    }
  }
  return best;
}
type Slot = { pattern?: string; muscles: string[] };
const slot = (muscles: string[], pattern?: string): Slot => ({
  muscles,
  pattern,
});
export function generatePlan(p: Profile): WorkoutPlan {
  const beginner = ["Complete beginner", "Less than 3 months"].includes(
    p.experience,
  );
  const early = p.experience === "3–6 months";
  const lowRecovery = p.recovery === "Limited recovery";
  let count = Math.min(
    p.days.length,
    beginner || lowRecovery ? 3 : early ? 4 : 6,
  );
  const warnings: string[] = [];
  if (count < p.days.length)
    warnings.push(
      `${p.days.length} days are available, but ${count} resistance sessions are used for experience/recovery. Other days can be rest or gentle activity.`,
    );
  let split =
    count <= 3
      ? "Full body"
      : count === 4
        ? "Upper / lower"
        : count === 5
          ? "Upper / lower + push / pull / legs"
          : "Push / pull / legs";
  const preference = p.preferredSplit || "Automatic";
  if (preference === "Full body") {
    count = Math.min(count, 3);
    split = "Full body";
  } else if (preference === "Upper / lower" && count >= 4)
    split = "Upper / lower";
  else if (preference === "Push / pull / legs" && count >= 5)
    split =
      count === 5 ? "Upper / lower + push / pull / legs" : "Push / pull / legs";
  else if (
    preference === "Body-part split (6 days)" &&
    count === 6 &&
    p.experience === "More than 1 year" &&
    !lowRecovery
  ) {
    split = preference;
    warnings.push(
      "This six-day body-part option follows your preference. Chest, shoulder and triceps sessions overlap; monitor recovery and add rest when needed. It is not inherently better than full-body or upper/lower training.",
    );
  } else if (preference !== "Automatic" && preference !== "Full body")
    warnings.push(
      `The requested ${preference.toLowerCase()} does not fit the current experience, days or recovery. A suitable ${split.toLowerCase()} plan is used instead.`,
    );
  const chosen =
    count <= 3
      ? spacedDays(p.days, count)
      : [...p.days]
          .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
          .slice(0, count);
  if (
    chosen.some((d, i) =>
      chosen.some((other, j) => i !== j && (other - d + 7) % 7 === 1),
    ) &&
    split === "Full body"
  )
    warnings.push(
      "Some available days are consecutive. Space resistance sessions out where possible, or reduce effort when recovery is incomplete.",
    );
  const pool = eligible(p).filter(
    (e) => !["Cardio", "Mobility", "Stretching"].includes(e.category),
  );
  const chest = slot(["Chest"], "Push"),
    back = slot(["Back"], "Pull"),
    shoulder = slot(["Shoulders"], "Push"),
    quad = slot(["Quadriceps"], "Squat"),
    hinge = slot(["Hamstrings", "Glutes"], "Hinge"),
    core = slot(["Abs"], "Core");
  const isolate = (muscles: string[]) => slot(muscles, "Isolation");
  const focuses =
    split === "Full body"
      ? Array(count).fill("Full body")
      : split === "Body-part split (6 days)"
        ? [
            "Chest & triceps",
            "Back & biceps",
            "Shoulders & traps",
            "Quads & calves",
            "Glutes & hamstrings",
            "Abs & forearms",
          ]
        : split === "Upper / lower + push / pull / legs"
          ? ["Upper body", "Lower body", "Push", "Pull", "Legs"]
          : split === "Upper / lower"
            ? Array.from({ length: count }, (_, i) =>
                i % 2 ? "Lower body" : "Upper body",
              )
            : Array.from(
                { length: count },
                (_, i) => ["Push", "Pull", "Legs"][i % 3],
              );
  const missing = new Set<string>();
  const days = p.medical
    ? []
    : chosen
        .map((day, i) => {
          const focus = focuses[i];
          const fullSlots =
            i % 2
              ? [
                  hinge,
                  back,
                  chest,
                  quad,
                  core,
                  isolate(["Shoulders", "Calves"]),
                ]
              : [
                  quad,
                  chest,
                  back,
                  hinge,
                  core,
                  isolate(["Biceps", "Triceps"]),
                ];
          const slots: Slot[] =
            focus === "Full body"
              ? fullSlots
              : focus === "Upper body"
                ? [
                    chest,
                    back,
                    shoulder,
                    isolate(["Biceps"]),
                    isolate(["Triceps"]),
                    core,
                  ]
                : focus === "Lower body" || focus === "Legs"
                  ? [
                      quad,
                      hinge,
                      isolate(["Quadriceps"]),
                      isolate(["Hamstrings"]),
                      isolate(["Calves"]),
                      core,
                    ]
                  : focus === "Push"
                    ? [
                        chest,
                        shoulder,
                        isolate(["Chest"]),
                        isolate(["Shoulders"]),
                        isolate(["Triceps"]),
                        core,
                      ]
                    : focus === "Pull"
                      ? [
                          back,
                          back,
                          isolate(["Shoulders"]),
                          isolate(["Biceps"]),
                          isolate(["Traps"]),
                          isolate(["Forearms"]),
                        ]
                      : focus === "Chest & triceps"
                        ? [
                            chest,
                            chest,
                            isolate(["Chest"]),
                            isolate(["Triceps"]),
                            core,
                          ]
                        : focus === "Back & biceps"
                          ? [
                              back,
                              back,
                              isolate(["Biceps"]),
                              isolate(["Forearms"]),
                              core,
                            ]
                          : focus === "Shoulders & traps"
                            ? [
                                shoulder,
                                isolate(["Shoulders"]),
                                isolate(["Shoulders"]),
                                isolate(["Traps"]),
                                core,
                              ]
                            : focus === "Quads & calves"
                              ? [
                                  quad,
                                  quad,
                                  isolate(["Quadriceps"]),
                                  isolate(["Calves"]),
                                  core,
                                ]
                              : focus === "Glutes & hamstrings"
                                ? [
                                    hinge,
                                    hinge,
                                    isolate(["Hamstrings"]),
                                    isolate(["Glutes"]),
                                    isolate(["Calves"]),
                                  ]
                                : [
                                    core,
                                    core,
                                    isolate(["Forearms"]),
                                    isolate(["Biceps"]),
                                    isolate(["Calves"]),
                                  ];
          const sets =
            beginner ||
            lowRecovery ||
            p.age >= 65 ||
            p.goal === "Flexibility & endurance"
              ? 2
              : 3;
          const rest = p.goal === "Strength building" ? 120 : 75;
          const minutesPerExercise = (sets * 40 + (sets - 1) * rest + 30) / 60;
          const capacity = Math.max(
            2,
            Math.floor((p.duration - 8) / minutesPerExercise),
          );
          const picked: typeof exercises = [];
          for (const request of slots) {
            if (picked.length >= capacity) break;
            const candidates = pool.filter(
              (e) =>
                request.muscles.includes(e.muscle) &&
                (!request.pattern || e.pattern === request.pattern) &&
                !picked.some((x) => x.id === e.id),
            );
            if (!candidates.length) {
              missing.add(request.muscles.join("/"));
              continue;
            }
            const priorities = p.priorityMuscles || [];
            candidates.sort(
              (a, b) =>
                Number(priorities.includes(b.muscle)) -
                Number(priorities.includes(a.muscle)),
            );
            picked.push(candidates[(i + picked.length) % candidates.length]);
          }
          return {
            day,
            focus,
            exercises: picked.map((e) => ({
              exerciseId: e.id,
              sets,
              reps:
                e.tracking === "seconds"
                  ? 20
                  : p.goal === "Strength building" &&
                      !beginner &&
                      e.category === "Compound"
                    ? 6
                    : e.category === "Isolation"
                      ? 15
                      : 12,
              rest: e.category === "Isolation" ? 60 : rest,
            })),
          };
        })
        .filter((d) => d.exercises.length);
  if (missing.size)
    warnings.push(
      `Equipment or exclusions limit options for: ${[...missing].join(", ")}. Do not improvise unsafe equipment; add suitable equipment or seek guidance for substitutions.`,
    );
  return {
    id: "current",
    created: localDate(),
    version: 2,
    split,
    days,
    rationale: p.medical
      ? "Unrestricted training is withheld due to the health screening."
      : `${split} uses ${days.length} of your ${p.days.length} available days, ${p.duration}-minute sessions and ${p.equipment.toLowerCase()} equipment. ${beginner ? "Beginner volume starts at two sets per exercise." : "Volume and rep targets reflect your goal and recovery."} Different valid plans can look different; consistency, manageable volume and recovery matter more than matching one diagram.`,
    warnings,
  };
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
