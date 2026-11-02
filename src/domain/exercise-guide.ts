import type { Exercise } from "./types";

// General movement benefits, not promises about results or injury prevention.
const strengthBenefits: Record<string, string> = {
  Chest:
    "Builds chest strength for pushing movements such as pressing and push-ups.",
  Back: "Trains back strength for controlled pulling and holding the trunk steady.",
  Shoulders: "Builds shoulder strength for raising and controlling the arms.",
  Biceps:
    "Strengthens elbow bending used in curls, pulling and lifting objects.",
  Triceps:
    "Strengthens elbow extension used in pressing and pushing movements.",
  Forearms:
    "Develops forearm and grip strength for holding and controlling loads.",
  Abs: "Trains abdominal control and trunk stability during movement.",
  Quadriceps:
    "Builds front-of-thigh strength for standing up, squatting and climbing stairs.",
  Hamstrings:
    "Strengthens the back of the thighs for hip extension and knee bending.",
  Glutes:
    "Builds hip strength used in standing, walking and extending the hips.",
  Calves:
    "Strengthens the lower legs for pushing through the feet when walking and climbing.",
  Traps: "Trains upper-back muscles that help control the shoulder blades.",
  Adductors:
    "Strengthens the inner-thigh muscles used to bring the legs toward the midline.",
  Abductors:
    "Strengthens the outer-hip muscles used to move the leg to the side.",
};
export function exerciseBenefits(
  exercise: Pick<Exercise, "category" | "pattern" | "muscle" | "tracking">,
): string[] {
  if (exercise.category === "Cardio" || exercise.pattern === "Cardio")
    return [
      "Supports cardiovascular fitness and the ability to sustain activity when practiced regularly.",
      "Build duration and effort gradually to suit your current capacity.",
    ];
  if (exercise.category === "Mobility" || exercise.pattern === "Mobility")
    return [
      "Practices controlled movement through a comfortable range of motion.",
      "Can help prepare the involved joints and muscles for activity without forcing a stretch.",
    ];
  if (exercise.category === "Stretching" || exercise.pattern === "Stretching")
    return [
      "Can help maintain or improve flexibility when practiced regularly within a comfortable range.",
      "Use gentle tension rather than bouncing or forcing the movement.",
    ];
  const primary =
    strengthBenefits[exercise.muscle] ||
    "Builds strength and control in the muscles involved in this movement.";
  const practice =
    exercise.tracking === "seconds"
      ? "Practices maintaining trunk position while breathing through a controlled hold."
      : exercise.pattern === "Hinge"
        ? "Practices a controlled hip hinge, useful for bending and lifting tasks."
        : exercise.pattern === "Squat"
          ? "Practices coordinated bending and straightening of the hips and knees."
          : exercise.pattern === "Carry"
            ? "Practices grip and trunk control while carrying a manageable load."
            : exercise.category === "Isolation"
              ? "Lets you practice a focused muscle action with a controlled, manageable load."
              : "Practices coordinated movement and control across the working joints.";
  return [primary, practice];
}
export function tutorialUrl(exercise: Pick<Exercise, "name">): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.name} proper technique tutorial`)}`;
}
export const bodyPartLabel = (muscle: string) =>
  ({
    Abs: "Core / abdominals",
    Traps: "Upper back / traps",
    Quadriceps: "Front thighs / quads",
    Hamstrings: "Back thighs / hamstrings",
    Glutes: "Hips / glutes",
    Forearms: "Forearms / grip",
    Adductors: "Inner thighs",
    Abductors: "Outer hips",
    Feet: "Foot muscles",
  })[muscle] || muscle;
