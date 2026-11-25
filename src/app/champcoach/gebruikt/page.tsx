"use client";
import { useMemo, useState } from "react";
import { DataBanner, PageHeader } from "@/components/common/data-banner";
import { DemoHistoryNotice } from "@/components/champcoach/common";
import { useIndex } from "@/components/providers/game-data";
import { Card, CardTitle, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { useApp } from "@/state/store";

/** Handmatig bijhouden welke spelers je in deze fase al hebt ingezet (eenmalig-gebruikregel). */
export default function UsedPlayers() {
  const idx = useIndex();
  const used = useApp((s) => s.champcoach.used);
  const set = useApp((s) => s.set);
  const rounds = useMemo(() => [...idx.ds.rounds].sort((a, b) => a.deadline.localeCompare(b.deadline)), [idx]);
  const [query, setQuery] = useState("");
  const [roundId, setRoundId] = useState(rounds.find((r) => r.status === "past")?.id ?? rounds[0]?.id);
  const usedSet = new Set(used.map((u) => u.playerId));
  const q = query.trim().toLowerCase();
  const matches = q.length >= 2 ? idx.ds.players.filter((p) => p.name.toLowerCase().includes(q) && !usedSet.has(p.id)).slice(0, 8) : [];
  const add = (playerId: string) => set((s) => ({ champcoach: { ...s.champcoach, used: [...s.champcoach.used, { playerId, roundId: roundId! }] } }));
  const remove = (playerId: string) => set((s) => ({ champcoach: { ...s.champcoach, used: s.champcoach.used.filter((u) => u.playerId !== playerId) } }));
  const clubName = (id?: string) => (id ? idx.clubs.get(id)?.shortName : "");

  return (
    <div className="space-y-4">
      <DataBanner />
      <PageHeader title="Gebruikte spelers" subtitle={`${usedSet.size} spelers al ingezet in deze fase. Iedere speler mag één keer per fase.`} />
      <DemoHistoryNotice />
      <Card>
        <CardTitle>Speler toevoegen</CardTitle>
        <div className="flex flex-col gap-2 md:flex-row">
          <Input placeholder="Zoek op naam (min. 2 letters)" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Zoek speler" />
          <Select aria-label="Ronde" className="md:w-48" value={roundId} onChange={(e) => setRoundId(e.target.value)}>
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>{r.shortName}</option>
            ))}
          </Select>
        </div>
        {matches.length > 0 && (
          <ul className="mt-2 divide-y divide-[var(--color-border)]">
            {matches.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-1.5 text-sm">
                <span>
                  {p.name} <span className="text-xs text-[var(--color-muted)]">{clubName(p.clubId)} · {p.position}</span>
                </span>
                <Button size="sm" variant="secondary" onClick={() => add(p.id)}>Toevoegen</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {rounds.map((r) => {
        const list = used.filter((u) => u.roundId === r.id);
        if (!list.length) return null;
        return (
          <Card key={r.id}>
            <CardTitle>{r.name}</CardTitle>
            <ul className="flex flex-wrap gap-2">
              {list.map((u) => {
                const p = idx.players.get(u.playerId);
                return (
                  <li key={u.playerId} className="flex items-center gap-1 rounded-full border border-[var(--color-border)] py-1 pl-3 pr-1 text-sm">
                    {p?.name ?? u.playerId} <span className="text-xs text-[var(--color-muted)]">{clubName(p?.clubId)}</span>
                    <button onClick={() => remove(u.playerId)} className="ml-1 rounded-full px-2 text-[var(--color-muted)] hover:text-[var(--color-bad)]" aria-label={`${p?.name} verwijderen`}>
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
      {!used.length && <EmptyState title="Nog niemand gebruikt">Voeg de spelers toe die je in eerdere rondes al hebt ingezet.</EmptyState>}
    </div>
  );
}
