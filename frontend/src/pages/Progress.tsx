import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, isApiError } from "../api";
import { ErrorNote, PageHeader, Quiet } from "../components/ui";
import { formatDate, formatScore, formatWhen } from "../format";
import type { Progress as ProgressData } from "../types";
import { useTitle } from "../useTitle";

export function Progress() {
  useTitle("Progress · SpeakTrack");
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [error, setError] = useState("");

  function load() {
    setError("");
    api<ProgressData>("/api/progress/")
      .then(setProgress)
      .catch((caught) => setError(isApiError(caught) ? caught.message : "Could not reach SpeakTrack."));
  }

  useEffect(() => {
    load();
  }, []);

  if (error) return <ErrorNote message={error} onRetry={load} />;
  if (!progress) return <Quiet>Loading progress…</Quiet>;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Over time"
        title="Progress"
        lede="Peer scores, averaged by category. A self-assessment is kept separate so it does not move these numbers."
      />
      {progress.peer_reviews === 0 ? (
        <div className="card p-6">
          <p className="font-serif text-3xl">Two peer reviews make a trend.</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Until a friend scores a session, there is no average to compare. Record a talk and send one link.
          </p>
          <Link to="/app/sessions/new" className="btn btn-primary mt-4">
            New session
          </Link>
        </div>
      ) : (
        <>
          {progress.next_focus ? (
            <section className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                {progress.categories_close ? "Categories are close" : `Practice next · ${progress.next_focus.label}`}
              </p>
              <p className="mt-2 text-lg leading-relaxed">
                {progress.next_focus.advice ??
                  "The categories are close so far. Another review will make the pattern clearer."}
              </p>
            </section>
          ) : null}
          <section className="card p-5">
            <h2 className="font-serif text-2xl">Category averages</h2>
            <p className="mt-1 text-sm text-muted">Based on {progress.peer_reviews} peer {progress.peer_reviews === 1 ? "review" : "reviews"}.</p>
            <ul className="mt-5 space-y-4">
              {progress.categories.map((category) => (
                <li key={category.key}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-semibold">{category.label}</span>
                    <span className="text-muted">
                      <span className="font-semibold tabular-nums text-ink">{formatScore(category.average)}</span>
                      {" · "}
                      <Delta value={category.delta} />
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-line">
                    <div
                      className="h-2 rounded-full bg-brand"
                      style={{ width: `${category.average == null ? 0 : (category.average / 5) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <TrendChart points={progress.timeline.filter((point) => point.average != null).map((point) => ({ average: point.average as number, label: formatDate(point.submitted_at) }))} />
          <section className="grid gap-4 md:grid-cols-2">
            <WatchList
              title={progress.watch_mode === "recurring" ? "Often missed" : "Not marked last time"}
              empty="No repeated gaps yet."
              items={progress.watchouts}
              tone="miss"
            />
            <WatchList title="Often marked" empty="Marked observations will show up here." items={progress.strengths} tone="hit" />
          </section>
          <section>
            <h2 className="font-serif text-2xl">Review timeline</h2>
            <ul className="mt-4 space-y-3">
              {[...progress.timeline].reverse().map((point) => (
                <li key={point.id}>
                  <Link to={`/app/sessions/${point.session_id}`} className="card flex items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="font-semibold">{point.topic}</p>
                      <p className="mt-1 text-sm text-muted">
                        {point.evaluator_name} · {formatWhen(point.submitted_at)}
                      </p>
                    </div>
                    <p className="font-serif text-3xl tabular-nums">{formatScore(point.average)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value == null) return <span>Need another review</span>;
  if (Math.abs(value) < 0.05) return <span>Holding steady</span>;
  const up = value > 0;
  return <span className={up ? "text-pine" : "text-ember"}>{up ? "Up" : "Down"} {Math.abs(value).toFixed(1)}</span>;
}

function WatchList({
  title,
  empty,
  items,
  tone,
}: {
  title: string;
  empty: string;
  items: ProgressData["watchouts"];
  tone: "miss" | "hit";
}) {
  return (
    <section className="card p-5">
      <h2 className="font-serif text-2xl">{title}</h2>
      {items.length === 0 ? <p className="mt-3 text-sm text-muted">{empty}</p> : null}
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={`${item.category}:${item.item_key}`}>
            <p className="text-sm">{item.label}</p>
            <p className={tone === "hit" ? "text-xs text-pine" : "text-xs text-ember"}>
              {tone === "hit" ? `Marked in ${item.checked} of ${item.total}` : `Missed in ${item.missed} of ${item.total}`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TrendChart({ points }: { points: { average: number; label: string }[] }) {
  if (points.length === 0) return null;
  const width = 640;
  const height = 180;
  const pad = 18;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;
  const xFor = (index: number) => pad + (points.length === 1 ? plotW / 2 : (plotW * index) / (points.length - 1));
  const yFor = (value: number) => pad + ((5 - value) / 4) * plotH;
  const line = points.map((point, index) => `${xFor(index)},${yFor(point.average)}`).join(" ");
  const summary = `Peer average from ${points[0].label} at ${points[0].average.toFixed(1)} to ${points[points.length - 1].label} at ${points[points.length - 1].average.toFixed(1)}.`;
  return (
    <section className="card p-5">
      <h2 className="font-serif text-2xl">Peer average</h2>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full" role="img" aria-label={summary}>
        {[1, 3, 5].map((tick) => (
          <g key={tick}>
            <line x1={pad} x2={width - pad} y1={yFor(tick)} y2={yFor(tick)} stroke="#b3cde0" />
            <text x="0" y={yFor(tick) + 4} fontSize="11" fill="#3d5a73">
              {tick}
            </text>
          </g>
        ))}
        <polyline fill="none" stroke="#011f4b" strokeWidth="2.5" points={line} />
        {points.map((point, index) => (
          <circle key={`${point.label}-${index}`} cx={xFor(index)} cy={yFor(point.average)} r="4" fill="#005b96" />
        ))}
      </svg>
      <p className="mt-2 text-sm text-muted">
        {points[0].label}
        {points.length > 1 ? ` to ${points[points.length - 1].label}` : ""}
      </p>
    </section>
  );
}
