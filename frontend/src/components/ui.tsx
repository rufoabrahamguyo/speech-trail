import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { SessionSummary } from "../types";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Logo({ inverted = false, className = "" }: { inverted?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-semibold tracking-tight", inverted ? "text-white" : "text-ink", className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" className={inverted ? "fill-white" : "fill-ink"} />
        <rect x="7" y="12" width="3.5" height="8" rx="1.5" className={inverted ? "fill-ink" : "fill-paper"} />
        <rect x="14.25" y="8" width="3.5" height="16" rx="1.5" className={inverted ? "fill-ink" : "fill-paper"} />
        <rect x="21.5" y="11" width="3.5" height="10" rx="1.5" className="fill-spark" />
      </svg>
      <span className="text-lg leading-none">SpeakTrack</span>
    </span>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      {hint ? <span className="mt-1 block text-sm text-muted">{hint}</span> : null}
      <div className="mt-2">{children}</div>
      {error ? <span className="mt-1.5 block text-sm text-ember">{error}</span> : null}
    </label>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  action,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">{eyebrow}</p> : null}
        <h1 className={cx("text-3xl font-semibold tracking-tight text-ink", eyebrow ? "mt-2" : "")}>{title}</h1>
        {lede ? <p className="mt-3 text-base leading-relaxed text-muted">{lede}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatusPill({ status }: { status: SessionSummary["status"] }) {
  const map = {
    ready: { label: "Not shared", className: "bg-paper text-muted ring-1 ring-line" },
    awaiting: { label: "Awaiting feedback", className: "bg-blush text-ember" },
    reviewed: { label: "Reviewed", className: "bg-moss text-pine" },
  } as const;
  const item = map[status];
  return <span className={cx("rounded-full px-2.5 py-1 text-xs font-semibold", item.className)}>{item.label}</span>;
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-blush px-5 py-4 text-sm text-ember">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-ghost mt-3" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function Quiet({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

function BackIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 4.5L7 10l5.5 5.5" />
    </svg>
  );
}

export function AuthLayout({
  title,
  lede,
  children,
  footer,
}: {
  title: string;
  lede: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <aside className="relative hidden min-h-screen overflow-hidden lg:block">
        <img src="/auth-stage.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[center_30%]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/55" />
        <Link to="/" className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-paper">
          <BackIcon />
          Back
        </Link>
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-10 text-center text-white">
          <Logo inverted />
          <p className="mt-8 max-w-xs text-3xl font-semibold leading-snug">Practice the talk. Keep the score.</p>
        </div>
      </aside>
      <div className="relative flex min-h-screen flex-col">
        <div className="px-4 pt-4 sm:px-8 sm:pt-6 lg:hidden">
          <Link to="/" className="btn btn-ghost">
            <BackIcon />
            Back
          </Link>
        </div>
        <main className="flex flex-1 flex-col px-6 py-10 sm:px-8">
          <div className="mx-auto my-auto w-full max-w-md">
            <div className="mb-8 flex flex-col items-center text-center">
              <Link to="/" className="inline-flex lg:hidden">
                <Logo />
              </Link>
              <h1 className="mt-8 text-2xl font-semibold tracking-tight lg:mt-0">{title}</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">{lede}</p>
            </div>
            {children}
            <p className="mt-8 text-center text-sm text-muted">{footer}</p>
          </div>
        </main>
      </div>
    </div>
  );
}
