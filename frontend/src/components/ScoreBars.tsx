import type { Score } from "../types";

export function ScoreBars({ scores }: { scores: Score[] }) {
  return (
    <ul className="space-y-3">
      {scores.map((score) => (
        <li key={score.category}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span>{score.label}</span>
            <span className="font-semibold tabular-nums">{score.score}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-line">
            <div className="h-1.5 rounded-full bg-brand" style={{ width: `${(score.score / 5) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
