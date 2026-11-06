import type { EquipmentItem, Exercise, Profile } from "./types";

export const equipmentOptions = [
  "Full gym",
  "Partial gym",
  "Dumbbells",
  "Home workout",
  "Bands",
  "Bodyweight",
  "Limited equipment",
];
export const equipmentItems: { id: EquipmentItem; label: string }[] = [
  { id: "dumbbells", label: "Dumbbells" },
  { id: "bands", label: "Resistance bands" },
  { id: "barbell", label: "Barbell & plates" },
  { id: "rack", label: "Squat/bench rack with safeties" },
  { id: "cable", label: "Cable station (one adjustable pulley)" },
  { id: "dual-cable", label: "Dual-adjustable cable station" },
  { id: "pulldown", label: "Lat pulldown machine" },
  { id: "seated-row", label: "Seated row machine with foot supports" },
  { id: "leg-press", label: "Leg press machine" },
  { id: "leg-extension", label: "Leg extension machine" },
  { id: "seated-leg-curl", label: "Seated leg curl machine" },
  { id: "lying-leg-curl", label: "Lying leg curl machine" },
  { id: "chest-press", label: "Chest press machine" },
  { id: "shoulder-press", label: "Shoulder press machine" },
  { id: "biceps-machine", label: "Biceps curl machine" },
  { id: "triceps-machine", label: "Triceps extension machine" },
  { id: "pec-deck", label: "Reverse fly machine (rear-fly setup)" },
  { id: "dip-bars", label: "Parallel dip bars" },
  { id: "dip-machine", label: "Seated dip machine" },
  { id: "pull-up-bar", label: "Secure pull-up bar" },
  { id: "seated-calf-machine", label: "Seated calf raise machine" },
  { id: "standing-calf-machine", label: "Standing calf raise machine" },
  { id: "bike", label: "Stationary bike" },
  { id: "elliptical", label: "Elliptical" },
  { id: "rower", label: "Rowing machine" },
];

/** Explicit machine requirements for legacy Gym records; unknown machines fail closed. */
export function requiredEquipment(e: Exercise): EquipmentItem[] {
  if (e.equipmentItems) return e.equipmentItems;
  if (e.equipment === "Dumbbells") return ["dumbbells"];
  if (e.equipment === "Bands") return ["bands"];
  if (e.equipment !== "Gym") return [];
  const id = e.id;
  if (
    /cable-crossover|cable-rear-delt-fly|cable-seated-lateral-raise|incline-cable-chest-press|cable-chest-press/.test(
      id,
    )
  )
    return ["dual-cable"];
  if (/seated-cable-rows|seated-one-arm-cable/.test(id)) return ["seated-row"];
  if (
    id === "pulldown" ||
    /lat-pulldown|cable-pulldown|v-bar-pulldown/.test(id)
  )
    return ["pulldown"];
  if (/barbell-bench|barbell-squat/.test(id)) return ["barbell", "rack"];
  if (/barbell|romanian-deadlift/.test(id)) return ["barbell"];
  if (/pullups/.test(id)) return ["pull-up-bar"];
  if (/dips---/.test(id)) return ["dip-bars"];
  if (/dip-machine/.test(id)) return ["dip-machine"];
  if (/leg-press/.test(id)) return ["leg-press"];
  if (/leg-extensions/.test(id)) return ["leg-extension"];
  if (/seated-leg-curl/.test(id)) return ["seated-leg-curl"];
  if (/lying-leg-curl/.test(id)) return ["lying-leg-curl"];
  if (/machine-bench-press/.test(id)) return ["chest-press"];
  if (/machine-shoulder/.test(id)) return ["shoulder-press"];
  if (/machine-bicep/.test(id)) return ["biceps-machine"];
  if (/machine-triceps/.test(id)) return ["triceps-machine"];
  if (/reverse-machine/.test(id)) return ["pec-deck"];
  if (/seated-calf-raise/.test(id)) return ["seated-calf-machine"];
  if (/standing-calf-raise/.test(id)) return ["standing-calf-machine"];
  if (/bicycling/.test(id)) return ["bike"];
  if (/elliptical/.test(id)) return ["elliptical"];
  if (/rowing-stationary/.test(id)) return ["rower"];
  if (/cable|triceps-pushdown|face-pull|straight-arm-pulldown/.test(id))
    return ["cable"];
  if (/flat-bench/.test(id)) return []; // A bench, rather than a machine.
  return [];
}

export function hasEquipment(p: Profile, e: Exercise) {
  if (p.equipment === "Full gym") return true;
  if (!(e.requires || []).every((s) => p.supports?.includes(s))) return false;
  if (
    p.equipment === "Partial gym" ||
    (p.equipment === "Limited equipment" && p.equipmentInventory?.length)
  ) {
    const required = requiredEquipment(e);
    if (e.equipment === "Gym" && !required.length)
      return (
        e.id === "db-flat-bench-lying-leg-raise" &&
        p.supports?.includes("bench")
      );
    return required.every(
      (item) =>
        p.equipmentInventory?.includes(item) ||
        (item === "cable" && p.equipmentInventory?.includes("dual-cable")),
    );
  }
  return e.equipment === "Bodyweight" || e.equipment === p.equipment;
}
