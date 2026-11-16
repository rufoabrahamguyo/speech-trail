export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;

  constructor(status: number, message: string, fields: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

let refreshPromise: Promise<boolean> | null = null;

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("st_access", access);
  localStorage.setItem("st_refresh", refresh);
}

export function clearTokens() {
  localStorage.removeItem("st_access");
  localStorage.removeItem("st_refresh");
}

async function doRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem("st_refresh");
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = (await res.json()) as { access: string; refresh?: string };
    localStorage.setItem("st_access", data.access);
    if (data.refresh) localStorage.setItem("st_refresh", data.refresh);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

function refreshAccess() {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function toError(res: Response): Promise<ApiError> {
  const data = (await res.json().catch(() => null)) as unknown;
  const fields: Record<string, string> = {};
  let message = "Something went wrong. Try again.";
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") message = record.detail;
    else if (Array.isArray(record.detail) && record.detail.length) message = String(record.detail[0]);
    for (const [key, value] of Object.entries(record)) {
      if (key === "detail") continue;
      if (Array.isArray(value) && value.length) fields[key] = String(value[0]);
      else if (typeof value === "string") fields[key] = value;
    }
    if (message === "Something went wrong. Try again." && Object.values(fields)[0]) {
      message = Object.values(fields)[0];
    }
  }
  return new ApiError(res.status, message, fields);
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const access = localStorage.getItem("st_access");
  if (access) headers.set("Authorization", `Bearer ${access}`);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, "Could not reach SpeakTrack.", {});
  }

  const skipRefresh =
    path.startsWith("/api/auth/login") ||
    path.startsWith("/api/auth/register") ||
    path.startsWith("/api/auth/google") ||
    path.startsWith("/api/auth/refresh");
  if (res.status === 401 && retry && !skipRefresh) {
    const refreshed = await refreshAccess();
    if (refreshed) return api<T>(path, options, false);
    clearTokens();
    window.dispatchEvent(new Event("st-auth-lost"));
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
