import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ChevronLeft } from "lucide-react";
import type { Profile } from "../domain/types";
import { saveProfileAndPlan } from "../data/profile-repository";
import { saveErrorMessage } from "../data/errors";
import { generatePlan } from "../domain/engine";
import { Modal } from "./ui";
import TrainingFields from "./TrainingFields";
import EquipmentFields from "./EquipmentFields";
import PlanPreview from "./PlanPreview";
import {
  cmToFeetInches,
  feetInchesToCm,
  displayHeight,
} from "../domain/height";
const schema = z.object({
  name: z.string().min(1, "Please enter your name"),
  age: z.coerce.number().min(13).max(100),
  height: z.coerce.number().min(100).max(250),
  weight: z.coerce.number().min(25).max(350),
});
const initial: Profile = {
  id: "me",
  name: "",
  age: 25,
  gender: "Prefer not to say",
  height: 170,
  heightUnit: "ft",
  weight: 70,
  experience: "Complete beginner",
  goal: "General fitness",
  days: [1, 3, 5],
  duration: 45,
  equipment: "Full gym",
  restrictions: "",
  medical: false,
  diet: "Vegetarian",
  allergies: "",
  dislikes: "",
  meals: 3,
  activity: 1.375,
  proteinMethod: "Body weight",
  nutritionGoal: "General health",
  budget: "Medium",
  nutritionRisk: false,
};
export default function Onboarding({
  profile,
  onClose,
}: {
  profile?: Profile;
  onClose: () => void;
}) {
  const [p, setP] = useState<Profile>(profile || initial);
  const [step, setStep] = useState(0);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    stepHeading.current?.focus({ preventScroll: true });
    stepHeading.current?.closest(".modal-body")?.scrollTo({ top: 0 });
  }, [step]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [foodGoalTouched, setFoodGoalTouched] = useState(false);
  const [imperialHeight, setImperialHeight] = useState(() =>
    cmToFeetInches(p.height),
  );
  const heightUnit = p.heightUnit || "ft";
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: p.name,
      age: p.age,
      height: p.height,
      weight: p.weight,
    },
  });
  const update = (key: keyof Profile, value: unknown) =>
    setP((v) => ({ ...v, [key]: value }));
  function changeImperialHeight(key: "feet" | "inches", value: string) {
    const next = { ...imperialHeight, [key]: value };
    setImperialHeight(next);
    form.setValue("height", feetInchesToCm(next.feet, next.inches), {
      shouldValidate: true,
    });
  }

  const titles = [
    "About you",
    "Your training",
    "Equipment & health",
    "Review your week",
  ];
  const preview = generatePlan(p);
  function updateTraining(patch: Partial<Profile>) {
    if (patch.goal && !profile && !foodGoalTouched)
      patch.nutritionGoal =
        patch.goal === "Fat loss"
          ? "Fat loss"
          : patch.goal === "Muscle building"
            ? "Muscle building"
            : "General health";
    setP((current) => ({ ...current, ...patch }));
  }
  async function next() {
    if (step === 0) {
      if (!(await form.trigger())) return;
      setP((current) => ({ ...current, ...schema.parse(form.getValues()) }));
    }
    if (step === 1 && p.days.length < 2) {
      setError("Choose at least two training days.");
      return;
    }
    if (
      step === 2 &&
      ((p.target !== undefined && (p.target < 25 || p.target > 350)) ||
        (p.referenceWeight !== undefined &&
          (p.referenceWeight < 25 || p.referenceWeight > 350)) ||
        (p.bodyFat !== undefined && (p.bodyFat < 3 || p.bodyFat > 65)))
    ) {
      setError("Check your optional weight and body-fat values.");
      return;
    }
    setError("");
    setStep((current) => current + 1);
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      await saveProfileAndPlan(p);
      onClose();
    } catch (error) {
      setError(saveErrorMessage(error, "your profile"));
    } finally {
      setBusy(false);
    }
  }
  const select = (label: string, key: keyof Profile, options: string[]) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={String(
          p[key] ??
            (key === "preferredSplit"
              ? "Automatic"
              : key === "recovery"
                ? "Normal recovery"
                : ""),
        )}
        onChange={(e) => update(key, e.target.value)}
      >
        {options.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );

  return (
    <Modal
      title={profile ? "Edit your profile" : "Create your plan"}
      onClose={onClose}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) void (step === 3 ? save() : next());
        }}
      >
        <div
          className="setup-progress"
          role="progressbar"
          aria-label="Profile setup"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={step + 1}
        >
          {titles.map((title, index) => (
            <span key={title} className={index <= step ? "active" : ""} />
          ))}
        </div>
        <p className="eyebrow">STEP {step + 1} OF 4</p>
        <h3 className="wizard-title" tabIndex={-1} ref={stepHeading}>
          {titles[step]}
        </h3>
        {step === 0 && (
          <div className="form-grid">
            <label className="span2">
              Full name
              <input {...form.register("name")} />
              {form.formState.errors.name && (
                <small className="danger">Enter your name.</small>
              )}
            </label>
            {(["age", "weight"] as const).map((k) => (
              <label key={k}>
                {k === "weight" ? "Current weight (kg)" : "Age"}
                <input type="number" {...form.register(k)} />
                {form.formState.errors[k] && (
                  <small className="danger">Enter a valid {k}.</small>
                )}
              </label>
            ))}
            <fieldset className="height-input span2">
              <legend>Height</legend>
              <label>
                Height unit
                <select
                  aria-label="Height unit"
                  value={heightUnit}
                  onChange={(e) => {
                    const unit = e.target.value as "cm" | "ft";
                    const cm = Number(form.getValues("height"));
                    if (unit === "ft" && Number.isFinite(cm))
                      setImperialHeight(cmToFeetInches(cm));
                    update("heightUnit", unit);
                  }}
                >
                  <option value="ft">Feet & inches</option>
                  <option value="cm">Centimetres</option>
                </select>
              </label>
              {heightUnit === "cm" ? (
                <label>
                  Height (cm)
                  <input
                    type="number"
                    min="100"
                    max="250"
                    step="any"
                    {...form.register("height")}
                  />
                </label>
              ) : (
                <>
                  <input type="hidden" {...form.register("height")} />
                  <div className="height-parts">
                    <label>
                      Feet
                      <input
                        type="number"
                        inputMode="numeric"
                        min="3"
                        max="8"
                        step="1"
                        value={imperialHeight.feet}
                        onChange={(e) =>
                          changeImperialHeight("feet", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Inches
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="11.99"
                        step="0.01"
                        value={imperialHeight.inches}
                        onChange={(e) =>
                          changeImperialHeight("inches", e.target.value)
                        }
                      />
                    </label>
                  </div>
                  <p className="hint">
                    For 5 ft 8 in, enter 5 feet and 8 inches.
                  </p>
                </>
              )}
              {form.formState.errors.height && (
                <small role="alert" className="danger">
                  Enter a height between 100 and 250 cm (about 3 ft 3 in to 8 ft
                  2 in). Inches must be from 0 to less than 12.
                </small>
              )}
            </fieldset>
            {select("Gender (optional)", "gender", [
              "Prefer not to say",
              "Female",
              "Male",
            ])}
            <label>
              Target weight (kg, optional)
              <input
                type="number"
                min="25"
                max="350"
                value={p.target || ""}
                onChange={(e) =>
                  update("target", Number(e.target.value) || undefined)
                }
              />
            </label>
          </div>
        )}

        {step === 1 && <TrainingFields profile={p} onChange={updateTraining} />}
        {step === 2 && (
          <>
            <EquipmentFields
              profile={p}
              onChange={(patch) =>
                setP((current) => ({ ...current, ...patch }))
              }
            />
            <fieldset className="health-fields">
              <legend>Health & limitations</legend>
              <label className="check">
                <input
                  type="checkbox"
                  checked={p.medical}
                  onChange={(e) => update("medical", e.target.checked)}
                />
                I have an injury, significant pain, a heart/blood-pressure
                condition or medical exercise restrictions.
              </label>
              <label>
                Exercises or muscles to avoid
                <input
                  value={p.restrictions}
                  placeholder="e.g. squat, shoulders, plank"
                  onChange={(e) => update("restrictions", e.target.value)}
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={p.nutritionRisk}
                  onChange={(e) => update("nutritionRisk", e.target.checked)}
                />
                Pregnancy, an eating disorder, kidney/liver disease or a
                prescribed diet.
              </label>
              {(p.medical || p.nutritionRisk || p.age < 18) && (
                <p className="notice">
                  Personal training targets need qualified professional
                  guidance. You can still browse the library.
                </p>
              )}
            </fieldset>
            <details className="form-details">
              <summary>Food preferences & optional details</summary>
              <div className="form-grid">
                {select("Dietary preference", "diet", [
                  "Vegetarian",
                  "Vegan",
                  "Eggetarian",
                  "Non-vegetarian",
                  "Pescatarian",
                ])}
                <label>
                  Nutrition goal
                  <select
                    aria-label="Nutrition goal"
                    value={p.nutritionGoal}
                    onChange={(e) => {
                      setFoodGoalTouched(true);
                      update("nutritionGoal", e.target.value);
                    }}
                  >
                    {[
                      "General health",
                      "Fat loss",
                      "Muscle building",
                      "Lean muscle building",
                      "Weight maintenance",
                      "Athletic performance",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Allergies / intolerances
                  <input
                    value={p.allergies}
                    placeholder="e.g. milk, nuts, gluten, soy"
                    onChange={(e) => update("allergies", e.target.value)}
                  />
                </label>
                <label>
                  Foods to avoid
                  <input
                    value={p.dislikes}
                    onChange={(e) => update("dislikes", e.target.value)}
                  />
                </label>
                <label>
                  Meals per day
                  <select
                    aria-label="Meals per day"
                    value={p.meals}
                    onChange={(e) => update("meals", Number(e.target.value))}
                  >
                    {[2, 3, 4, 5, 6].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                {select("Budget preference", "budget", [
                  "Low",
                  "Medium",
                  "Flexible",
                ])}
                <label>
                  Daily activity
                  <select
                    aria-label="Daily activity"
                    value={p.activity}
                    onChange={(e) => update("activity", Number(e.target.value))}
                  >
                    {[
                      [1.2, "Sedentary"],
                      [1.375, "Lightly active"],
                      [1.55, "Moderately active"],
                      [1.725, "Very active"],
                    ].map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {select("Protein calculation reference", "proteinMethod", [
                  "Body weight",
                  "Lean mass",
                  "Reference weight",
                ])}
                <label>
                  Clinician-provided reference weight (kg)
                  <input
                    type="number"
                    min="25"
                    max="350"
                    value={p.referenceWeight ?? ""}
                    onChange={(e) =>
                      update(
                        "referenceWeight",
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                      )
                    }
                  />
                </label>
                <label>
                  Body fat % (optional)
                  <input
                    type="number"
                    min="3"
                    max="65"
                    value={p.bodyFat ?? ""}
                    onChange={(e) =>
                      update(
                        "bodyFat",
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                      )
                    }
                  />
                </label>
              </div>
            </details>
          </>
        )}
        {step === 3 && (
          <>
            <div className="profile-review">
              <strong>{p.name}</strong>
              <span>
                {displayHeight(p.height, p.heightUnit)} · {p.weight} kg
              </span>
              <span>
                {p.goal} · {p.equipment}
              </span>
            </div>
            <PlanPreview plan={preview} />
          </>
        )}
        {error && (
          <p className="danger" role="alert">
            {error}
          </p>
        )}
        <footer className="wizard-footer">
          <button
            type="button"
            className="button secondary"
            disabled={!step || busy}
            onClick={() => {
              setError("");
              setStep((current) => current - 1);
            }}
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <button type="submit" className="button" disabled={busy}>
            {step === 3
              ? busy
                ? "Saving…"
                : profile
                  ? "Save profile"
                  : "Create my plan"
              : "Continue"}
            <ArrowRight size={16} />
          </button>
        </footer>
      </form>
    </Modal>
  );
}
