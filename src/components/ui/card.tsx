import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4", className)} {...props} />;
}

export function CardTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-2", className)}>
      <h2 className="font-display text-lg font-bold uppercase tracking-wide">{children}</h2>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "ok" | "warn" | "bad" }) {
  const color = tone === "ok" ? "text-[var(--color-ok)]" : tone === "warn" ? "text-[var(--color-warn)]" : tone === "bad" ? "text-[var(--color-bad)]" : "";
  return (
    <div className="rounded-xl bg-[var(--color-surface-2)] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-[var(--color-muted)]">{label}</div>
      <div className={cn("font-display text-xl font-bold tabular", color)}>{value}</div>
      {hint && <div className="text-xs text-[var(--color-muted)]">{hint}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-[var(--color-muted)]">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "bad" | "ok"; children: ReactNode }) {
  const map = {
    info: "border-sky-500/40 bg-sky-500/10",
    warn: "border-yellow-400/40 bg-yellow-400/10",
    bad: "border-red-500/40 bg-red-500/10",
    ok: "border-emerald-500/40 bg-emerald-500/10",
  };
  return <div className={cn("rounded-xl border px-3 py-2 text-sm", map[tone])}>{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-[var(--color-surface-2)]", className)} aria-hidden />;
}
