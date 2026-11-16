import { useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../components/ui";
import { useTitle } from "../useTitle";

const steps = [
  ["Create a session", "Pick a topic and a few minutes. Say what you want a friend to watch."],
  ["Share one link", "The link is private to that session. Your friend does not need an account."],
  ["Read the pattern", "Five scores, the same checklist, and the average of each skill over time."],
];

const pillars = [
  ["Peer feedback", "One rubric every time, so a friend's notes are comparable to the last session."],
  ["Daily practice", "A prompt is ready when you do not have a topic. Speak, then send the link."],
  ["Progress by skill", "Confidence, voice, content, audience, and language each keep their own average."],
];

const faqs = [
  ["Do friends need an account?", "No. They open the link, rate the five categories, and write what to keep and what to change."],
  ["Can I score myself?", "Yes. A self-assessment sits on the session, and it stays out of the peer averages."],
  ["What does the link share?", "The topic, the time, and the note you wrote for them. Your email and private notes stay hidden."],
  ["How do I know what improved?", "Progress compares category averages across reviews, instead of collapsing a talk into one number."],
];

const scores = [
  ["Confidence and presence", 4],
  ["Voice and delivery", 3],
  ["Content and organization", 5],
  ["Audience engagement", 4],
  ["Language and articulation", 4],
];

export function Landing() {
  useTitle("SpeakTrack");
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="bg-paper text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-ink">
        Skip to content
      </a>

      <section className="relative min-h-[100svh] overflow-hidden bg-[#011f4b] text-white">
        <img
          src="/landing-stage.jpg"
          alt="A speaker looking out at a full auditorium"
          className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#011f4b] via-[#011f4b]/80 to-[#011f4b]/45 md:bg-gradient-to-r md:from-[#011f4b] md:via-[#011f4b]/80 md:to-[#011f4b]/15" />
        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Logo inverted />
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-white/90 hover:text-white">
              Log in
            </Link>
            <Link to="/signup" className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:bg-paper">
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Start practicing</span>
            </Link>
          </div>
        </header>
        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-5.5rem)] max-w-6xl items-end px-4 pb-16 sm:px-6 sm:pb-20 md:items-center md:pb-0">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Public speaking practice</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Practice the talk. Keep the score.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/80 sm:text-lg">
              One session, one link, five scores from a friend. SpeakTrack shows which skill actually moved.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-ink hover:bg-paper">
                Get started
              </Link>
              <a href="#how-it-works" className="rounded-lg px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/10">
                How it works
              </a>
            </div>
          </div>
        </div>
      </section>

      <main id="main">
        <section id="how-it-works" className="bg-[#e8eef6]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Three steps</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From a topic to a review</h2>
              <ol className="mt-10 space-y-8">
                {steps.map(([title, body], index) => (
                  <li key={title} className="flex gap-4">
                    <span className="text-2xl font-semibold tabular-nums text-spark">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="overflow-hidden rounded-[1.75rem] bg-[#5b86ad] shadow-[0_24px_80px_-28px_rgba(1,31,75,0.45)]">
              <img
                src="/landing-podium.png"
                alt="Silhouette of a speaker at a podium, facing an audience"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 md:pb-28">
            <div className="rounded-[1.75rem] border border-line bg-white p-5 shadow-card sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
                <div>
                  <p className="text-sm font-semibold">Is technology making us smarter?</p>
                  <p className="mt-0.5 text-xs text-muted">Nora · 3 minutes</p>
                </div>
                <span className="rounded-lg bg-moss px-2.5 py-1 text-[11px] font-semibold text-pine">4.2 avg</span>
              </div>
              <ul className="mt-5 grid gap-x-10 gap-y-3 md:grid-cols-2">
                {scores.map(([label, score]) => (
                  <li key={String(label)}>
                    <div className="flex justify-between text-sm">
                      <span>{label}</span>
                      <span className="font-semibold tabular-nums">{score}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-line">
                      <div className="h-1.5 rounded-full bg-brand" style={{ width: `${(Number(score) / 5) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="relative isolate min-h-[28rem] overflow-hidden bg-[#011f4b] text-white">
          <img
            src="/landing-mic.jpg"
            alt="A microphone in front of a blurred crowd"
            className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#011f4b]/90 via-[#011f4b]/70 to-[#011f4b]/25" />
          <div className="relative z-10 mx-auto flex min-h-[28rem] max-w-6xl items-center px-4 py-20 sm:px-6">
            <div className="max-w-lg">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Voice and delivery</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">What a friend hears, written down.</h2>
              <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
                Pace, pauses, and filler words sit on the same checklist every session, next to confidence, content, audience, and language.
              </p>
              <a href="#rubric" className="mt-8 inline-flex text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
                See the five categories
              </a>
            </div>
          </div>
        </section>

        <section className="bg-[#011f4b] text-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Why SpeakTrack</h2>
              <p className="mt-4 text-base text-white/70 sm:text-lg">A record of practice, not a single score you forget by next week.</p>
            </div>
            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {pillars.map(([title, body]) => (
                <div key={title} className="border-t border-white/15 pt-6">
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/65 sm:text-base">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="rubric" className="bg-[#e8eef6]">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">The same five categories, every time</h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                ["Confidence and presence", "Posture, eye contact, composure."],
                ["Voice and delivery", "Clarity, pace, pauses, filler words."],
                ["Content and organization", "A point, a structure, a close."],
                ["Audience engagement", "One listener, not a performance."],
                ["Language and articulation", "Words a person can actually follow."],
              ].map(([title, body]) => (
                <li key={title} className="rounded-2xl bg-white px-5 py-4 shadow-[0_16px_48px_-28px_rgba(1,31,75,0.35)]">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight">Questions</h2>
            <div className="mt-6">
              {faqs.map(([question, answer], index) => {
                const open = openFaq === index;
                return (
                  <div key={question} className="border-b border-line">
                    <button type="button" className="flex w-full items-center justify-between gap-4 py-5 text-left" aria-expanded={open} onClick={() => setOpenFaq(open ? -1 : index)}>
                      <span className="text-base font-semibold sm:text-lg">{question}</span>
                      <span className={`grid h-8 w-8 place-items-center rounded-full border text-lg ${open ? "border-ink bg-ink text-white" : "border-line text-muted"}`} aria-hidden="true">
                        +
                      </span>
                    </button>
                    {open ? <p className="pb-5 pr-12 text-sm leading-relaxed text-muted sm:text-base">{answer}</p> : null}
                  </div>
                );
              })}
            </div>
            <Link to="/signup" className="btn btn-primary mt-10">
              Start practicing
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-white/10 bg-[#011f4b] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div>
            <Logo inverted />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">Practice the talk. Keep the score.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-16 gap-y-3 text-sm font-semibold">
            <a href="#how-it-works" className="text-white/80 hover:text-white">
              How it works
            </a>
            <a href="#rubric" className="text-white/80 hover:text-white">
              Rubric
            </a>
            <Link to="/login" className="text-white/80 hover:text-white">
              Log in
            </Link>
            <Link to="/signup" className="text-white/80 hover:text-white">
              Start practicing
            </Link>
          </nav>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-white/50 sm:px-6">© {new Date().getFullYear()} SpeakTrack</p>
        </div>
      </footer>
    </div>
  );
}
