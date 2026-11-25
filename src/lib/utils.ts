import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const TZ = "Europe/Amsterdam";

export function fmtDateTime(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ, ...opts }).format(new Date(iso));
}

export function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
}

export function countdown(toIso: string, now: Date): string {
  const ms = new Date(toIso).getTime() - now.getTime();
  if (ms <= 0) return "verstreken";
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `${d}d ${h}u`;
  if (h > 0) return `${h}u ${mm}m`;
  return `${mm} min`;
}

export const pct = (x: number | undefined) => (x === undefined ? "–" : `${Math.round(x * 100)}%`);
export const num = (x: number | undefined, d = 0) => (x === undefined ? "–" : x.toLocaleString("nl-NL", { maximumFractionDigits: d, minimumFractionDigits: d }));
