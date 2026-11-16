import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, isApiError } from "../api";
import { ReviewForm } from "../components/ReviewForm";
import { ScoreBars } from "../components/ScoreBars";
import { ErrorNote, Quiet, StatusPill, cx } from "../components/ui";
import { formatDate, formatMinutes, formatScore, formatWhen, linkUrl, reviewCount } from "../format";
import type { AssessmentLink, Evaluation, RubricCategory, SessionDetail } from "../types";
import { useTitle } from "../useTitle";

export function SessionDetail() {
  useTitle("Session · SpeakTrack");
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fresh = Boolean((location.state as { fresh?: boolean } | null)?.fresh);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [focus, setFocus] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showSelf, setShowSelf] = useState(false);
  const [rubric, setRubric] = useState<RubricCategory[] | null>(null);

  function load() {
    setError("");
    api<SessionDetail>(`/api/sessions/${id}/`)
      .then((next) => {
        setSession(next);
        setNotes(next.notes);
        setFocus(next.focus);
      })
      .catch((caught) => setError(isApiError(caught) ? caught.message : "Could not reach SpeakTrack."));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function createLink(days: number | null) {
    setNotice("");
    try {
      const next = await api<SessionDetail>(`/api/sessions/${id}/links/`, {
        method: "POST",
        body: JSON.stringify({ expires_in_days: days }),
      });
      setSession(next);
    } catch (caught) {
      setNotice(isApiError(caught) ? caught.message : "Could not create a link.");
    }
  }

  async function revoke(linkId: string) {
    setNotice("");
    try {
      const next = await api<SessionDetail>(`/api/links/${linkId}/revoke/`, { method: "POST" });
      setSession(next);
    } catch (caught) {
      setNotice(isApiError(caught) ? caught.message : "Could not turn off that link.");
    }
  }

  async function copy(link: AssessmentLink) {
    const url = linkUrl(link.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(link.id);
    } catch {
      setCopied(null);
      setNotice("Select the link and copy it.");
    }
  }

  async function saveNotes() {
    try {
      const next = await api<SessionDetail>(`/api/sessions/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ notes, focus }),
      });
      setSession(next);
      setNotice("Notes saved.");
    } catch (caught) {
      setNotice(isApiError(caught) ? caught.message : "Could not save notes.");
    }
  }

  async function remove() {
    try {
      await api<void>(`/api/sessions/${id}/`, { method: "DELETE" });
      navigate("/app/sessions");
    } catch (caught) {
      setNotice(isApiError(caught) ? caught.message : "Could not delete this session.");
    }
  }

  async function openSelf() {
    setShowSelf(true);
    if (rubric) return;
    try {
      setRubric(await api<RubricCategory[]>("/api/rubric/"));
    } catch (caught) {
      setNotice(isApiError(caught) ? caught.message : "Could not load the rubric.");
    }
  }

  if (error) return <ErrorNote message={error} onRetry={load} />;
  if (!session) return <Quiet>Loading session…</Quiet>;

  const peers = session.evaluations.filter((evaluation) => evaluation.kind === "peer");
  const selfReview = session.evaluations.find((evaluation) => evaluation.kind === "self");

  return (
    <div className="space-y-6">
      <Link to="/app/sessions" className="text-sm font-semibold text-brand">
        All sessions
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={session.status} />
            {session.prompt_label ? <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{session.prompt_label}</span> : null}
          </div>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl tracking-tight">{session.topic}</h1>
          <p className="mt-2 text-sm text-muted">
            {formatDate(session.practiced_on)} · {formatMinutes(session.duration_minutes)}
            {session.peer_average != null ? ` · ${formatScore(session.peer_average)} peer average` : ""}
          </p>
        </div>
      </div>

      {fresh ? (
        <p className="rounded-2xl bg-moss px-4 py-3 text-sm text-pine">Your assessment link is ready. Send it to one friend.</p>
      ) : null}

      <section className={cx("card p-5", fresh && "ring-2 ring-ember/40")}>
        <h2 className="font-serif text-2xl">Assessment link</h2>
        <p className="mt-1 text-sm text-muted">
          Anyone with the link can submit a review. They do not need an account, and the same name cannot submit twice on one link.
        </p>
        <div className="mt-4 space-y-4">
          {session.links.map((link) => (
            <article key={link.id} className={cx("rounded-2xl border border-line p-4", link.active ? "bg-card" : "bg-paper opacity-80")}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="font-semibold">{linkState(link)}</p>
                <p className="text-muted">{reviewCount(link.submission_count)}</p>
              </div>
              {link.active ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input readOnly className="field" value={linkUrl(link.token)} onFocus={(event) => event.target.select()} aria-label="Assessment link" />
                  <button type="button" className="btn btn-primary shrink-0" onClick={() => void copy(link)}>
                    {copied === link.id ? "Copied" : "Copy link"}
                  </button>
                  <button type="button" className="btn btn-ghost shrink-0" onClick={() => void revoke(link.id)}>
                    Turn off
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        {!session.links.some((link) => link.active) ? (
          <button type="button" className="btn btn-primary mt-4" onClick={() => void createLink(14)}>
            Create a 14-day link
          </button>
        ) : null}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold">Need another link?</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {[7, 14, 30].map((days) => (
              <button key={days} type="button" className="btn btn-ghost" onClick={() => void createLink(days)}>
                {days} days
              </button>
            ))}
            <button type="button" className="btn btn-ghost" onClick={() => void createLink(null)}>
              No expiry
            </button>
          </div>
        </details>
        {notice ? <p className="mt-3 text-sm text-ink">{notice}</p> : null}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-serif text-2xl">Notes</h2>
        <label className="block text-sm">
          <span className="font-semibold">What reviewers see</span>
          <input className="field mt-2" value={focus} maxLength={240} onChange={(event) => setFocus(event.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Private notes</span>
          <textarea className="field mt-2 min-h-24" value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <button type="button" className="btn btn-ghost" onClick={() => void saveNotes()} disabled={notes === session.notes && focus === session.focus}>
          Save notes
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-3xl">Peer feedback</h2>
        {peers.length === 0 ? <p className="text-sm text-muted">No reviews yet. Send the link to one friend who will be honest.</p> : null}
        {peers.map((evaluation) => (
          <ReviewCard key={evaluation.id} evaluation={evaluation} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-3xl">Self-assessment</h2>
        <p className="text-sm text-muted">Your own scores stay out of the peer average.</p>
        {selfReview ? <ReviewCard evaluation={selfReview} /> : null}
        {!selfReview && !showSelf ? (
          <button type="button" className="btn btn-ghost" onClick={() => void openSelf()}>
            Score yourself
          </button>
        ) : null}
        {!selfReview && showSelf && rubric ? (
          <ReviewForm
            rubric={rubric}
            requireName={false}
            wellLabel="What did you do well?"
            improveLabel="What should you improve?"
            submitLabel="Save self-assessment"
            onSubmit={async (payload) => {
              const next = await api<SessionDetail>(`/api/sessions/${session.id}/self/`, {
                method: "POST",
                body: JSON.stringify(payload),
              });
              setSession(next);
              setShowSelf(false);
            }}
          />
        ) : null}
      </section>

      <section className="border-t border-line pt-6">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <p>Delete this session? Reviews on it will be removed too.</p>
            <button type="button" className="btn btn-danger" onClick={() => void remove()}>
              Delete
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="text-sm font-semibold text-ember" onClick={() => setConfirming(true)}>
            Delete session
          </button>
        )}
      </section>
    </div>
  );
}

function linkState(link: AssessmentLink) {
  if (link.revoked_at) return "Turned off";
  if (!link.active) return "Expired";
  if (link.expires_at) return `Expires ${formatWhen(link.expires_at)}`;
  return "No expiry";
}

function ReviewCard({ evaluation }: { evaluation: Evaluation }) {
  const marked = evaluation.checks.filter((check) => check.checked);
  const missed = evaluation.checks.filter((check) => !check.checked);
  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{evaluation.kind === "self" ? "You" : evaluation.evaluator_name}</h3>
        <p className="text-sm text-muted">
          {evaluation.kind === "self" ? "Self-assessment" : "Peer"} · {formatWhen(evaluation.submitted_at)} · {formatScore(evaluation.average)}
        </p>
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <ScoreBars scores={evaluation.scores} />
        <div className="space-y-4 text-sm leading-relaxed">
          <div>
            <p className="font-semibold">What worked</p>
            <p className="mt-1">{evaluation.strengths}</p>
          </div>
          <div>
            <p className="font-semibold">What to improve</p>
            <p className="mt-1">{evaluation.improvements}</p>
          </div>
          {evaluation.comments ? (
            <div>
              <p className="font-semibold">Other notes</p>
              <p className="mt-1">{evaluation.comments}</p>
            </div>
          ) : null}
        </div>
      </div>
      {marked.length ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Marked</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {marked.map((check) => (
              <li key={`${check.category}:${check.item_key}`} className="rounded-full bg-moss px-3 py-1 text-xs text-pine">
                {check.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {missed.length ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Not marked · {missed.length}
          </summary>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {missed.map((check) => (
              <li key={`${check.category}:${check.item_key}`}>{check.label}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}
