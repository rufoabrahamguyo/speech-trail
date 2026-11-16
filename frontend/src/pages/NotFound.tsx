import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { useTitle } from "../useTitle";

export function NotFound() {
  useTitle("Not found · SpeakTrack");
  const { user } = useAuth();
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">404</p>
      <h1 className="mt-2 font-serif text-5xl">That page is not on SpeakTrack.</h1>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="btn btn-ghost">
          Home
        </Link>
        {user ? (
          <Link to="/app" className="btn btn-primary">
            Dashboard
          </Link>
        ) : null}
      </div>
    </div>
  );
}
