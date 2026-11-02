import { useState } from "react";
import type { Profile } from "../domain/types";
import { generatePlan, splitOptions } from "../domain/engine";
import { db } from "../data/db";
import { Modal } from "./ui";
import { days } from "../domain/calendar";
export default function PlanSettings({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  const [p, setP] = useState({ ...profile });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preview = generatePlan(p);
  const update = (key: keyof Profile, v: unknown) =>
    setP((s) => ({ ...s, [key]: v }));
  return (
    <Modal title="Change your training plan" onClose={onClose}>
      <p>
        Choose what fits your life. The preview explains the plan before you
        save. Workout history and your active session are preserved.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (p.days.length < 2) {
            setError("Choose at least two available days.");
            return;
          }
          if (
            !confirm(
              "Replace your future weekly plan with this preview? Saved workouts are preserved.",
            )
          )
            return;
          setBusy(true);
          try {
            await db.transaction("rw", [db.profiles, db.plans], async () => {
              await db.profiles.put(p);
              await db.plans.put(preview);
            });
            onClose();
          } catch {
            setError(
              "Could not save your plan. Check available device storage.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Training goal
            <select
              aria-label="Training goal"
              value={p.goal}
              onChange={(e) => update("goal", e.target.value)}
            >
              {[
                "General fitness",
                "Fat loss",
                "Muscle building",
                "Strength building",
                "Flexibility & endurance",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Training experience
            <select
              aria-label="Training experience"
              value={p.experience}
              onChange={(e) => update("experience", e.target.value)}
            >
              {[
                "Complete beginner",
                "Less than 3 months",
                "3–6 months",
                "6–12 months",
                "More than 1 year",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Plan style
            <select
              aria-label="Plan style"
              value={p.preferredSplit || "Automatic"}
              onChange={(e) => update("preferredSplit", e.target.value)}
            >
              {splitOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Recovery
            <select
              aria-label="Recovery"
              value={p.recovery || "Normal recovery"}
              onChange={(e) => update("recovery", e.target.value)}
            >
              <option>Normal recovery</option>
              <option>Limited recovery</option>
            </select>
          </label>
          <label>
            Equipment
            <select
              aria-label="Equipment"
              value={p.equipment}
              onChange={(e) => update("equipment", e.target.value)}
            >
              {[
                "Full gym",
                "Dumbbells",
                "Home workout",
                "Bands",
                "Bodyweight",
                "Limited equipment",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Minutes per session
            <select
              aria-label="Minutes per session"
              value={p.duration}
              onChange={(e) => update("duration", +e.target.value)}
            >
              {[20, 30, 45, 60, 75, 90].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <label>Available days (choose 2–6)</label>
        <div className="day-picker">
          {days.map((d, i) => (
            <button
              type="button"
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
        <div className="card plan-preview">
          <h3>Preview: {preview.split}</h3>
          <p>{preview.rationale}</p>
          {preview.days.map((d) => (
            <div key={d.day}>
              <strong>{days[d.day]}</strong>
              <span>
                {d.focus} · {d.exercises.length} exercises
              </span>
            </div>
          ))}
          {preview.warnings?.map((w) => (
            <p className="hint" key={w}>
              {w}
            </p>
          ))}
        </div>
        {error && (
          <p role="alert" className="danger">
            {error}
          </p>
        )}
        <button className="button" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save plan"}
        </button>
      </form>
    </Modal>
  );
}
