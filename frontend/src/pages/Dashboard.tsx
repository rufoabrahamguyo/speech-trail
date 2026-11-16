import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, isApiError } from "../api";
import { useAuth } from "../auth";
import { ErrorNote, PageHeader, Quiet, StatusPill } from "../components/ui";
import { formatDate, formatMinutes, formatScore, formatWhen, greeting } from "../format";
import type { Progress, SessionSummary, TopicSuggestion } from "../types";
import { useTitle } from "../useTitle";

export function Dashboard() {
  useTitle("Dashboard · SpeakTrack");
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState("");

  function load() {
    setError("");
    Promise.all([api<Progress>("/api/progress/"), api<SessionSummary[]>("/api/sessions/")])
      .then(([nextProgress, nextSessions]) => {
        setProgress(nextProgress);
        setSessions(nextSessions);
      })
      .catch((caught) => setError(isApiError(caught) ? caught.message : "Could not reach SpeakTrack."));
  }

  useEffect(() => {
    load();
  }, []);

  if (error) return <ErrorNote message={error} onRetry={load} />;
  if (!progress || !sessions || !user) return <Quiet>Loading your practice…</Quiet>;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title={greeting(user.name)}
        lede={user.aim || "Set a speaking aim so each session has a point."}
        action={
          <Link to="/app/sessions/new" className="btn btn-primary">
            New session
          </Link>
        }
      />
      {!user.aim ? (
        <Link to="/app/profile" className="inline-block text-sm font-semibold text-brand">
          Add a speaking aim
        </Link>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sessions" value={String(progress.sessions)} />
        <Stat label="Peer reviews" value={String(progress.peer_reviews)} />
        <Stat
          label="Strongest"
          value={progress.peer_reviews === 0 ? "—" : progress.categories_close ? "Even so far" : progress.strongest?.label ?? "—"}
          detail={
            progress.peer_reviews === 0
              ? "Need a review"
              : progress.categories_close
                ? "Another review will separate them"
                : progress.strongest
                  ? formatScore(progress.strongest.average)
                  : "Need a review"
          }
        />
        <Stat label="Practice next" value={progress.next_focus && !progress.categories_close ? progress.next_focus.label : "—"} detail={progress.next_focus && !progress.categories_close ? formatScore(progress.next_focus.average) : "Scores will split with more reviews"} />
      </section>

      {progress.next_focus?.advice ? (
        <section className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Next focus · {progress.next_focus.label}</p>
          <p className="mt-2 text-lg leading-relaxed">{progress.next_focus.advice}</p>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <PromptCard />
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl">Latest feedback</h2>
            <Link to="/app/progress" className="text-sm font-semibold text-brand">
              Progress
            </Link>
          </div>
          {progress.recent.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              No reviews yet. Speak for a few minutes, then send the assessment link to one honest friend.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {progress.recent.slice(0, 2).map((review) => (
                <li key={review.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link to={`/app/sessions/${review.session_id}`} className="font-semibold">
                      {review.topic}
                    </Link>
                    <span className="text-sm tabular-nums">{formatScore(review.average)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {review.kind === "self" ? "Self-assessment" : review.evaluator_name} · {formatWhen(review.submitted_at)}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">{review.improvements}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">Recent sessions</h2>
          <Link to="/app/sessions" className="text-sm font-semibold text-brand">
            All sessions
          </Link>
        </div>
        {sessions.length === 0 ? (
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              "Speak on a topic for a few minutes.",
              "Send the assessment link to one friend.",
              "Read the scores by category, then do it again.",
            ].map((step, index) => (
              <li key={step} className="card p-4 text-sm leading-relaxed">
                <span className="font-semibold text-brand">0{index + 1}</span>
                <p className="mt-2">{step}</p>
              </li>
            ))}
          </ol>
        ) : (
          <ul className="mt-4 space-y-3">
            {sessions.slice(0, 3).map((session) => (
              <li key={session.id}>
                <Link to={`/app/sessions/${session.id}`} className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold">{session.topic}</p>
                    <p className="mt-1 text-sm text-muted">
                      {formatDate(session.practiced_on)} · {formatMinutes(session.duration_minutes)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-muted">{session.peer_average == null ? "No peer score" : `${formatScore(session.peer_average)} avg`}</span>
                    <StatusPill status={session.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="card px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-2xl leading-tight">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </article>
  );
}

function PromptCard() {
  const [prompt, setPrompt] = useState<TopicSuggestion | null>(null);
  const [error, setError] = useState("");

  function load(avoid?: string) {
    const params = new URLSearchParams();
    if (avoid) params.set("avoid", avoid);
    const query = params.toString();
    api<TopicSuggestion>(`/api/topics/random/${query ? `?${query}` : ""}`)
      .then((next) => {
        setPrompt(next);
        setError("");
      })
      .catch(() => setError("Could not load a prompt."));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Today's prompt</p>
      {prompt ? (
        <>
          <p className="mt-3 font-serif text-3xl leading-tight">{prompt.topic}</p>
          <p className="mt-2 text-sm text-muted">{prompt.tag_label}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to={`/app/sessions/new?topic=${encodeURIComponent(prompt.topic)}&tag=${prompt.tag}`} className="btn btn-primary">
              Use this topic
            </Link>
            <button type="button" className="btn btn-ghost" onClick={() => load(prompt.topic)}>
              Another prompt
            </button>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">{error || "Finding a prompt…"}</p>
      )}
    </section>
  );
}
