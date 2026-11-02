import { z } from "zod";
import { db } from "./db";
import { exercises } from "./exercises";
import { foods } from "./foods";
const id = z.string().min(1);
const num = z.number().finite();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const planExercise = z.object({
  exerciseId: id,
  sets: num.min(1).max(20),
  reps: num.min(0).max(999),
  rest: num.min(0).max(3600),
});
const schemas: Record<string, z.ZodType> = {
  profiles: z
    .object({
      id: z.literal("me"),
      name: id,
      age: num.min(13).max(100),
      height: num.min(100).max(250),
      weight: num.min(25).max(350),
      gender: z.string(),
      target: num.min(25).max(350).optional(),
      bodyFat: num.min(3).max(65).optional(),
      referenceWeight: num.min(25).max(350).optional(),
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
    split: id,
    days: z.array(
      z.object({
        day: num.int().min(0).max(6),
        focus: id,
        exercises: z.array(planExercise),
      }),
    ),
  }),
  sessions: z.object({
    id,
    date,
    focus: id,
    status: z.enum(["active", "complete"]),
    exercises: z.array(planExercise),
    notes: z.string(),
  }),
  sets: z.object({
    id,
    sessionId: id,
    exerciseId: id,
    index: num.int().min(0),
    weight: num.min(0).max(1000),
    reps: num.min(0).max(999),
    done: z.boolean(),
    rpe: num.min(1).max(10),
    pain: z.boolean(),
    technique: z.boolean(),
  }),
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
  water: z.object({ id, date, ml: num.positive().max(2000) }),
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
    language: z.enum(["hi", "en"]),
    unit: z.enum(["kg", "lbs"]),
    rest: num.min(10).max(600),
    hydration: num.min(250).max(6000),
    reminders: z.boolean(),
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
      version: z.literal(2),
      data: z.record(z.string(), z.array(z.unknown())),
    })
    .parse(JSON.parse(text));
  const data: Record<string, unknown[]> = {};
  for (const t of db.tables) {
    if (!Array.isArray(parsed.data[t.name]))
      throw new Error("Missing backup table");
    data[t.name] = z.array(schemas[t.name]).parse(parsed.data[t.name]);
  }
  const exIds = new Set(exercises.map((e) => e.id));
  const foodIds = new Set(foods.map((f) => f.id));
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
