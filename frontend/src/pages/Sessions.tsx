import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, isApiError } from "../api";
import { ErrorNote, PageHeader, Quiet, StatusPill } from "../components/ui";
import { formatDate, formatMinutes, formatScore } from "../format";
import type { SessionSummary } from "../types";
import { useTitle } from "../useTitle";

const filters = [
  { id: "all", label: "All" },
  { id: "awaiting", label: "Awaiting" },
  { id: "reviewed", label: "Reviewed" },
] as const;

export function Sessions() {
  useTitle("Sessions · SpeakTrack");
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");

  function load() {
    setError("");
    api<SessionSummary[]>("/api/sessions/")
      .then(setSessions)
      .catch((caught) => setError(isApiError(caught) ? caught.message : "Could not reach SpeakTrack."));
  }

  useEffect(() => {
    load();
  }, []);

  const visible = (sessions ?? []).filter((session) => (filter === "all" ? true : session.status === filter));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="History"
        title="Sessions"
        lede="Every practice you save, with the peer score once a friend responds."
        action={
          <Link to="/app/sessions/new" className="btn btn-primary">
            New session
          </Link>
        }
      />
      <div className="flex gap-2" role="group" aria-label="Filter sessions">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={filter === item.id ? "btn btn-primary" : "btn btn-ghost"}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error ? <ErrorNote message={error} onRetry={load} /> : null}
      {!sessions && !error ? <Quiet>Loading sessions…</Quiet> : null}
      {sessions && visible.length === 0 ? (
        <div className="card p-6">
          <p className="font-serif text-2xl">Nothing in this list yet.</p>
          <p className="mt-2 text-sm text-muted">Start with one topic and a three-minute talk.</p>
          <Link to="/app/sessions/new" className="btn btn-primary mt-4">
            New session
          </Link>
        </div>
      ) : null}
      <ul className="space-y-3">
        {visible.map((session) => (
          <li key={session.id}>
            <Link to={`/app/sessions/${session.id}`} className="card block px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{session.topic}</p>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(session.practiced_on)} · {formatMinutes(session.duration_minutes)}
                    {session.prompt_label ? ` · ${session.prompt_label}` : ""}
                  </p>
                </div>
                <StatusPill status={session.status} />
              </div>
              <p className="mt-3 text-sm text-muted">
                {session.peer_count === 0 ? "No peer score yet" : `${formatScore(session.peer_average)} average · ${session.peer_count} peer ${session.peer_count === 1 ? "review" : "reviews"}`}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
