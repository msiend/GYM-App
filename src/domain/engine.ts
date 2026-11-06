import type {
  Profile,
  WorkoutPlan,
  SetLog,
  Session,
  Exercise,
  PlanExercise,
  PlanDay,
} from "./types";
import { exercises } from "../data/exercises";
import { hasEquipment } from "./equipment";
export { uid } from "./ids";
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const splitOptions = [
  "Automatic",
  "Full body",
  "Upper / lower",
  "Push / pull / legs",
  "Body-part split (6 days)",
];
export const PROGRAM_VERSION = 4;
export function scheduleCounts(plan: WorkoutPlan) {
  const light = plan.days.filter((day) => day.kind === "light").length;
  return { total: plan.days.length, strength: plan.days.length - light, light };
}
function reportedRestrictions(value: string) {
  return /^(none|no restrictions|no pain|no injuries|n\/?a|not applicable)$/i.test(
    value.trim(),
  )
    ? ""
    : value.trim();
}
export function needsTrainingGuidance(p: Profile) {
  return (
    p.medical ||
    p.nutritionRisk ||
    p.age < 18 ||
    /\b(pain|injur\w*|heart|blood pressure|surgery|fracture|hernia)\b|दर्द|चोट/i.test(
      reportedRestrictions(p.restrictions),
    )
  );
}
export function eligible(p: Profile) {
  const excluded = reportedRestrictions(p.restrictions)
    .toLowerCase()
    .split(/[,;\n]/)
    .map((s) =>
      s
        .trim()
        .replace(/^(?:avoid|exclude|no|cannot do)\s+/, "")
        .replace(/\bsquats\b/g, "squat"),
    )
    .filter(Boolean);
  return exercises.filter(
    (e) =>
      e.automatic !== false &&
      hasEquipment(p, e) &&
      !excluded.some((s) =>
        `${e.name} ${e.muscle} ${e.secondary.join(" ")} ${e.pattern}`
          .toLowerCase()
          .includes(s),
      ) &&
      (!["Complete beginner", "Less than 3 months"].includes(p.experience) ||
        e.difficulty === "Beginner"),
  );
}
export function replacementOptions(p: Profile, original: Exercise) {
  return eligible(p).filter(
    (e) =>
      e.id !== original.id &&
      e.pattern === original.pattern &&
      (e.muscle === original.muscle ||
        (e.pattern === "Hinge" &&
          ["Glutes", "Hamstrings"].includes(e.muscle) &&
          ["Glutes", "Hamstrings"].includes(original.muscle))),
  );
}
export function prescribeExercise(p: Profile, e: Exercise): PlanExercise {
  const beginner = ["Complete beginner", "Less than 3 months"].includes(
    p.experience,
  );
  const sets =
    beginner ||
    p.recovery === "Limited recovery" ||
    p.age >= 65 ||
    p.duration <= 30 ||
    p.goal === "Flexibility & endurance"
      ? 2
      : 3;
  const strength =
    p.goal === "Strength building" &&
    !beginner &&
    e.category === "Compound" &&
    ["Push", "Pull", "Squat", "Hinge"].includes(e.pattern);
  return {
    exerciseId: e.id,
    sets,
    reps:
      e.tracking === "seconds"
        ? 20
        : e.pattern === "Core"
          ? 8
          : strength
            ? 6
            : e.category === "Isolation"
              ? 15
              : 12,
    rest: strength
      ? 180
      : e.category === "Compound" && !["Core", "Carry"].includes(e.pattern)
        ? 90
        : 60,
  };
}
export function exerciseMinutes(item: PlanExercise, e: Exercise) {
  const work =
    item.reps * (e.tracking === "seconds" ? 1 : 4) * (e.unilateral ? 2 : 1);
  return (work * item.sets + item.rest * (item.sets - 1) + 45) / 60;
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
  // Normalize imported/edited availability; never schedule duplicate or invalid days.
  p = {
    ...p,
    days: [...new Set(p.days)].filter(
      (d) => Number.isInteger(d) && d >= 0 && d <= 6,
    ),
  };
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
    (e) => !["Cardio", "Mobility", "Stretching", "Yoga"].includes(e.category),
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
  const guidanceNeeded = needsTrainingGuidance(p);
  const strengthDays: PlanDay[] = guidanceNeeded
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
          // Reserve five minutes each for warm-up/cool-down; unilateral work takes both sides.
          let usedMinutes = 10;
          const picked: typeof exercises = [];
          for (const request of slots) {
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
            const fitting = candidates.filter(
              (e) =>
                usedMinutes + exerciseMinutes(prescribeExercise(p, e), e) <=
                p.duration,
            );
            if (!fitting.length) continue;
            const exercise = fitting[(i + picked.length) % fitting.length];
            usedMinutes += exerciseMinutes(
              prescribeExercise(p, exercise),
              exercise,
            );
            picked.push(exercise);
          }
          return {
            day,
            kind: "strength" as const,
            focus,
            estimatedMinutes: Math.ceil(usedMinutes),
            exercises: picked.map((e) => prescribeExercise(p, e)),
          };
        })
        .filter((d) => d.exercises.length);
  const easyPool = eligible(p);
  const walking =
    easyPool.find((e) => e.id === "walk") ||
    easyPool.find((e) => e.id === "march");
  const lightDays: PlanDay[] = guidanceNeeded
    ? []
    : p.days
        .filter((day) => !strengthDays.some((d) => d.day === day))
        .map((day) => {
          let used = 10;
          const items: PlanExercise[] = [];
          const candidates: PlanExercise[] = [
            ...(walking
              ? [
                  {
                    exerciseId: walking.id,
                    sets: 1,
                    reps: Math.min(900, Math.max(60, (p.duration - 14) * 60)),
                    rest: 30,
                  },
                ]
              : []),
            ...["mobility", "stretch"]
              .filter((id) => easyPool.some((e) => e.id === id))
              .map((id) => ({
                exerciseId: id,
                sets: 1,
                reps: id === "stretch" ? 20 : 8,
                rest: 30,
              })),
          ];
          for (const item of candidates) {
            const exercise = easyPool.find((e) => e.id === item.exerciseId)!;
            const cost = exerciseMinutes(item, exercise);
            if (used + cost <= p.duration) {
              items.push(item);
              used += cost;
            }
          }
          return {
            day,
            kind: "light" as const,
            focus: "Easy cardio & mobility",
            exercises: items,
            estimatedMinutes: Math.ceil(used),
          };
        })
        .filter((d) => d.exercises.length);
  const days = [...strengthDays, ...lightDays].sort(
    (a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7),
  );
  if (lightDays.length)
    warnings.unshift(
      `${days.length} selected days: ${strengthDays.length} strength + ${lightDays.length} easy days. Easy days support recovery between resistance sessions.`,
    );
  if (missing.size)
    warnings.push(
      `Equipment or exclusions limit options for: ${[...missing].join(", ")}. Do not improvise unsafe equipment; add suitable equipment or seek guidance for substitutions.`,
    );
  if (
    !guidanceNeeded &&
    (strengthDays.length < count ||
      strengthDays.some((d) => d.exercises.length < 4))
  )
    warnings.push(
      "Time, equipment or exclusions limit movement coverage. This is a partial starting plan, not a complete assessment. Review missing movements with a qualified trainer; do not add unsafe improvised equipment.",
    );
  if (p.equipment !== "Full gym")
    warnings.push(
      "Only confirmed benches, band anchors and platforms are used. Update equipment details when these supports are available.",
    );
  if (guidanceNeeded)
    warnings.push(
      "Adult automatic programming is withheld: age or reported health restrictions need qualified professional guidance. The exercise library remains educational reference material.",
    );
  if (!guidanceNeeded && days.length < p.days.length)
    warnings.push(
      "Some selected days have no suitable exercises after your exclusions. Review the plan with a qualified trainer.",
    );
  return {
    id: "current",
    created: localDate(),
    version: PROGRAM_VERSION,
    split,
    days,
    rationale: guidanceNeeded
      ? "Unrestricted adult training is withheld due to age or reported health restrictions. Seek qualified guidance before choosing a program."
      : `${days.length} scheduled days · ${strengthDays.length} strength${lightDays.length ? ` + ${lightDays.length} easy` : ""} · up to ${p.duration} min per session. ${beginner ? "Beginner resistance sessions use two sets per exercise." : "Volume reflects your goal and recovery."}`,
    warnings,
  };
}
export { nutrition } from "./nutrition";
export function progression(
  sessions: Session[],
  logs: SetLog[],
  exerciseId: string,
  repTarget: number,
  {
    recoveryLimited = false,
    prescribedSets,
  }: { recoveryLimited?: boolean; prescribedSets?: number } = {},
) {
  const exercise = exercises.find((e) => e.id === exerciseId);
  const activePain = logs.some(
    (l) =>
      l.exerciseId === exerciseId &&
      l.pain &&
      sessions.some((s) => s.id === l.sessionId && s.status === "active"),
  );
  const recent = sessions
    .filter((s) => s.status === "complete")
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(
      (s) =>
        s.exercises.some((e) => e.exerciseId === exerciseId) ||
        logs.some((l) => l.sessionId === s.id && l.exerciseId === exerciseId),
    )
    .slice(0, 2);
  const sets = logs.filter(
    (l) =>
      recent.some((s) => s.id === l.sessionId) && l.exerciseId === exerciseId,
  );
  if (activePain || sets.some((l) => l.pain))
    return "Stop painful movements and seek appropriate guidance before resuming.";
  if (recoveryLimited)
    return "Keep the load steady while recovery is limited. Reduce effort or add rest if fatigue is unusual.";
  if (!exercise || exercise.tracking === "seconds")
    return "Build comfortable duration and control gradually. Do not increase load based on a timed hold.";
  if (["Bodyweight", "Bands"].includes(exercise.equipment))
    return "Build controlled repetitions before changing the exercise difficulty or band resistance. A kilogram-based load increase is not appropriate for this movement.";
  if (sets.some((l) => l.rpe >= 9 || l.reps < repTarget - 3))
    return "Keep the load steady or reduce it. Prioritize technique and recovery.";
  if (
    recent.length === 2 &&
    new Set(recent.map((s) => s.date)).size === 2 &&
    recent.every((s) => {
      const prescription = s.exercises.find((e) => e.exerciseId === exerciseId);
      const recorded = sets.filter((l) => l.sessionId === s.id);
      return (
        prescription &&
        prescription.reps === repTarget &&
        prescription.sets ===
          (prescribedSets ??
            recent[0].exercises.find((e) => e.exerciseId === exerciseId)
              ?.sets) &&
        recorded.length >= prescription.sets &&
        new Set(recorded.map((l) => l.index)).size === recorded.length
      );
    }) &&
    sets.length > 0 &&
    sets.every(
      (l) => l.done && l.reps >= repTarget && l.technique && l.rpe <= 8,
    ) &&
    new Set(sets.map((l) => l.weight)).size === 1 &&
    sets[0].weight > 0
  )
    return "Two consistent sessions. Consider the smallest available load increase next time, only if technique and recovery feel good. You decide.";
  return "Build consistent, comfortable repetitions before increasing load. Leave 2–3 repetitions in reserve.";
}
