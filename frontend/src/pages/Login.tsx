import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { isApiError } from "../api";
import { useAuth } from "../auth";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { AuthLayout, Field, Quiet } from "../components/ui";
import { useTitle } from "../useTitle";

export function Login() {
  useTitle("Log in · SpeakTrack");
  const { user, ready, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!ready) return <Quiet>Loading…</Quiet>;
  if (user) return <Navigate to="/app" replace />;

  const next = params.get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";

  async function signInWithGoogle(credential: string) {
    setSaving(true);
    setError("");
    try {
      await loginWithGoogle(credential);
      navigate(dest, { replace: true });
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : "Could not reach SpeakTrack.");
      setSaving(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await login(email.trim(), password);
      navigate(dest, { replace: true });
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : "Could not reach SpeakTrack.");
      setSaving(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      lede="Log in to record a session or read the reviews waiting for you."
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-semibold text-ink">
            Create an account
          </Link>
        </>
      }
    >
      {error ? <p className="mb-4 text-sm text-ember">{error}</p> : null}
      <GoogleSignInButton onCredential={signInWithGoogle} disabled={saving} onError={setError} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email">
          <input className="field" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password">
          <input className="field" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </Field>
        <button className="btn btn-primary w-full" type="submit" disabled={saving}>
          {saving ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
}
