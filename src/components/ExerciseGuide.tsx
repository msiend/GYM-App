import { ExternalLink, Play } from "lucide-react";
import type { Exercise } from "../domain/types";
import { tutorialUrl } from "../domain/exercise-guide";
export function TutorialLink({
  exercise,
  language,
  label = "Watch on YouTube",
  note = "Opens tutorial search · internet required",
}: {
  exercise: Pick<Exercise, "name">;
  language?: string;
  label?: string;
  note?: string;
}) {
  return (
    <div className="tutorial-action">
      <a
        className="youtube-tutorial"
        href={tutorialUrl(exercise, language)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label}: ${exercise.name} tutorial on YouTube (opens in a new tab)`}
      >
        <span className="youtube-play">
          <Play size={14} fill="currentColor" />
        </span>
        {label}
        <ExternalLink size={14} />
      </a>
      <small>{note}</small>
    </div>
  );
}
