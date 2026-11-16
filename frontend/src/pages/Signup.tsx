import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { isApiError } from "../api";
import { useAuth } from "../auth";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { AuthLayout, Field } from "../components/ui";
import { useTitle } from "../useTitle";

export function Signup() {
  useTitle("Create an account · SpeakTrack");
  const { user, ready, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [aim, setAim] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!ready) return null;
  if (user) return <Navigate to="/app" replace />;

  async function signInWithGoogle(credential: string) {
    setSaving(true);
    setError("");
    try {
      await loginWithGoogle(credential);
      navigate("/app", { replace: true });
    } catch (caught) {
      if (isApiError(caught)) setError(caught.message);
      else setError("Could not reach SpeakTrack.");
      setSaving(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setFields({});
    try {
      await register({ name: name.trim(), email: email.trim(), password, aim: aim.trim() });
      navigate("/app", { replace: true });
    } catch (caught) {
      if (isApiError(caught)) {
        setFields(caught.fields);
        setError(caught.message);
      } else {
        setError("Could not reach SpeakTrack.");
      }
      setSaving(false);
    }
  }

  return (
    <AuthLayout
      title="Start a speaking practice"
      lede="Your name is what friends see on the evaluation. Email is only for logging in."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-ink">
            Log in
          </Link>
        </>
      }
    >
      {error ? <p className="mb-4 text-sm text-ember">{error}</p> : null}
      <GoogleSignInButton onCredential={signInWithGoogle} disabled={saving} onError={setError} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Name" error={fields.name}>
          <input className="field" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Email" error={fields.email}>
          <input className="field" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password" hint="At least 8 characters." error={fields.password}>
          <input className="field" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </Field>
        <Field label="What do you want to get better at?" hint="Optional. It shows on your dashboard." error={fields.aim}>
          <input className="field" value={aim} onChange={(event) => setAim(event.target.value)} placeholder="Shorter openings, fewer filler words" />
        </Field>
        <button className="btn btn-primary w-full" type="submit" disabled={saving}>
          {saving ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
