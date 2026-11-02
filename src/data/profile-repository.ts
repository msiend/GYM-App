import { db } from "./db";
import { generatePlan, localDate, uid } from "../domain/engine";
import type { Profile, WorkoutPlan } from "../domain/types";
export async function saveProfileAndPlan(
  profile: Profile,
  {
    includeStartingWeight = true,
    plan = generatePlan(profile),
  }: { includeStartingWeight?: boolean; plan?: WorkoutPlan } = {},
) {
  // Prepare application values before starting the database transaction.
  const startingWeight = {
    id: uid(),
    date: localDate(),
    weight: profile.weight,
    notes: "Starting weight",
  };
  await db.transaction("rw", [db.profiles, db.plans, db.weights], async () => {
    const first = !(await db.profiles.get("me"));
    await db.profiles.put(profile);
    await db.plans.put(plan);
    if (first && includeStartingWeight) await db.weights.add(startingWeight);
  });
}
