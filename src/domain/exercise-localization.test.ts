import { describe, it, expect } from "vitest";
import { exercises } from "../data/exercises";
import {
  exerciseLanguages,
  exerciseCopy,
  localizedBenefit,
  localizedMuscle,
} from "./exercise-localization";
import { tutorialUrl } from "./exercise-guide";
describe("offline Indian-language exercise explanations", () => {
  it("covers all catalog muscle groups and content sections in every supported language", () => {
    expect(exerciseLanguages).toHaveLength(10);
    for (const { code } of exerciseLanguages) {
      const copy = exerciseCopy(code);
      for (const key of [
        "why",
        "safeTip",
        "breathingTip",
        "mistakeTip",
        "sourceNote",
        "sourceTitle",
      ] as const)
        expect(copy[key].trim().length).toBeGreaterThan(0);
      for (const exercise of exercises) {
        expect(localizedBenefit(exercise, code).trim().length).toBeGreaterThan(
          20,
        );
        for (const muscle of [exercise.muscle, ...exercise.secondary])
          expect((copy.muscles as Record<string, string>)[muscle]).toBeTruthy();
      }
    }
  });
  it("uses real Hindi and Tamil explanatory text and labels", () => {
    const squat = exercises.find((e) => e.id === "squat")!;
    expect(localizedBenefit(squat, "hi")).toContain("जाँघ");
    expect(localizedMuscle("Chest", "hi")).toBe("छाती");
    expect(localizedBenefit(squat, "ta")).toContain("தொடை");
    expect(exerciseCopy("hi").sourceTitle).toContain("अंग्रेज़ी");
  });
  it("falls back to English for an unrecognized locale and builds an encoded language-specific tutorial search", () => {
    expect(exerciseCopy("unrecognized").why).toBe("Why this exercise?");
    const query = new URL(
      tutorialUrl({ name: "Press & row" }, "Hindi"),
    ).searchParams.get("search_query");
    expect(query).toBe("Press & row proper technique tutorial in Hindi");
  });
});
