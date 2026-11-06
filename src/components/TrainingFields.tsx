import type { Goal, Profile } from "../domain/types";
import { splitOptions } from "../domain/engine";
import { days } from "../domain/calendar";
export const trainingGoals: Goal[] = [
  "General fitness",
  "Fat loss",
  "Muscle building",
  "Strength building",
  "Flexibility & endurance",
];
export const experienceLevels = [
  "Complete beginner",
  "Less than 3 months",
  "3–6 months",
  "6–12 months",
  "More than 1 year",
];
export default function TrainingFields({
  profile: p,
  onChange,
}: {
  profile: Profile;
  onChange: (patch: Partial<Profile>) => void;
}) {
  return (
    <div className="training-fields">
      <div className="form-grid">
        <label>
          Training goal
          <select
            aria-label="Training goal"
            value={p.goal}
            onChange={(e) => onChange({ goal: e.target.value as Goal })}
          >
            {trainingGoals.map((goal) => (
              <option key={goal}>{goal}</option>
            ))}
          </select>
        </label>
        <label>
          Training experience
          <select
            aria-label="Training experience"
            value={p.experience}
            onChange={(e) => onChange({ experience: e.target.value })}
          >
            {experienceLevels.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>
        <label>
          Minutes per session
          <select
            aria-label="Minutes per session"
            value={p.duration}
            onChange={(e) => onChange({ duration: Number(e.target.value) })}
          >
            {[20, 30, 45, 60, 75, 90].map((n) => (
              <option key={n} value={n}>
                {n} minutes
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="day-field">
        <legend>
          Training days{" "}
          <span className="count-label">{p.days.length} selected</span>
        </legend>
        <div className="day-picker config-days">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <button
              type="button"
              key={day}
              aria-pressed={p.days.includes(day)}
              disabled={!p.days.includes(day) && p.days.length >= 6}
              className={p.days.includes(day) ? "selected" : ""}
              onClick={() =>
                onChange({
                  days: p.days.includes(day)
                    ? p.days.filter((d) => d !== day)
                    : [...p.days, day].sort((a, b) => a - b),
                })
              }
            >
              <span aria-hidden="true">{days[day].slice(0, 3)}</span>
              <span className="sr-only">{days[day]}</span>
            </button>
          ))}
        </div>
        <p className="hint">
          Choose 2–6 days. Your preview includes every selected day.
        </p>
      </fieldset>
      <details className="form-details">
        <summary>Training options</summary>
        <div className="form-grid">
          <label>
            Plan style
            <select
              aria-label="Plan style"
              value={p.preferredSplit || "Automatic"}
              onChange={(e) => onChange({ preferredSplit: e.target.value })}
            >
              {splitOptions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Recovery
            <select
              aria-label="Recovery"
              value={p.recovery || "Normal recovery"}
              onChange={(e) => onChange({ recovery: e.target.value })}
            >
              <option>Normal recovery</option>
              <option>Limited recovery</option>
            </select>
          </label>
        </div>
      </details>
    </div>
  );
}
