"use client";
import { useBundle } from "@/components/providers/game-data";
import { MockBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { useApp } from "@/state/store";
import { useRules } from "@/lib/client/hooks";

/** Toont altijd de herkomst van de data en (in demomodus) de demoklok. */
export function DataBanner() {
  const bundle = useBundle();
  const { rules } = useRules();
  const clock = useApp((s) => s.demoClock[bundle.gameId]);
  const set = useApp((s) => s.set);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
      {bundle.meta.isMock && <MockBadge />}
      {rules.verification.status === "unverified" && (
        <span className="rounded-full border border-yellow-400/50 px-2 py-0.5 text-yellow-300" title={rules.verification.notes}>
          Spelregels nog niet gevalideerd
        </span>
      )}
      {bundle.meta.isMock && bundle.demoClocks.length > 1 && (
        <label className="flex items-center gap-2">
          <span className="whitespace-nowrap">Demoklok:</span>
          <Select
            aria-label="Demoklok"
            className="h-8 w-auto min-w-0 max-w-[62vw] truncate py-0 text-xs md:max-w-none"
            value={clock ?? bundle.demoClocks[0].id}
            onChange={(e) => set((s) => ({ demoClock: { ...s.demoClock, [bundle.gameId]: e.target.value } }))}
          >
            {bundle.demoClocks.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </label>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-extrabold uppercase leading-none md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingBlock({ label = "Berekenen…" }: { label?: string }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <div className="h-24 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
      <div className="h-64 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
      <p className="font-semibold">Dit lukte niet</p>
      <p className="text-[var(--color-muted)]">{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-semibold text-[var(--color-accent)] underline">
          Opnieuw proberen
        </button>
      )}
    </div>
  );
}
