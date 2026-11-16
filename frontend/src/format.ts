export function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

export function formatDate(value: string) {
  const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMinutes(minutes: number) {
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

export function todayInput() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function linkUrl(token: string) {
  return `${window.location.origin}/assess/${token}`;
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function greeting(name: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${firstName(name)}`;
}

export function reviewCount(count: number) {
  return count === 1 ? "1 review" : `${count} reviews`;
}
