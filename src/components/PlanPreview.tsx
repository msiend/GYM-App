import type { WorkoutPlan } from "../domain/types";
import { scheduleCounts } from "../domain/engine";
import { days } from "../domain/calendar";
export default function PlanPreview({ plan }: { plan: WorkoutPlan }) {
  const counts = scheduleCounts(plan);
  return (
    <section className="plan-preview" aria-label="Weekly plan preview">
      <div className="section-title">
        <h3>Your week</h3>
        <span className="tag">{counts.total} days</span>
      </div>
      {counts.total ? (
        <p className="plan-mix">
          {counts.strength} strength
          {counts.light ? " · " + counts.light + " easy activity" : ""}
        </p>
      ) : (
        <p className="notice">
          {plan.rationale?.includes("withheld")
            ? "Professional guidance is needed before an unrestricted plan."
            : "Choose at least two days and review your equipment or exclusions."}
        </p>
      )}
      {counts.light > 0 && (
        <p className="hint">
          Easy days keep your selected schedule while allowing recovery between
          strength sessions.
        </p>
      )}
      <div className="preview-days">
        {plan.days.map((day) => (
          <div className="preview-day" key={day.day}>
            <strong>{days[day.day]}</strong>
            <div>
              <span>{day.focus}</span>
              <small>
                {day.estimatedMinutes || "—"} min · {day.exercises.length}{" "}
                exercises
              </small>
            </div>
            <span
              className={"tag " + (day.kind === "light" ? "soft" : "green")}
            >
              {day.kind === "light" ? "Easy" : "Strength"}
            </span>
          </div>
        ))}
      </div>
      {!!plan.warnings?.length && (
        <details className="plan-notes">
          <summary>Plan notes</summary>
          <ul>
            {plan.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
