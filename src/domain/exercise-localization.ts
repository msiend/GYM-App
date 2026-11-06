import translations from "../data/translations/exercise-about.json";
import type { Exercise } from "./types";
export type ExerciseLanguage = keyof typeof translations;
export const exerciseLanguages = Object.entries(translations).map(
  ([code, copy]) => ({ code: code as ExerciseLanguage, name: copy.name }),
);
export function exerciseCopy(language: string) {
  return translations[language as ExerciseLanguage] || translations.en;
}
export function localizedMuscle(muscle: string, language: string) {
  const copy = exerciseCopy(language);
  return (copy.muscles as Record<string, string>)[muscle] || muscle;
}
export function localizedBenefit(exercise: Exercise, language: string) {
  const copy = exerciseCopy(language);
  if (exercise.category === "Yoga") return copy.yoga;
  if (exercise.category === "Cardio" || exercise.pattern === "Cardio")
    return copy.cardio;
  if (exercise.category === "Mobility" || exercise.pattern === "Mobility")
    return copy.mobility;
  if (exercise.category === "Stretching" || exercise.pattern === "Stretching")
    return copy.stretching;
  return (
    (copy.benefits as Record<string, string>)[exercise.muscle] ||
    copy.genericBenefit
  );
}
