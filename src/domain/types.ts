export type Goal =
  | "General fitness"
  | "Fat loss"
  | "Muscle building"
  | "Strength building"
  | "Flexibility & endurance";
export interface Profile {
  id: string;
  name: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  target?: number;
  experience: string;
  goal: Goal;
  days: number[];
  duration: number;
  equipment: string;
  restrictions: string;
  medical: boolean;
  diet: string;
  allergies: string;
  dislikes: string;
  meals: number;
  activity: number;
  bodyFat?: number;
  referenceWeight?: number;
  proteinMethod: string;
  nutritionGoal: string;
  budget: string;
  nutritionRisk: boolean;
}
export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  secondary: string[];
  category: string;
  equipment: string;
  pattern: string;
  difficulty: string;
  instructions: string[];
  breathing: string;
  mistakes: string;
  safety: string;
  alternatives: string[];
}
export interface PlanExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  rest: number;
}
export interface PlanDay {
  day: number;
  focus: string;
  exercises: PlanExercise[];
}
export interface WorkoutPlan {
  id: string;
  created: string;
  split: string;
  days: PlanDay[];
}
export interface SetLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  index: number;
  weight: number;
  reps: number;
  done: boolean;
  rpe: number;
  pain: boolean;
  technique: boolean;
}
export interface Session {
  id: string;
  date: string;
  focus: string;
  status: "active" | "complete";
  exercises: PlanExercise[];
  notes: string;
}
export interface Weight {
  id: string;
  date: string;
  weight: number;
  waist?: number;
  chest?: number;
  arm?: number;
  thigh?: number;
  notes: string;
}
export interface Food {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  state: string;
  diet: string;
  allergens: string[];
  source: string;
}
export interface Intake {
  id: string;
  date: string;
  foodId: string;
  grams: number;
  meal: string;
}
export interface Water {
  id: string;
  date: string;
  ml: number;
}
export interface Cardio {
  id: string;
  date: string;
  activity: string;
  minutes: number;
  distance: number;
  intensity: string;
  heartRate?: number;
}
export interface Settings {
  id: string;
  theme: string;
  language: string;
  unit: string;
  rest: number;
  hydration: number;
  reminders: boolean;
  reminderTime: string;
  reminderDays: number[];
  reminderMessage: string;
  lastUpdate: string;
}
export interface MealPlan {
  id: string;
  day: number;
  slot: number;
  title: string;
  foodId: string;
  grams: number;
  notes: string;
  time: string;
}
