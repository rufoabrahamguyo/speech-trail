import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import { firstName } from "../format";
import { Logo } from "./ui";

const links = [
  { to: "/app", label: "Dashboard", end: true, icon: DashboardIcon },
  { to: "/app/sessions", label: "Sessions", end: false, icon: SessionsIcon },
  { to: "/app/progress", label: "Progress", end: false, icon: ProgressIcon },
  { to: "/app/profile", label: "Profile", end: false, icon: ProfileIcon },
];

export function Shell() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function signOut() {
    logout();
    window.location.assign("/");
  }

  return (
    <div className="min-h-screen lg:pl-64">
      <a href="#main" className="sr-only z-50 rounded-lg bg-card px-4 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <Sidebar userName={user?.name ?? ""} email={user?.email ?? ""} onSignOut={signOut} />
      </aside>
      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
            <Sidebar userName={user?.name ?? ""} email={user?.email ?? ""} onSignOut={signOut} onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-card/95 px-4 backdrop-blur sm:px-8 lg:hidden">
        <button type="button" className="btn btn-ghost !px-2" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
          <MenuIcon />
        </button>
        <Logo />
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

function Sidebar({
  userName,
  email,
  onSignOut,
  onNavigate,
}: {
  userName: string;
  email: string;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  const initial = firstName(userName || email || "S").slice(0, 1).toUpperCase();
  return (
    <div className="flex h-full flex-col bg-ink px-3 py-5">
      <div className="mb-8 px-3">
        <Link to="/app" onClick={onNavigate} aria-label="SpeakTrack dashboard">
          <Logo inverted />
        </Link>
      </div>
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <link.icon />
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 px-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-semibold text-white" aria-hidden="true">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{userName || "Your account"}</p>
            <p className="truncate text-xs text-white/70">{email}</p>
          </div>
        </div>
        <button type="button" onClick={onSignOut} className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">
          <LogoutIcon />
          Sign out
        </button>
      </div>
    </div>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function SessionsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 6h11M8 12h11M8 18h11" strokeLinecap="round" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 19V5M4 19h16" strokeLinecap="round" />
      <path d="M7 15l4-4 3 2 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 19c1.4-3 3.8-4.5 7-4.5S17.6 16 19 19" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 7V5a1 1 0 0 1 1-1h8v16h-8a1 1 0 0 1-1-1v-2" strokeLinecap="round" />
      <path d="M4 12h10M11 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}
