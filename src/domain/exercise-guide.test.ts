import { describe, it, expect } from "vitest";
import { exercises } from "../data/exercises";
import { exerciseBenefits, tutorialUrl, bodyPartLabel } from "./exercise-guide";
describe("offline exercise guidance and tutorial search", () => {
  it("provides benefits and readable body-part labels for the complete catalog", () => {
    for (const exercise of exercises) {
      expect(exerciseBenefits(exercise).length).toBeGreaterThan(0);
      expect(exerciseBenefits(exercise)[0].length).toBeGreaterThan(30);
      expect(bodyPartLabel(exercise.muscle)).toBeTruthy();
    }
  });
  it("distinguishes strength, mobility, stretching and cardio benefits", () => {
    expect(
      exerciseBenefits(exercises.find((e) => e.id === "squat")!)[0],
    ).toContain("front-of-thigh");
    expect(
      exerciseBenefits(exercises.find((e) => e.id === "walk")!)[0],
    ).toContain("cardiovascular");
    expect(
      exerciseBenefits(exercises.find((e) => e.id === "mobility")!)[0],
    ).toContain("range of motion");
    expect(
      exerciseBenefits(exercises.find((e) => e.id === "stretch")!)[0],
    ).toContain("flexibility");
  });
  it("encodes the whole exercise name as one YouTube search query", () => {
    const name = "Press & row / beginner #1";
    const url = new URL(tutorialUrl({ name }));
    expect(url.origin).toBe("https://www.youtube.com");
    expect(url.pathname).toBe("/results");
    expect(url.searchParams.get("search_query")).toBe(
      `${name} proper technique tutorial`,
    );
    expect([...url.searchParams.keys()]).toEqual(["search_query"]);
    expect(url.hash).toBe("");
  });
});
