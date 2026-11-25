"use client";
import { useBundle, useIndex, useNow } from "@/components/providers/game-data";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { useRules } from "@/lib/client/hooks";
import { demoHistory } from "@/lib/client/champcoach";
import { useApp } from "@/state/store";
import { cn, countdown, fmtDateTime } from "@/lib/utils";

const DAYS = [
  { d: 2, label: "dinsdag" },
  { d: 3, label: "woensdag" },
];

/** Biedt aan om de demo-historie (gebruikte spelers in eerdere demorondes) te laden. */
export function DemoHistoryNotice() {
  const bundle = useBundle();
  const idx = useIndex();
  const used = useApp((s) => s.champcoach.used);
  const set = useApp((s) => s.set);
  if (!bundle.meta.isMock || used.length) return null;
  return (
    <Notice>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>Je hebt nog geen gebruikte spelers ingevoerd. Laad de demo-historie (eerdere demorondes) of voer je eigen gebruikte spelers in.</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const h = demoHistory(idx);
            set((s) => ({ champcoach: { ...s.champcoach, used: h.used, teams: { ...h.teams, ...s.champcoach.teams } } }));
          }}
        >
          Demo-historie laden
        </Button>
      </div>
    </Notice>
  );
}

/** Filter op aftraptijd en dag (bijv. alleen wedstrijden van 21:00). Wordt per spel bewaard. */
export function FixtureFilters() {
  const { rules } = useRules();
  const overrides = useApp((s) => s.champcoach.overrides);
  const set = useApp((s) => s.set);
  const slots = overrides.timeSlots ?? [];
  const days = overrides.days ?? [];
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const update = (o: Partial<typeof overrides>) => set((s) => ({ champcoach: { ...s.champcoach, overrides: { ...s.champcoach.overrides, ...o } } }));
  const chip = (active: boolean) =>
    cn("rounded-full border px-3 py-1 text-sm", active ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-text)]" : "border-[var(--color-border)] text-[var(--color-muted)]");
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" aria-label="Wedstrijdfilter">
      <span className="text-[var(--color-muted)]">Alleen:</span>
      {rules.timeSlots.map((t) => (
        <button key={t} className={chip(slots.includes(t))} aria-pressed={slots.includes(t)} onClick={() => update({ timeSlots: toggle(slots, t) })}>
          {t}
        </button>
      ))}
      {DAYS.map(({ d, label }) => (
        <button key={d} className={chip(days.includes(d))} aria-pressed={days.includes(d)} onClick={() => update({ days: toggle(days, d) })}>
          {label}
        </button>
      ))}
      {(slots.length > 0 || days.length > 0) && (
        <button className="text-xs text-[var(--color-muted)] underline" onClick={() => update({ timeSlots: [], days: [] })}>
          wis filter
        </button>
      )}
    </div>
  );
}

export function RoundSelect({ value, onChange, filter }: { value?: string; onChange: (id: string) => void; filter?: (status: string) => boolean }) {
  const idx = useIndex();
  const rounds = [...idx.ds.rounds].sort((a, b) => a.deadline.localeCompare(b.deadline)).filter((r) => !filter || filter(r.status));
  return (
    <select
      aria-label="Ronde"
      className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {rounds.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
          {r.status === "past" ? " (gespeeld)" : ""}
        </option>
      ))}
    </select>
  );
}

export function Deadline({ roundId }: { roundId: string }) {
  const idx = useIndex();
  const now = useNow();
  const r = idx.rounds.get(roundId);
  if (!r) return null;
  const open = new Date(r.deadline) > now;
  return (
    <span>
      Eerste aftrap {fmtDateTime(r.deadline)} · {open ? `nog ${countdown(r.deadline, now)}` : "begonnen: per wedstrijd ligt een speler vast zodra die wedstrijd begint"}
    </span>
  );
}
