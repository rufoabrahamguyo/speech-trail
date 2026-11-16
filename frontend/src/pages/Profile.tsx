import { useState, type FormEvent } from "react";
import { api, isApiError } from "../api";
import { useAuth } from "../auth";
import { Field, PageHeader } from "../components/ui";
import type { User } from "../types";
import { useTitle } from "../useTitle";

export function Profile() {
  useTitle("Profile · SpeakTrack");
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [aim, setAim] = useState(user?.aim ?? "");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  if (!user) return null;

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");
    try {
      const next = await api<User>("/api/auth/me/", {
        method: "PATCH",
        body: JSON.stringify({ name, aim }),
      });
      updateUser(next);
      setProfileMessage("Profile saved.");
    } catch (caught) {
      setProfileError(isApiError(caught) ? caught.message : "Could not save your profile.");
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    setFields({});
    try {
      await api<{ detail: string }>("/api/auth/password/", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("Password updated.");
    } catch (caught) {
      if (isApiError(caught)) {
        setFields(caught.fields);
        setPasswordError(caught.message);
      } else setPasswordError("Could not reach SpeakTrack.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow="Account" title="Profile" lede="Your name is what a friend sees at the top of an evaluation." />
      <form onSubmit={saveProfile} className="card space-y-4 p-5" noValidate>
        <Field label="Name">
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Speaking aim" hint="A sentence about what you are practicing.">
          <input className="field" value={aim} onChange={(event) => setAim(event.target.value)} />
        </Field>
        <Field label="Email" hint="This stays as your login.">
          <input className="field" value={user.email} disabled />
        </Field>
        {profileError ? <p className="text-sm text-ember">{profileError}</p> : null}
        {profileMessage ? <p className="text-sm text-pine">{profileMessage}</p> : null}
        <button className="btn btn-primary" type="submit">
          Save profile
        </button>
      </form>
      <form onSubmit={savePassword} className="card space-y-4 p-5" noValidate>
        <h2 className="font-serif text-2xl">Password</h2>
        <Field label="Current password" error={fields.current_password}>
          <input className="field" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        </Field>
        <Field label="New password" hint="At least 8 characters." error={fields.new_password}>
          <input className="field" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        </Field>
        {passwordError ? <p className="text-sm text-ember">{passwordError}</p> : null}
        {passwordMessage ? <p className="text-sm text-pine">{passwordMessage}</p> : null}
        <button className="btn btn-ghost" type="submit">
          Update password
        </button>
      </form>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => {
          logout();
          window.location.assign("/");
        }}
      >
        Log out
      </button>
    </div>
  );
}
