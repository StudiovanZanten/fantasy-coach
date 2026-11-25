"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { DataBanner, PageHeader } from "@/components/common/data-banner";
import { Deadline, DemoHistoryNotice, FixtureFilters, RoundSelect } from "@/components/champcoach/common";
import { useIndex, useNow } from "@/components/providers/game-data";
import { PlayerCard } from "@/components/football/player-card";
import { Card, CardTitle, EmptyState, Notice } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { projectRound } from "@/engine/recommend/football";
import { validateTeam } from "@/engine/rules/validate";
import { captainMultiplierFor } from "@/engine/rules/schema";
import type { Position } from "@/engine/types";
import { useRules } from "@/lib/client/hooks";
import { usePlanRound, usedOutside } from "@/lib/client/champcoach";
import { useApp } from "@/state/store";
import { cn, num, pct } from "@/lib/utils";

const POS: { pos: Position; label: string }[] = [
  { pos: "FWD", label: "Aanvallers" },
  { pos: "MID", label: "Middenvelders" },
  { pos: "DEF", label: "Verdedigers" },
  { pos: "GK", label: "Keeper" },
];

export default function TeamBuilder() {
  const idx = useIndex();
  const now = useNow();
  const { rules } = useRules();
  const prefs = useApp((s) => s.prefs);
  const cc = useApp((s) => s.champcoach);
  const set = useApp((s) => s.set);
  const planRound = usePlanRound();
  const [picked, setPicked] = useState<string | undefined>();
  const roundId = picked ?? planRound;
  const [slotPos, setSlotPos] = useState<Position>("FWD");
  const [query, setQuery] = useState("");

  const usedIds = useMemo(() => usedOutside(cc, roundId), [cc, roundId]);
  const proj = useMemo(
    () => (roundId ? projectRound({ idx, rules, prefs, overrides: cc.overrides, usedPlayerIds: usedIds, now }, roundId) : new Map()),
    [idx, rules, prefs, cc.overrides, usedIds, now, roundId],
  );
  if (!roundId) return <EmptyState title="Geen open ronde" />;
  const round = idx.rounds.get(roundId)!;
  const team = cc.teams[roundId] ?? { playerIds: [] };
  const m = captainMultiplierFor(rules, roundId, round.captainMultiplier);
  const maxFor = (pos: Position) => rules.lineupPositions[pos]?.max ?? 0;
  const inTeam = (pos: Position) => team.playerIds.filter((id) => idx.players.get(id)?.position === pos);

  const save = (playerIds: string[], captainId = team.captainId) =>
    set((s) => ({
      champcoach: {
        ...s.champcoach,
        teams: { ...s.champcoach.teams, [roundId]: { playerIds, captainId: captainId && playerIds.includes(captainId) ? captainId : undefined, variant: "eigen keuze" } },
      },
    }));
  const toggle = (id: string) => {
    if (team.playerIds.includes(id)) return save(team.playerIds.filter((x) => x !== id));
    const pos = idx.players.get(id)!.position;
    if (inTeam(pos).length >= maxFor(pos)) return; // positie vol: eerst iemand verwijderen
    save([...team.playerIds, id]);
  };

  const violations = validateTeam({
    rules,
    players: idx.players,
    playerIds: team.playerIds,
    captainId: team.captainId,
    usedPlayerIds: new Set(usedIds),
    eligiblePlayerIds: new Set(proj.keys()),
  });
  const complete = team.playerIds.length === rules.lineupSize;
  const total = team.playerIds.reduce((s, id) => s + (proj.get(id)?.ev ?? 0) * (id === team.captainId ? m : 1), 0);

  const q = query.trim().toLowerCase();
  const list = [...proj.values()]
    .filter((p) => idx.players.get(p.playerId)?.position === slotPos)
    .filter((p) => !q || idx.players.get(p.playerId)!.name.toLowerCase().includes(q) || idx.clubs.get(idx.players.get(p.playerId)!.clubId ?? "")?.name.toLowerCase().includes(q))
    .sort((a, b) => b.ev - a.ev)
    .slice(0, 40);

  return (
    <div className="space-y-4">
      <DataBanner />
      <PageHeader title={`Team Builder · ${round.shortName}`} subtitle={<Deadline roundId={roundId} />} action={<RoundSelect value={roundId} onChange={setPicked} filter={(s) => s !== "past"} />} />
      <DemoHistoryNotice />
      <FixtureFilters />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-[var(--color-pitch-line)] bg-[var(--color-pitch)] p-3">
            {POS.map(({ pos, label }) => {
              const ids = inTeam(pos);
              const empty = Math.max(0, maxFor(pos) - ids.length);
              return (
                <div key={pos} className="mb-3 last:mb-0">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-white/60">{label}</div>
                  <div className="flex justify-center gap-2">
                    {ids.map((id) => (
                      <div key={id} className="w-[30%] max-w-[140px]">
                        <PlayerCard
                          playerId={id}
                          projection={proj.get(id)}
                          captain={id === team.captainId}
                          captainMultiplier={m}
                          onClick={() => toggle(id)}
                          label={`${idx.players.get(id)?.name} uit het team halen`}
                        />
                      </div>
                    ))}
                    {Array.from({ length: empty }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSlotPos(pos)}
                        className={cn(
                          "grid h-[74px] w-[30%] max-w-[140px] place-items-center rounded-xl border border-dashed text-xs text-white/70",
                          slotPos === pos ? "border-[var(--color-accent)]" : "border-white/30",
                        )}
                        aria-label={`Kies een ${label.toLowerCase()}`}
                      >
                        + kies
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <Card>
            <CardTitle>Captain {m >= 3 ? "(300%)" : "(200%)"}</CardTitle>
            <div className="flex flex-wrap gap-2">
              {team.playerIds.map((id) => (
                <button
                  key={id}
                  onClick={() => save(team.playerIds, id)}
                  aria-pressed={team.captainId === id}
                  className={cn("rounded-full border px-3 py-1 text-sm", team.captainId === id ? "border-yellow-400 bg-yellow-400/15" : "border-[var(--color-border)]")}
                >
                  {idx.players.get(id)?.name}
                </button>
              ))}
              {!team.playerIds.length && <span className="text-sm text-[var(--color-muted)]">Kies eerst spelers.</span>}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-muted)]">
                {team.playerIds.length}/{rules.lineupSize} spelers · verwacht {num(total)} pt
              </span>
              <div className="flex gap-2">
                {team.playerIds.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => save([], undefined)}>
                    Leegmaken
                  </Button>
                )}
                <Link href="/champcoach/check" className="rounded-xl bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-slate-950">
                  Naar de check
                </Link>
              </div>
            </div>
            {violations.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-[var(--color-warn)]">
                {violations.filter((v) => complete || !["size", "position_min", "captain_missing"].includes(v.code)).map((v, i) => (
                  <li key={i}>⚠ {v.message}</li>
                ))}
                {!complete && <li className="text-[var(--color-muted)]">Nog {rules.lineupSize - team.playerIds.length} speler(s) kiezen.</li>}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-ok)]">Team voldoet aan de regels (1-2-2-2, max {rules.maxPerClub} per club, ieder speler één keer).</p>
            )}
          </Card>
        </div>

        <Card>
          <CardTitle>Kies {POS.find((p) => p.pos === slotPos)?.label.toLowerCase()}</CardTitle>
          <div className="mb-2 flex flex-wrap gap-2">
            {POS.map(({ pos, label }) => (
              <button
                key={pos}
                onClick={() => setSlotPos(pos)}
                aria-pressed={slotPos === pos}
                className={cn("rounded-full border px-3 py-1 text-sm", slotPos === pos ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15" : "border-[var(--color-border)] text-[var(--color-muted)]")}
              >
                {label} ({inTeam(pos).length}/{maxFor(pos)})
              </button>
            ))}
          </div>
          <Input placeholder="Zoek speler of club" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Zoek speler of club" />
          {proj.size === 0 && <Notice tone="warn">Geen wedstrijden binnen het gekozen filter.</Notice>}
          <ul className="mt-2 max-h-[560px] divide-y divide-[var(--color-border)] overflow-y-auto">
            {list.map((p) => {
              const pl = idx.players.get(p.playerId)!;
              const club = idx.clubs.get(pl.clubId ?? "");
              const usedHere = usedIds.includes(p.playerId);
              const selected = team.playerIds.includes(p.playerId);
              const full = !selected && inTeam(slotPos).length >= maxFor(slotPos);
              return (
                <li key={p.playerId}>
                  <button
                    onClick={() => toggle(p.playerId)}
                    disabled={usedHere || full}
                    className={cn("flex w-full items-center gap-2 py-2 text-left text-sm disabled:opacity-40", selected && "font-semibold text-[var(--color-accent)]")}
                  >
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: club?.color }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      {pl.name} <span className="text-xs text-[var(--color-muted)]">{club?.shortName}</span>
                    </span>
                    {usedHere ? <span className="text-xs text-[var(--color-bad)]">al gebruikt</span> : <StatusBadge status={p.status} size="sm" />}
                    <span className="w-12 text-right tabular">{num(p.ev, 1)}</span>
                    <span className="hidden w-10 text-right text-xs text-[var(--color-muted)] tabular md:inline">{pct(p.startProb)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
