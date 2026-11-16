import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, isApiError } from "../api";
import { Field, PageHeader } from "../components/ui";
import { todayInput } from "../format";
import type { SessionDetail, TopicSuggestion } from "../types";
import { useTitle } from "../useTitle";

const durations = [1, 2, 3, 5, 7, 10];
const tags = [
  { tag: "", label: "Any" },
  { tag: "impromptu", label: "Impromptu" },
  { tag: "persuasive", label: "Persuasive" },
  { tag: "story", label: "Story" },
  { tag: "work", label: "Work" },
  { tag: "reflective", label: "Reflective" },
];

export function NewSession() {
  useTitle("New session · SpeakTrack");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [topic, setTopic] = useState(params.get("topic") ?? "");
  const [promptTag, setPromptTag] = useState(params.get("tag") ?? "");
  const [tagFilter, setTagFilter] = useState(params.get("tag") ?? "");
  const [duration, setDuration] = useState(3);
  const [practicedOn, setPracticedOn] = useState(todayInput());
  const [focus, setFocus] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  async function suggest() {
    setSuggesting(true);
    const query = new URLSearchParams();
    if (tagFilter) query.set("tag", tagFilter);
    if (topic) query.set("avoid", topic);
    try {
      const suggestion = await api<TopicSuggestion>(`/api/topics/random/?${query.toString()}`);
      setTopic(suggestion.topic);
      setPromptTag(suggestion.tag);
      setError("");
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : "Could not load a topic.");
    } finally {
      setSuggesting(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setFields({});
    try {
      const session = await api<SessionDetail>("/api/sessions/", {
        method: "POST",
        body: JSON.stringify({
          topic,
          duration_minutes: duration,
          practiced_on: practicedOn,
          focus,
          notes,
          prompt_tag: promptTag,
        }),
      });
      navigate(`/app/sessions/${session.id}`, { state: { fresh: true } });
    } catch (caught) {
      if (isApiError(caught)) {
        setFields(caught.fields);
        setError(caught.message);
      } else setError("Could not reach SpeakTrack.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Practice"
        title="New session"
        lede="Speak first. The link for a friend is ready as soon as you save."
      />
      <form onSubmit={submit} className="card space-y-5 p-5 sm:p-6" noValidate>
        <Field label="Topic" error={fields.topic}>
          <textarea className="field min-h-24" value={topic} maxLength={180} onChange={(event) => { setTopic(event.target.value); setPromptTag(""); }} placeholder="What will you speak about?" />
        </Field>
        <div>
          <p className="text-sm font-semibold">Suggest a topic</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.label}
                type="button"
                aria-pressed={tagFilter === tag.tag}
                onClick={() => setTagFilter(tag.tag)}
                className={tagFilter === tag.tag ? "btn btn-primary px-3 py-1.5" : "btn btn-ghost px-3 py-1.5"}
              >
                {tag.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => void suggest()} disabled={suggesting}>
            {suggesting ? "Finding one…" : "Suggest a topic"}
          </button>
        </div>
        <div>
          <p className="text-sm font-semibold">Speaking time</p>
          <p className="mt-1 text-sm text-muted">Friends see this time on the evaluation.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {durations.map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={duration === minutes}
                onClick={() => setDuration(minutes)}
                className={duration === minutes ? "btn btn-primary px-3 py-1.5" : "btn btn-ghost px-3 py-1.5"}
              >
                {minutes} min
              </button>
            ))}
          </div>
        </div>
        <Field label="Date" error={fields.practiced_on}>
          <input className="field" type="date" value={practicedOn} onChange={(event) => setPracticedOn(event.target.value)} />
        </Field>
        <Field label="What should they watch?" hint="Shown on the evaluation. Optional." error={fields.focus}>
          <input className="field" value={focus} maxLength={240} onChange={(event) => setFocus(event.target.value)} placeholder="Watch my opening and my pace." />
        </Field>
        <Field label="Private notes" hint="Only you can see this." error={fields.notes}>
          <textarea className="field min-h-24" value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        {error ? <p className="text-sm text-ember">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save session and get a link"}
        </button>
      </form>
    </div>
  );
}
