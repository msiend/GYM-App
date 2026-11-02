import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, ChevronLeft, ShieldCheck } from "lucide-react";
import type { Profile } from "../domain/types";
import { db } from "../data/db";
import { generatePlan, localDate, uid } from "../domain/engine";
import { Modal } from "./ui";
import { days } from "../domain/calendar";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
  const titles = [
    "Make it personal",
    "Your starting point",
    "Find your direction",
    "Make room for movement",
    "Your training space",
    "Fuel your everyday",
    "Health comes first",
    "Your plan, your pace",
  ];
  async function next() {
    if (step === 0) {
      const valid = await form.trigger();
      if (!valid) return;
      setP((v) => ({ ...v, ...schema.parse(form.getValues()) }));
    }
    if (step === 3 && p.days.length < 2) {
      setError("Choose at least two training days.");
      return;
    }
    setError("");
    setStep((v) => v + 1);
  }
  async function save() {
    setBusy(true);
    try {
      await db.transaction(
        "rw",
        [db.profiles, db.plans, db.weights],
        async () => {
          await db.profiles.put(p);
          await db.plans.put(generatePlan(p));
          if (!profile)
            await db.weights.add({
              id: uid(),
              date: localDate(),
              weight: p.weight,
              notes: "Starting weight",
            });
        },
      );
      onClose();
    } catch {
      setError(
        "Could not save your profile. Check available device storage and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const select = (label: string, key: keyof Profile, options: string[]) => (
    <label>
      {label}
      <select
        value={String(p[key] ?? "")}
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
      title={profile ? "Edit your profile" : "Welcome to FORM"}
      onClose={onClose}
    >
      <div className="wizard-progress">
        {titles.map((_, i) => (
          <span key={i} className={i <= step ? "active" : ""} />
        ))}
      </div>
      <div className="eyebrow">STEP {step + 1} OF 8</div>
      <h2 className="wizard-title">
        {titles[step]}
        <span className="lime">.</span>
      </h2>
      <p className="muted">A little about you. A plan that fits your life.</p>
      {step === 0 && (
        <div className="form-grid">
          <label className="span2">
            Full name
            <input {...form.register("name")} />
            {form.formState.errors.name && (
              <small className="danger">Enter your name.</small>
            )}
          </label>
          {(["age", "height", "weight"] as const).map((k) => (
            <label key={k}>
              {k === "height"
                ? "Height (cm)"
                : k === "weight"
                  ? "Current weight (kg)"
                  : "Age"}
              <input type="number" {...form.register(k)} />
              {form.formState.errors[k] && (
                <small className="danger">Enter a valid {k}.</small>
              )}
            </label>
          ))}
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
      {step === 1 && (
        <div className="option-list">
          {[
            "Complete beginner",
            "Less than 3 months",
            "3–6 months",
            "6–12 months",
            "More than 1 year",
          ].map((x) => (
            <button
              key={x}
              className={p.experience === x ? "option selected" : "option"}
              onClick={() => update("experience", x)}
            >
              {x}
              {p.experience === x && <Check size={18} />}
            </button>
          ))}
          <p className="hint">
            Start where you are. Experience determines volume, not your goal.
          </p>
        </div>
      )}
      {step === 2 && (
        <div className="option-list">
          {[
            "General fitness",
            "Fat loss",
            "Muscle building",
            "Strength building",
            "Flexibility & endurance",
          ].map((x, i) => (
            <button
              key={x}
              className={p.goal === x ? "option selected" : "option"}
              onClick={() => update("goal", x)}
            >
              <div>
                <strong>{x}</strong>
                <small>
                  {
                    [
                      "Move better, feel stronger, build healthy habits.",
                      "Build strength and support sustainable body composition.",
                      "Build muscle with gradual, manageable training volume.",
                      "Practice compound movements and build your strength.",
                      "Move freely and improve your aerobic capacity.",
                    ][i]
                  }
                </small>
              </div>
              {p.goal === x && <Check size={18} />}
            </button>
          ))}
        </div>
      )}
      {step === 3 && (
        <>
          <label>Available days (choose 2–6)</label>
          <div className="day-picker">
            {days.map((d, i) => (
              <button
                key={d}
                className={p.days.includes(i) ? "selected" : ""}
                onClick={() =>
                  update(
                    "days",
                    p.days.includes(i)
                      ? p.days.filter((x) => x !== i)
                      : p.days.length < 6
                        ? [...p.days, i].sort()
                        : p.days,
                  )
                }
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
          <label>
            Session duration
            <select
              value={p.duration}
              onChange={(e) => update("duration", +e.target.value)}
            >
              {[20, 30, 45, 60, 75, 90].map((n) => (
                <option key={n} value={n}>
                  {n} minutes
                </option>
              ))}
            </select>
          </label>
          <p className="hint">
            New to training? We’ll use up to three of your days for resistance
            work and keep recovery in your week.
          </p>
        </>
      )}
      {step === 4 && (
        <div className="option-list">
          {[
            "Full gym",
            "Dumbbells",
            "Home workout",
            "Bands",
            "Bodyweight",
            "Limited equipment",
          ].map((x) => (
            <button
              key={x}
              className={p.equipment === x ? "option selected" : "option"}
              onClick={() => update("equipment", x)}
            >
              {x}
              {p.equipment === x && <Check size={18} />}
            </button>
          ))}
        </div>
      )}
      {step === 5 && (
        <div className="form-grid">
          {select("Dietary preference", "diet", [
            "Vegetarian",
            "Vegan",
            "Eggetarian",
            "Non-vegetarian",
            "Pescatarian",
          ])}
          {select("Nutrition goal", "nutritionGoal", [
            "General health",
            "Fat loss",
            "Muscle building",
            "Lean muscle building",
            "Weight maintenance",
            "Athletic performance",
          ])}
          <label>
            Allergies / intolerances (comma separated)
            <input
              value={p.allergies}
              placeholder="milk, nuts, gluten, soy"
              onChange={(e) => update("allergies", e.target.value)}
            />
          </label>
          <label>
            Disliked or restricted foods
            <input
              value={p.dislikes}
              placeholder="eggs, fish…"
              onChange={(e) => update("dislikes", e.target.value)}
            />
          </label>
          <label>
            Meals per day
            <select
              value={p.meals}
              onChange={(e) => update("meals", +e.target.value)}
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          {select("Budget preference", "budget", ["Low", "Medium", "Flexible"])}
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
              value={p.referenceWeight || ""}
              onChange={(e) =>
                update(
                  "referenceWeight",
                  Math.max(25, Math.min(350, +e.target.value)) || undefined,
                )
              }
            />
          </label>
          <label>
            Daily activity
            <select
              value={p.activity}
              onChange={(e) => update("activity", +e.target.value)}
            >
              {[
                [1.2, "Sedentary"],
                [1.375, "Lightly active"],
                [1.55, "Moderately active"],
                [1.725, "Very active"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Body fat % (optional)
            <input
              type="number"
              min="3"
              max="65"
              value={p.bodyFat || ""}
              onChange={(e) =>
                update(
                  "bodyFat",
                  Math.min(65, Math.max(3, +e.target.value)) || undefined,
                )
              }
            />
          </label>
        </div>
      )}
      {step === 6 && (
        <>
          <div className="notice">
            <ShieldCheck />
            <p>
              Train with care. This app offers general guidance and cannot
              assess medical conditions.
            </p>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={p.medical}
              onChange={(e) => update("medical", e.target.checked)}
            />
            I have heart conditions, high blood pressure, significant pain,
            injuries or medical exercise restrictions.
          </label>
          <label>
            Movements, muscles or exercises to exclude (comma separated)
            <textarea
              placeholder="e.g. squat, shoulders, plank"
              value={p.restrictions}
              onChange={(e) => update("restrictions", e.target.value)}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={p.nutritionRisk}
              onChange={(e) => update("nutritionRisk", e.target.checked)}
            />
            I am pregnant, have an eating disorder, kidney/liver disease or a
            condition requiring dietary restrictions.
          </label>
          {(p.medical || p.nutritionRisk || p.age < 18) && (
            <p className="notice">
              Please consult a qualified healthcare professional. Unrestricted
              plans or nutrition targets will be withheld where relevant.
            </p>
          )}
        </>
      )}
      {step === 7 && (
        <>
          <div className="review-grid">
            {[
              ["Name", p.name],
              ["Goal", p.goal],
              ["Experience", p.experience],
              [
                "Training",
                `${p.days.length} available days · ${p.duration} min`,
              ],
              ["Equipment", p.equipment],
              ["Nutrition", `${p.diet} · ${p.meals} meals`],
              [
                "Screening",
                p.medical || p.nutritionRisk
                  ? "Professional guidance recommended"
                  : "No conditions reported",
              ],
              ["Restrictions", p.restrictions || "None reported"],
            ].map(([k, v]) => (
              <div key={k}>
                <small>{k}</small>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <p className="hint">
            Your plan is a starting point. Use manageable loads, practice
            technique, and adjust to your recovery. Saving an edited profile
            regenerates your workout plan but preserves your history.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="danger">
          {error}
        </p>
      )}
      <footer className="wizard-footer">
        <button
          className="button secondary"
          disabled={!step}
          onClick={() => setStep((s) => s - 1)}
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          className="button"
          disabled={busy}
          onClick={step === 7 ? save : next}
        >
          {step === 7 ? (busy ? "Saving…" : "Create my plan") : "Continue"}
          <ArrowRight size={17} />
        </button>
      </footer>
    </Modal>
  );
}
