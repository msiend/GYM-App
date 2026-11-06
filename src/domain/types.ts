export type Goal =
  | "General fitness"
  | "Fat loss"
  | "Muscle building"
  | "Strength building"
  | "Flexibility & endurance";
export type EquipmentItem =
  | "dumbbells"
  | "bands"
  | "barbell"
  | "rack"
  | "cable"
  | "dual-cable"
  | "seated-row"
  | "pulldown"
  | "leg-press"
  | "leg-extension"
  | "seated-leg-curl"
  | "lying-leg-curl"
  | "chest-press"
  | "shoulder-press"
  | "biceps-machine"
  | "triceps-machine"
  | "pec-deck"
  | "dip-bars"
  | "dip-machine"
  | "pull-up-bar"
  | "seated-calf-machine"
  | "standing-calf-machine"
  | "bike"
  | "elliptical"
  | "rower";
export interface Profile {
  id: string;
  name: string;
  age: number;
  gender: string;
  height: number;
  heightUnit?: "cm" | "ft";
  supports?: ("bench" | "anchor" | "step")[];
  weight: number;
  target?: number;
  experience: string;
  goal: Goal;
  days: number[];
  duration: number;
  equipment: string;
  equipmentInventory?: EquipmentItem[];
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
  preferredSplit?: string;
  recovery?: string;
  priorityMuscles?: string[];
  nutritionRisk: boolean;
}
export interface Exercise {
  id: string;
  name: string;
  aliases?: string[];
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
  source?: string;
  sourceUrl?: string;
  tracking?: "reps" | "seconds";
  requires?: ("bench" | "anchor" | "step")[];
  unilateral?: boolean;
  automatic?: boolean;
  equipmentItems?: EquipmentItem[];
}
export interface PlanExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  rest: number;
}
export interface PlanDay {
  day: number;
  kind?: "strength" | "light";
  focus: string;
  exercises: PlanExercise[];
  estimatedMinutes?: number;
}
export interface WorkoutPlan {
  id: string;
  created: string;
  split: string;
  days: PlanDay[];
  rationale?: string;
  warnings?: string[];
  version?: number;
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
  kind?: "strength" | "light";
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
  servingGrams?: number;
  aliases?: string[];
  sourceUrl?: string;
  sourceId?: string;
  verification?: string;
  recipe?: { foodId: string; grams: number }[];
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
  createdAt?: number;
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
  textSize?: "normal" | "large";
  exerciseLanguage?:
    | "en"
    | "hi"
    | "mr"
    | "gu"
    | "bn"
    | "ta"
    | "te"
    | "kn"
    | "ml"
    | "pa";
  language: string;
  unit: string;
  rest: number;
  hydration: number;
  reminders: boolean;
  hydrationReminders?: boolean;
  hydrationNotifications?: boolean;
  hydrationInterval?: number;
  hydrationStart?: string;
  hydrationEnd?: string;
  hydrationMessage?: string;
  hydrationEnabledAt?: number;
  hydrationLastReminderAt?: number;
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
