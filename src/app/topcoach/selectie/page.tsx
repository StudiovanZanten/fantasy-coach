"use client";
import { useMemo, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { DataBanner, PageHeader } from "@/components/common/data-banner";
import { useBundle, useIndex } from "@/components/providers/game-data";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, Notice } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Pill } from "@/components/ui/badge";
import { matchState, entryPlayerId, type UserPlayerEntry } from "@/data/identity";
import { slug } from "@/data/seed/rng";
import { validateTeam } from "@/engine/rules/validate";
import type { FootballPosition } from "@/engine/types";
import { useRules } from "@/lib/client/hooks";
import { testcaseTopCoach, useApp } from "@/state/store";
import { cn } from "@/lib/utils";

const POS: { id: FootballPosition; label: string }[] = [
  { id: "GK", label: "Keepers" },
  { id: "DEF", label: "Verdedigers" },
  { id: "MID", label: "Middenvelders" },
  { id: "FWD", label: "Aanvallers" },
];
type Slot = "basis" | "bank" | "tribune";

export default function SquadPage() {
  const bundle = useBundle();
  const idx = useIndex();
  const { rules } = useRules();
  const tc = useApp((s) => s.topcoach);
  const set = useApp((s) => s.set);
  const [newName, setNewName] = useState("");
  const [newPos, setNewPos] = useState<FootballPosition>("MID");
  const basePlayers = bundle.dataset.players;

  const update = (fn: (t: typeof tc) => Partial<typeof tc>) => set((s) => ({ topcoach: { ...s.topcoach, ...fn(s.topcoach) } }));
  const updateEntry = (key: string, patch: Partial<UserPlayerEntry>) => update((t) => ({ entries: t.entries.map((e) => (e.key === key ? { ...e, ...patch } : e)) }));
  const slotOf = (key: string): Slot => (tc.starters.includes(key) ? "basis" : tc.bench.includes(key) ? "bank" : "tribune");
  const setSlot = (key: string, slot: Slot) =>
    update((t) => ({
      starters: slot === "basis" ? [...new Set([...t.starters, key])] : t.starters.filter((k) => k !== key),
      bench: slot === "bank" ? [...new Set([...t.bench, key])] : t.bench.filter((k) => k !== key),
      captainKey: slot !== "basis" && t.captainKey === key ? undefined : t.captainKey,
    }));

  const ids = tc.entries.map(entryPlayerId).filter((x): x is string => Boolean(x));
  const violations = useMemo(() => validateTeam({ rules, players: idx.players, playerIds: ids, scope: "squad" }).filter((v) => v.code !== "unavailable" && v.code !== "size"), [rules, idx, ids]);
  const counts = Object.fromEntries(POS.map((p) => [p.id, tc.entries.filter((e) => e.position === p.id).length]));
  const linked = tc.entries.filter((e) => entryPlayerId(e)).length;

  return (
    <div className="space-y-4">
      <DataBanner />
      <PageHeader
        title="Mijn selectie"
        subtitle={`${tc.entries.length} van ${rules.squadSize} spelers · ${linked} gekoppeld · basis ${tc.starters.length}/11 · bank ${tc.bench.length}/${rules.squadSlots?.benchSize ?? 4}`}
        action={
          <Button variant="ghost" size="sm" onClick={() => update(() => testcaseTopCoach())}>
            Testcase opnieuw laden
          </Button>
        }
      />
      <Notice>
        Spelers worden nooit automatisch op achternaam gekoppeld. Bevestig iedere koppeling (volledige naam, club en positie). De positie is de fantasypositie van de aanbieder, ook als de speler in werkelijkheid elders speelt.
      </Notice>
      {(() => {
        const suggested = tc.entries.map((e) => ({ e, m: matchState(basePlayers, e) })).filter((x) => x.m.state === "suggested");
        if (!suggested.length) return null;
        return (
          <Card>
            <p className="text-sm">
              {suggested.length} voorstel{suggested.length > 1 ? "len" : ""} met precies één passende speler:{" "}
              <span className="text-[var(--color-muted)]">{suggested.map((x) => `${x.m.candidates[0].name} (${idx.clubs.get(x.m.candidates[0].clubId ?? "")?.shortName ?? "?"})`).join(", ")}</span>
            </p>
            <Button
              className="mt-2"
              size="sm"
              variant="secondary"
              onClick={() => update((t) => ({ entries: t.entries.map((e) => { const x = suggested.find((y) => y.e.key === e.key); return x ? { ...e, linkedPlayerId: x.m.candidates[0].id, confirmed: true } : e; }) }))}
            >
              <Check className="h-4 w-4" /> Deze {suggested.length} koppelingen bevestigen
            </Button>
          </Card>
        );
      })()}
      {violations.length > 0 && (
        <Notice tone="warn">
          <ul className="list-inside list-disc">
            {violations.map((v, i) => (
              <li key={i}>{v.message}</li>
            ))}
          </ul>
        </Notice>
      )}

      {POS.map((pos) => (
        <Card key={pos.id}>
          <CardTitle>
            {pos.label}{" "}
            <span className="text-sm font-normal text-[var(--color-muted)]">
              {counts[pos.id]}/{rules.squadPositions?.[pos.id]?.max ?? "–"}
            </span>
          </CardTitle>
          <ul className="divide-y divide-[var(--color-border)]">
            {tc.entries
              .filter((e) => e.position === pos.id)
              .map((e) => {
                const m = matchState(basePlayers, e);
                const pid = entryPlayerId(e);
                const pl = pid ? idx.players.get(pid) : undefined;
                const club = pl?.clubId ? idx.clubs.get(pl.clubId) : undefined;
                return (
                  <li key={e.key} className="flex flex-col gap-2 py-3 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{pl?.name ?? e.input}</span>
                        {club && <Pill>{club.name}</Pill>}
                        {m.state === "confirmed" && <Pill className="text-emerald-300">gekoppeld</Pill>}
                        {m.state === "custom" && <Pill className="text-yellow-300">eigen invoer · demo-statistiek</Pill>}
                        {m.state === "ambiguous" && <Pill className="text-orange-300">meerdere spelers met deze naam</Pill>}
                        {m.state === "unmatched" && <Pill className="text-red-300">niet gevonden in databron</Pill>}
                      </div>
                      {m.state === "suggested" && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-[var(--color-muted)]">Bedoel je</span>
                          <strong>{m.candidates[0].name}</strong> ({idx.clubs.get(m.candidates[0].clubId!)?.name}, {pos.id})?
                          <Button size="sm" onClick={() => updateEntry(e.key, { linkedPlayerId: m.candidates[0].id, confirmed: true })}>
                            <Check className="h-4 w-4" /> Bevestig
                          </Button>
                        </div>
                      )}
                      {m.state === "ambiguous" && (
                        <div className="mt-1 flex flex-wrap gap-2 text-sm">
                          {m.candidates.map((c) => (
                            <Button key={c.id} size="sm" variant="secondary" onClick={() => updateEntry(e.key, { linkedPlayerId: c.id, confirmed: true })}>
                              {c.name} · {idx.clubs.get(c.clubId!)?.shortName}
                            </Button>
                          ))}
                        </div>
                      )}
                      {m.state === "unmatched" && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-[var(--color-muted)]">Koppel aan club:</span>
                          <Select aria-label={`Club van ${e.input}`} className="h-8 w-auto" defaultValue="" onChange={(ev) => ev.target.value && updateEntry(e.key, { customClubId: ev.target.value })}>
                            <option value="">Kies club…</option>
                            {bundle.dataset.clubs.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                      )}
                      {(m.state === "confirmed" || m.state === "custom") && (
                        <button className="mt-1 text-xs text-[var(--color-muted)] underline" onClick={() => updateEntry(e.key, { linkedPlayerId: undefined, confirmed: false, customClubId: undefined })}>
                          Koppeling ongedaan maken
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div role="radiogroup" aria-label={`Plek van ${e.input}`} className="inline-flex rounded-lg bg-[var(--color-surface-2)] p-0.5 text-xs">
                        {(["basis", "bank", "tribune"] as Slot[]).map((s) => (
                          <button key={s} role="radio" aria-checked={slotOf(e.key) === s} onClick={() => setSlot(e.key, s)} className={cn("rounded-md px-2 py-1 capitalize", slotOf(e.key) === s ? "bg-[var(--color-accent)] font-semibold text-slate-950" : "text-[var(--color-muted)]")}>
                            {s}
                          </button>
                        ))}
                      </div>
                      <button
                        aria-label={`Maak ${e.input} captain`}
                        aria-pressed={tc.captainKey === e.key}
                        disabled={slotOf(e.key) !== "basis"}
                        onClick={() => update(() => ({ captainKey: e.key }))}
                        className={cn("grid h-7 w-7 place-items-center rounded-full text-xs font-bold disabled:opacity-30", tc.captainKey === e.key ? "bg-yellow-400 text-slate-950" : "bg-[var(--color-surface-2)] text-[var(--color-muted)]")}
                      >
                        C
                      </button>
                      <button aria-label={`Verwijder ${e.input}`} onClick={() => update((t) => ({ entries: t.entries.filter((x) => x.key !== e.key), starters: t.starters.filter((k) => k !== e.key), bench: t.bench.filter((k) => k !== e.key) }))} className="rounded-lg p-1.5 text-[var(--color-muted)] hover:text-[var(--color-bad)]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
        </Card>
      ))}

      <Card>
        <CardTitle>Speler toevoegen</CardTitle>
        <form
          className="flex flex-col gap-2 md:flex-row md:items-end"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!newName.trim()) return;
            const key = `${slug(newName)}-${Date.now().toString(36)}`;
            update((t) => ({ entries: [...t.entries, { key, input: newName.trim(), position: newPos, confirmed: false }] }));
            setNewName("");
          }}
        >
          <Field label="Naam (zoals bij de aanbieder)">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="bijv. Til" />
          </Field>
          <Field label="Fantasypositie">
            <Select value={newPos} onChange={(e) => setNewPos(e.target.value as FootballPosition)}>
              {POS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">
            <Plus className="h-4 w-4" /> Toevoegen
          </Button>
        </form>
        <p className="mt-2 text-xs text-[var(--color-muted)]">Screenshot-import volgt als aparte module (OCR → jij controleert → pas dan toevoegen). Zie Import.</p>
      </Card>

      <Card>
        <CardTitle>Gouden Wissels en budget</CardTitle>
        <div className="grid gap-3 md:grid-cols-3">
          {rules.goldenSubs?.halves.map((h) => (
            <Field key={h.name} label={`Gebruikt in ${h.name}`} hint={`Max ${rules.goldenSubs!.perHalf} · elke ongebruikte = ${rules.goldenSubs!.unusedBonus} pnt`}>
              <Select value={String(tc.goldenSubsUsed[h.name] ?? 0)} onChange={(e) => update((t) => ({ goldenSubsUsed: { ...t.goldenSubsUsed, [h.name]: Number(e.target.value) } }))}>
                {Array.from({ length: rules.goldenSubs!.perHalf + 1 }, (_, i) => (
                  <option key={i}>{i}</option>
                ))}
              </Select>
            </Field>
          ))}
          <Field label="Resterend budget (mln)" hint={`Budget volgens regels: ${rules.budget ?? "–"} mln (te valideren)`}>
            <Input type="number" step="0.5" min="0" value={tc.bank} onChange={(e) => update(() => ({ bank: Number(e.target.value) }))} />
          </Field>
        </div>
      </Card>
    </div>
  );
}
