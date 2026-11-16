import { useState, type FormEvent } from "react";
import { formatScore } from "../format";
import type { ReviewPayload, RubricCategory } from "../types";
import { cx, Field } from "./ui";

export function ReviewForm({
  rubric,
  requireName,
  wellLabel,
  improveLabel,
  submitLabel,
  onSubmit,
}: {
  rubric: RubricCategory[];
  requireName: boolean;
  wellLabel: string;
  improveLabel: string;
  submitLabel: string;
  onSubmit: (payload: ReviewPayload) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [scores, setScores] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(rubric.map((category) => [category.key, null])),
  );
  const [checks, setChecks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rubric.flatMap((category) => category.items.map((item) => [`${category.key}:${item.key}`, false]))),
  );
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [comments, setComments] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const rated = rubric.filter((category) => typeof scores[category.key] === "number").length;
  const values = rubric.map((category) => scores[category.key]).filter((score): score is number => typeof score === "number");
  const average = values.length ? values.reduce((sum, score) => sum + score, 0) / values.length : null;
  const marked = Object.values(checks).filter(Boolean).length;

  function problem() {
    if (requireName && name.trim().length < 2) return "Add your name.";
    if (rubric.some((category) => scores[category.key] == null)) return "Rate every category.";
    if (strengths.trim().length < 8) return "Say a little more about what worked.";
    if (improvements.trim().length < 8) return "Say a little more about what to improve.";
    return "";
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    const message = problem();
    if (message) {
      setError(message);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        evaluator_name: name.trim(),
        strengths: strengths.trim(),
        improvements: improvements.trim(),
        comments: comments.trim(),
        scores: rubric.map((category) => ({ category: category.key, score: scores[category.key] as number })),
        checks: rubric.flatMap((category) =>
          category.items.map((item) => ({
            category: category.key,
            item_key: item.key,
            checked: checks[`${category.key}:${item.key}`] ?? false,
          })),
        ),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this review.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-5">
        <p className="text-sm text-muted">1 needs work · 3 solid · 5 strong</p>
        {requireName ? (
          <Field label="Your name" hint="The speaker will see this with the review." error={attempted && name.trim().length < 2 ? "Add your name." : ""}>
            <input className="field" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={80} />
          </Field>
        ) : null}
        {rubric.map((category, index) => (
          <fieldset key={category.key} className="card p-5">
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {String(index + 1).padStart(2, "0")}
            </legend>
            <h2 className="font-serif text-2xl tracking-tight">{category.label}</h2>
            <p className="mt-1 text-sm text-muted">{category.description}</p>
            <div className="mt-4 grid grid-cols-5 gap-2" role="group" aria-label={`${category.label} score`}>
              {[1, 2, 3, 4, 5].map((score) => {
                const selected = scores[category.key] === score;
                return (
                  <button
                    key={score}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setScores((current) => ({ ...current, [category.key]: score }))}
                    className={cx(
                      "h-12 rounded-xl text-sm font-semibold ring-1 transition",
                      selected ? "bg-ink text-paper ring-ink" : "bg-card text-ink ring-line hover:bg-paper",
                    )}
                  >
                    {score}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-1">
              {category.items.map((item) => {
                const key = `${category.key}:${item.key}`;
                const checked = checks[key] ?? false;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => setChecks((current) => ({ ...current, [key]: !checked }))}
                    className={cx(
                      "flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition",
                      checked ? "bg-moss" : "hover:bg-paper",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-xs ring-1",
                        checked ? "bg-pine text-white ring-pine" : "bg-card ring-line",
                      )}
                    >
                      {checked ? "✓" : ""}
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
        <Field label={wellLabel}>
          <textarea className="field min-h-28" value={strengths} maxLength={2000} onChange={(event) => setStrengths(event.target.value)} />
        </Field>
        <Field label={improveLabel}>
          <textarea className="field min-h-28" value={improvements} maxLength={2000} onChange={(event) => setImprovements(event.target.value)} />
        </Field>
        <Field label="Anything else?" hint="Optional.">
          <textarea className="field min-h-20" value={comments} maxLength={2000} onChange={(event) => setComments(event.target.value)} />
        </Field>
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Assessment summary</p>
          <p className="mt-3 font-serif text-4xl tabular-nums">{formatScore(average)}</p>
          <p className="text-sm text-muted">
            {rated} of {rubric.length} categories rated · {marked} observations marked
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {rubric.map((category) => (
              <li key={category.key} className="flex justify-between gap-3">
                <span>{category.label}</span>
                <span className="font-semibold tabular-nums">{scores[category.key] ?? "—"}</span>
              </li>
            ))}
          </ul>
          {error ? <p className="mt-4 text-sm text-ember">{error}</p> : null}
          <button type="submit" className="btn btn-primary mt-5 w-full" disabled={saving}>
            {saving ? "Saving…" : submitLabel}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-muted">This saves to their SpeakTrack account.</p>
        </div>
      </aside>
    </form>
  );
}
