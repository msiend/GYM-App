import type { Exercise } from "./types";
export const bodyParts = [
  { id: "all", label: "All body parts", muscles: [] },
  { id: "core", label: "Core / belly muscles", muscles: ["Abs"] },
  { id: "chest", label: "Chest", muscles: ["Chest"] },
  { id: "back", label: "Back", muscles: ["Back", "Traps"] },
  { id: "shoulders", label: "Shoulders", muscles: ["Shoulders"] },
  {
    id: "arms",
    label: "Arms / grip",
    muscles: ["Biceps", "Triceps", "Forearms"],
  },
  {
    id: "thighs",
    label: "Thighs",
    muscles: ["Quadriceps", "Hamstrings", "Adductors", "Abductors"],
  },
  { id: "hips", label: "Hips / glutes", muscles: ["Glutes"] },
  { id: "calves", label: "Calves", muscles: ["Calves"] },
  { id: "full", label: "Full body", muscles: ["Full Body"] },
];
export function matchesBodyPart(e: Exercise, id: string) {
  const group = bodyParts.find((b) => b.id === id);
  return (
    !group ||
    id === "all" ||
    [e.muscle, ...e.secondary].some((m) => group.muscles.includes(m))
  );
}
export function matchesExerciseSearch(e: Exercise, query: string) {
  return [
    e.name,
    ...(e.aliases || []),
    e.muscle,
    ...e.secondary,
    e.pattern,
    e.category,
  ]
    .join(" ")
    .toLowerCase()
    .includes(query.trim().toLowerCase());
}
