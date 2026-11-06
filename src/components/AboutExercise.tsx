import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, saveSettings } from "../data/db";
import { saveErrorMessage } from "../data/errors";
import type { Exercise } from "../domain/types";
import {
  exerciseLanguages,
  exerciseCopy,
  localizedBenefit,
  localizedMuscle,
  type ExerciseLanguage,
} from "../domain/exercise-localization";
import { Modal } from "./ui";
import { TutorialLink } from "./ExerciseGuide";
export default function AboutExercise({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const preferences = useLiveQuery(async () => ({
    settings: await db.settings.get("preferences"),
  }));
  const settings = preferences?.settings;
  const [selection, setSelection] = useState<ExerciseLanguage | null>(null);
  const [error, setError] = useState("");
  const code =
    selection ||
    settings?.exerciseLanguage ||
    (settings?.language === "hi" ? "hi" : "en");
  const copy = exerciseCopy(code);
  const supporting = [...new Set(exercise.secondary)].filter(
    (m) => m && m !== exercise.muscle,
  );
  if (!preferences)
    return (
      <Modal title={`About the exercise · ${exercise.name}`} onClose={onClose}>
        <p role="status">Loading exercise details…</p>
      </Modal>
    );
  return (
    <Modal title={`About the exercise · ${exercise.name}`} onClose={onClose}>
      <div className="about-exercise" lang={code}>
        <label className="exercise-language-picker">
          {copy.language}
          <select
            aria-label="Exercise explanation language"
            value={code}
            onChange={async (e) => {
              const next = e.target.value as ExerciseLanguage;
              setSelection(next);
              setError("");
              try {
                await saveSettings({ exerciseLanguage: next });
              } catch (err) {
                setError(saveErrorMessage(err, "the explanation language"));
              }
            }}
          >
            {exerciseLanguages.map((language) => (
              <option
                key={language.code}
                value={language.code}
                lang={language.code}
              >
                {language.name}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="danger" role="alert">
            {error}
          </p>
        )}
        <section className="about-benefit">
          <h3>{copy.why}</h3>
          <p>{localizedBenefit(exercise, code)}</p>
        </section>
        <dl className="muscle-details">
          <div>
            <dt>{copy.primary}</dt>
            <dd>
              <span className="muscle-chip primary">
                {localizedMuscle(exercise.muscle, code)}
              </span>
            </dd>
          </div>
          {supporting.length > 0 && (
            <div>
              <dt>{copy.supporting}</dt>
              <dd>
                {supporting.map((m) => (
                  <span key={m} className="muscle-chip">
                    {localizedMuscle(m, code)}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
        <TutorialLink
          exercise={exercise}
          language={code === "en" ? undefined : copy.searchLanguage}
          label={copy.youtube}
          note={copy.internet}
        />
        <section className="about-practice">
          <h3>{copy.practice}</h3>
          <ul>
            <li>{copy.breathingTip}</li>
            <li>{copy.mistakeTip}</li>
            <li>{copy.safeTip}</li>
          </ul>
        </section>
        {code !== "en" && (
          <p className="language-source-note">{copy.sourceNote}</p>
        )}
        <details
          className="original-exercise-steps"
          open={code === "en"}
          key={`${exercise.id}-${code}`}
        >
          <summary>{copy.sourceTitle}</summary>
          <div lang="en">
            {exercise.requires?.length ? (
              <p className="notice">
                Required supports:{" "}
                {exercise.requires
                  .map(
                    (r) =>
                      ({
                        bench: "stable exercise bench",
                        anchor: "rated band anchor",
                        step: "stable exercise platform",
                      })[r],
                  )
                  .join(", ")}
                . Confirm these are available before attempting the exercise.
              </p>
            ) : null}
            {exercise.automatic === false && (
              <p className="notice">
                Reference exercise: excluded from automatic plans because setup
                needs individual instruction.
              </p>
            )}
            <ol>
              {exercise.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <h4>Breathing</h4>
            <p>{exercise.breathing}</p>
            <h4>Common mistakes</h4>
            <p>{exercise.mistakes}</p>
            <p className="notice">{exercise.safety}</p>
            {exercise.source && <p className="hint">{exercise.source}</p>}
          </div>
          {exercise.sourceUrl && (
            <a
              className="text-link"
              href={exercise.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {copy.sourceLink}
            </a>
          )}
        </details>
      </div>
    </Modal>
  );
}
