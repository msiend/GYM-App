import { ExternalLink, Play } from "lucide-react";
import type { Exercise } from "../domain/types";
import { bodyPartLabel, tutorialUrl } from "../domain/exercise-guide";
export function ExerciseOverview({
  exercise,
  compact = false,
}: {
  exercise: Exercise;
  compact?: boolean;
}) {
  const supporting = [...new Set(exercise.secondary)].filter(
    (m) => m && m !== exercise.muscle,
  );
  return (
    <div className={`exercise-overview ${compact ? "compact" : ""}`}>
      <dl className="muscle-details">
        <div>
          <dt>Main muscles</dt>
          <dd>
            <span className="muscle-chip primary">
              {bodyPartLabel(exercise.muscle)}
            </span>
          </dd>
        </div>
        {supporting.length > 0 && (
          <div>
            <dt>Also works</dt>
            <dd>
              {supporting.map((m) => (
                <span className="muscle-chip" key={m}>
                  {bodyPartLabel(m)}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
export function TutorialLink({
  exercise,
}: {
  exercise: Pick<Exercise, "name">;
}) {
  return (
    <div className="tutorial-action">
      <a
        className="youtube-tutorial"
        href={tutorialUrl(exercise)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Watch ${exercise.name} tutorial on YouTube (opens in a new tab)`}
      >
        <span className="youtube-play">
          <Play size={14} fill="currentColor" />
        </span>
        Watch on YouTube
        <ExternalLink size={14} />
      </a>
      <small>Opens tutorial search · internet required</small>
    </div>
  );
}
