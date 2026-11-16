import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { Shell } from "./components/Shell";

export default function App() {
  return <Outlet />;
}

export function Protected() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <p className="px-4 py-10 text-sm text-muted">Loading…</p>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <Shell />;
}
