import { expect, it } from "vitest";
import type { SetLog } from "./types";
import { resistanceVolume } from "./volume";
it("does not mix kg-seconds or estimated band resistance into kg-repetition volume", () => {
  const log: SetLog = {
    id: "set",
    sessionId: "session",
    exerciseId: "goblet",
    index: 0,
    weight: 10,
    reps: 12,
    done: true,
    rpe: 7,
    pain: false,
    technique: true,
  };
  expect(
    resistanceVolume([
      log,
      { ...log, exerciseId: "plank", reps: 20 },
      { ...log, exerciseId: "band-biceps-curl" },
      { ...log, done: false },
    ]),
  ).toBe(120);
  expect(resistanceVolume([{ ...log, exerciseId: "squat", weight: 0 }])).toBe(
    0,
  );
});
