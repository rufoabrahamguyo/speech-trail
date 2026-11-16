import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, clearTokens, setTokens } from "./api";
import type { AuthResponse, User } from "./types";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  aim?: string;
};

type AuthValue = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const boot = async () => {
      if (!localStorage.getItem("st_access")) {
        if (alive) setReady(true);
        return;
      }
      try {
        const me = await api<User>("/api/auth/me/");
        if (alive) setUser(me);
      } catch {
        clearTokens();
        if (alive) setUser(null);
      } finally {
        if (alive) setReady(true);
      }
    };
    void boot();
    const onLost = () => setUser(null);
    window.addEventListener("st-auth-lost", onLost);
    return () => {
      alive = false;
      window.removeEventListener("st-auth-lost", onLost);
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      async login(email, password) {
        const data = await api<AuthResponse>("/api/auth/login/", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setTokens(data.access, data.refresh);
        setUser(data.user);
      },
      async loginWithGoogle(credential) {
        const data = await api<AuthResponse>("/api/auth/google/", {
          method: "POST",
          body: JSON.stringify({ credential }),
        });
        setTokens(data.access, data.refresh);
        setUser(data.user);
      },
      async register(input) {
        const data = await api<AuthResponse>("/api/auth/register/", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setTokens(data.access, data.refresh);
        setUser(data.user);
      },
      logout() {
        clearTokens();
        setUser(null);
      },
      updateUser(next) {
        setUser(next);
      },
    }),
    [ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
