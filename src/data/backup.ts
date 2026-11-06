import { z } from "zod";
import { db } from "./db";
import { exercises } from "./exercises";
import { foods } from "./foods";
import { equipmentItems } from "../domain/equipment";
const id = z.string().min(1);
const num = z.number().finite();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const planExercise = z.object({
  exerciseId: id,
  sets: num.min(1).max(20),
  reps: num.min(0).max(999),
  rest: num.min(0).max(3600),
});
const foodSchema = z
  .object({
    id: z.string().startsWith("custom-"),
    name: id,
    kcal: num.min(0).max(1000),
    protein: num.min(0).max(100),
    carbs: num.min(0).max(100),
    fat: num.min(0).max(100),
    fiber: num.min(0).max(100),
    state: id,
    diet: z.enum([
      "Vegan",
      "Vegetarian",
      "Eggetarian",
      "Pescatarian",
      "Non-vegetarian",
    ]),
    allergens: z.array(z.string()),
    source: id,
    verification: z.literal("user-entered"),
    aliases: z.array(z.string()).optional(),
    servingGrams: num.positive().max(2000).optional(),
  })
  .refine(
    (f) => f.protein + f.carbs + f.fat <= 105,
    "Macronutrients exceed plausible serving mass",
  );
const schemas: Record<string, z.ZodType> = {
  customFoods: foodSchema,
  profiles: z
    .object({
      id: z.literal("me"),
      name: id,
      age: num.min(13).max(100),
      height: num.min(100).max(250),
      heightUnit: z.enum(["cm", "ft"]).optional(),
      supports: z.array(z.enum(["bench", "anchor", "step"])).optional(),
      equipmentInventory: z
        .array(z.enum(equipmentItems.map((x) => x.id)))
        .optional(),
      priorityMuscles: z.array(z.string()).max(20).optional(),
      weight: num.min(25).max(350),
      gender: z.string(),
      target: num.min(25).max(350).optional(),
      bodyFat: num.min(3).max(65).optional(),
      referenceWeight: num.min(25).max(350).optional(),
      preferredSplit: z
        .enum([
          "Automatic",
          "Full body",
          "Upper / lower",
          "Push / pull / legs",
          "Body-part split (6 days)",
        ])
        .optional(),
      recovery: z.enum(["Normal recovery", "Limited recovery"]).optional(),
      experience: id,
      goal: z.enum([
        "General fitness",
        "Fat loss",
        "Muscle building",
        "Strength building",
        "Flexibility & endurance",
      ]),
      days: z.array(num.int().min(0).max(6)).min(2).max(6),
      duration: num.min(20).max(90),
      equipment: id,
      restrictions: z.string(),
      medical: z.boolean(),
      diet: id,
      allergies: z.string(),
      dislikes: z.string(),
      meals: num.int().min(2).max(6),
      activity: num.min(1).max(2),
      proteinMethod: id,
      nutritionGoal: id,
      budget: id,
      nutritionRisk: z.boolean(),
    })
    .passthrough(),
  plans: z.object({
    id,
    created: date,
    rationale: z.string().optional(),
    warnings: z.array(z.string()).optional(),
    version: num.optional(),
    split: id,
    days: z.array(
      z.object({
        day: num.int().min(0).max(6),
        kind: z.enum(["strength", "light"]).optional(),
        focus: id,
        exercises: z.array(planExercise),
        estimatedMinutes: num.positive().optional(),
      }),
    ),
  }),
  sessions: z.object({
    id,
    date,
    focus: id,
    status: z.enum(["active", "complete"]),
    kind: z.enum(["strength", "light"]).optional(),
    exercises: z.array(planExercise),
    notes: z.string(),
  }),
  sets: z
    .object({
      id,
      sessionId: id,
      exerciseId: id,
      index: num.int().min(0),
      weight: num.min(0).max(1000),
      reps: num.min(0).max(10800),
      done: z.boolean(),
      rpe: num.min(1).max(10),
      pain: z.boolean(),
      technique: z.boolean(),
    })
    .refine(
      (log) =>
        log.reps <= 999 ||
        exercises.some(
          (e) => e.id === log.exerciseId && e.tracking === "seconds",
        ),
      "Repetition count is out of range",
    ),
  weights: z
    .object({ id, date, weight: num.min(25).max(350), notes: z.string() })
    .passthrough(),
  intake: z.object({
    id,
    date,
    foodId: id,
    grams: num.positive().max(2000),
    meal: id,
  }),
  water: z.object({
    id,
    date,
    ml: num.positive().max(2000),
    createdAt: num.min(0).optional(),
  }),
  cardio: z
    .object({
      id,
      date,
      activity: id,
      minutes: num.positive().max(600),
      distance: num.min(0).max(300),
      intensity: id,
    })
    .passthrough(),
  settings: z.object({
    id: z.literal("preferences"),
    theme: z.enum(["light", "dark"]),
    textSize: z.enum(["normal", "large"]).optional(),
    exerciseLanguage: z
      .enum(["en", "hi", "mr", "gu", "bn", "ta", "te", "kn", "ml", "pa"])
      .optional(),
    language: z.enum(["hi", "en"]),
    unit: z.enum(["kg", "lbs"]),
    rest: num.min(10).max(600),
    hydration: num.min(250).max(6000),
    reminders: z.boolean(),
    hydrationReminders: z.boolean().optional(),
    hydrationNotifications: z.boolean().optional(),
    hydrationInterval: num.int().min(30).max(180).optional(),
    hydrationStart: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    hydrationEnd: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    hydrationMessage: z.string().max(200).optional(),
    hydrationEnabledAt: num.min(0).optional(),
    hydrationLastReminderAt: num.min(0).optional(),
    reminderTime: z.string(),
    reminderDays: z.array(num.int().min(0).max(6)),
    reminderMessage: z.string(),
    lastUpdate: z.string(),
  }),
  meals: z.object({
    id,
    day: num.int().min(0).max(6),
    slot: num.int().min(0).max(5),
    title: id,
    foodId: id,
    grams: num.positive().max(2000),
    notes: z.string(),
    time: z.string(),
  }),
};
export async function importBackup(text: string) {
  const parsed = z
    .object({
      format: z.literal("form-fitness"),
      version: z.union([z.literal(2), z.literal(3)]),
      data: z.record(z.string(), z.array(z.unknown())),
    })
    .parse(JSON.parse(text));
  const data: Record<string, unknown[]> = {};
  for (const t of db.tables) {
    if (
      t.name === "customFoods" &&
      parsed.version === 2 &&
      !parsed.data.customFoods
    ) {
      data.customFoods = [];
      continue;
    }
    if (!Array.isArray(parsed.data[t.name]))
      throw new Error("Missing backup table");
    data[t.name] = z.array(schemas[t.name]).parse(parsed.data[t.name]);
  }
  const exIds = new Set(exercises.map((e) => e.id));
  const { indianMeals } = await import("./recipes");
  const foodIds = new Set(
    [
      ...foods,
      ...indianMeals,
      ...(data.customFoods as import("../domain/types").Food[]),
    ].map((f) => f.id),
  );
  for (const row of [
    ...data.sets,
    ...data.sessions.flatMap((s: any) => s.exercises),
    ...data.plans.flatMap((p: any) => p.days.flatMap((d: any) => d.exercises)),
  ] as any[])
    if (!exIds.has(row.exerciseId)) throw new Error("Unknown exercise");
  for (const row of [...data.intake, ...data.meals] as any[])
    if (!foodIds.has(row.foodId)) throw new Error("Unknown food");
  if ((data.sessions as any[]).filter((s) => s.status === "active").length > 1)
    throw new Error("Multiple active sessions");
  await db.transaction("rw", db.tables, async () => {
    for (const t of db.tables) {
      await t.clear();
      await t.bulkAdd(data[t.name]);
    }
  });
}
