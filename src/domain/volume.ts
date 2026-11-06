import { exercises } from "../data/exercises";
import type { SetLog } from "./types";
const catalog = new Map(exercises.map((e) => [e.id, e]));
/** Logged external kg × reps; durations and variable band resistance are separate metrics. */
export function resistanceVolume(logs: SetLog[]) {
  return logs.reduce((sum, log) => {
    const exercise = catalog.get(log.exerciseId);
    return log.done &&
      exercise?.tracking === "reps" &&
      ["Compound", "Isolation"].includes(exercise.category) &&
      exercise.equipment !== "Bands"
      ? sum + log.weight * log.reps
      : sum;
  }, 0);
}
