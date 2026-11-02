import Dexie, { type EntityTable } from "dexie";
import type {
  Profile,
  WorkoutPlan,
  Session,
  SetLog,
  Weight,
  Intake,
  Water,
  Cardio,
  Settings,
  MealPlan,
} from "../domain/types";
export const db = new Dexie("form-fitness") as Dexie & {
  profiles: EntityTable<Profile, "id">;
  plans: EntityTable<WorkoutPlan, "id">;
  sessions: EntityTable<Session, "id">;
  sets: EntityTable<SetLog, "id">;
  weights: EntityTable<Weight, "id">;
  intake: EntityTable<Intake, "id">;
  water: EntityTable<Water, "id">;
  cardio: EntityTable<Cardio, "id">;
  settings: EntityTable<Settings, "id">;
  meals: EntityTable<MealPlan, "id">;
};
db.version(1).stores({
  profiles: "id",
  plans: "id",
  sessions: "id,date,status",
  sets: "id,sessionId,exerciseId",
  weights: "id,date",
  cardio: "id,date",
  settings: "id",
});
db.version(2).stores({
  intake: "id,date,foodId",
  water: "id,date",
  meals: "id,day,slot",
});
export const defaults: Settings = {
  id: "preferences",
  theme: "dark",
  language: "en",
  unit: "kg",
  rest: 75,
  hydration: 2000,
  reminders: false,
  reminderTime: "18:00",
  reminderDays: [1, 3, 5],
  reminderMessage: "Time to move. Your workout is ready.",
  lastUpdate: "",
};
export const repository = {
  async export() {
    const data: Record<string, unknown> = {};
    for (const t of db.tables) data[t.name] = await t.toArray();
    return {
      format: "form-fitness",
      version: 2,
      exported: new Date().toISOString(),
      data,
    };
  },
  async clear() {
    await db.transaction("rw", db.tables, async () => {
      for (const table of db.tables) await table.clear();
    });
  },
};
