import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, isApiError } from "../api";
import { ReviewForm } from "../components/ReviewForm";
import { Logo, Quiet } from "../components/ui";
import { formatDate, formatMinutes } from "../format";
import type { PublicAssessment, ReviewPayload } from "../types";
import { useTitle } from "../useTitle";

const closedCopy = {
  revoked: "This assessment link has been turned off.",
  expired: "This assessment link has expired.",
};

export function Assess() {
  const { token = "" } = useParams();
  const [page, setPage] = useState<PublicAssessment | null>(null);
  const [error, setError] = useState("");
  const [doneName, setDoneName] = useState("");
  useTitle(page ? `Evaluate ${page.speaker_name} · SpeakTrack` : "Evaluate a session · SpeakTrack");

  useEffect(() => {
    let alive = true;
    api<PublicAssessment>(`/api/assess/${token}/`)
      .then((next) => {
        if (alive) setPage(next);
      })
      .catch((caught) => {
        if (alive) setError(isApiError(caught) ? caught.message : "Could not reach SpeakTrack.");
      });
    return () => {
      alive = false;
    };
  }, [token]);

  async function submit(payload: ReviewPayload) {
    await api(`/api/assess/${token}/`, { method: "POST", body: JSON.stringify(payload) });
    setDoneName(payload.evaluator_name || "there");
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6 sm:py-10">
      <Link to="/" className="inline-flex" aria-label="SpeakTrack home">
        <Logo />
      </Link>
      {error ? (
        <div className="card mt-8 p-6">
          <h1 className="font-serif text-4xl">This link is not available</h1>
          <p className="mt-3 text-muted">{error}</p>
        </div>
      ) : null}
      {!error && !page ? <Quiet>Loading the session…</Quiet> : null}
      {page && doneName ? (
        <div className="card mt-8 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Guest evaluation</p>
          <h1 className="mt-2 font-serif text-4xl">Thank you, {doneName}.</h1>
          <p className="mt-3 max-w-xl text-muted">{page.speaker_name} will see this in their SpeakTrack dashboard. You do not need an account.</p>
          <Link to="/signup" className="mt-6 inline-block text-sm font-semibold text-brand">
            Practice your own speaking
          </Link>
        </div>
      ) : null}
      {page && !doneName ? (
        <div className="mt-8 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Guest evaluation</p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Evaluate a speaking session</h1>
            <p className="mt-2 text-muted">You're helping someone become a better communicator.</p>
          </div>
          <section className="card p-5 sm:p-6">
            <dl className="grid gap-5 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Speaker</dt>
                <dd className="mt-1 font-serif text-3xl">{page.speaker_name}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Topic</dt>
                <dd className="mt-1 font-serif text-3xl">{page.topic}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Speaking time</dt>
                <dd className="mt-1 text-lg">{formatMinutes(page.duration_minutes)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Date</dt>
                <dd className="mt-1 text-lg">{formatDate(page.practiced_on)}</dd>
              </div>
            </dl>
            {page.focus ? (
              <p className="mt-5 rounded-2xl bg-blush px-4 py-3 text-sm">
                <span className="font-semibold">They asked you to watch: </span>
                {page.focus}
              </p>
            ) : null}
          </section>
          {page.viewer_is_owner ? (
            <div className="card p-6">
              <h2 className="font-serif text-3xl">This is your session</h2>
              <p className="mt-2 text-muted">Use a self-assessment on the session page. Peer scores should come from someone else.</p>
              {page.session_id ? (
                <Link to={`/app/sessions/${page.session_id}`} className="btn btn-primary mt-4">
                  Open session
                </Link>
              ) : null}
            </div>
          ) : null}
          {!page.active && !page.viewer_is_owner ? (
            <div className="card p-6">
              <h2 className="font-serif text-3xl">This link is closed</h2>
              <p className="mt-2 text-muted">{page.closed_reason ? closedCopy[page.closed_reason] : "This assessment link is closed."}</p>
            </div>
          ) : null}
          {page.active && !page.viewer_is_owner ? (
            <>
              <h2 className="font-serif text-3xl">Rate each category</h2>
              <ReviewForm
                rubric={page.rubric}
                requireName
                wellLabel="What did the speaker do well?"
                improveLabel="What should the speaker improve?"
                submitLabel="Submit evaluation"
                onSubmit={submit}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
