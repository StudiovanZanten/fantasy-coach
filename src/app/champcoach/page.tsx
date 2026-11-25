"use client";
import { useState } from "react";
import Link from "next/link";
import { DataBanner, ErrorBlock, LoadingBlock, PageHeader } from "@/components/common/data-banner";
import { DemoHistoryNotice, Deadline, FixtureFilters, RoundSelect } from "@/components/champcoach/common";
import { useIndex } from "@/components/providers/game-data";
import { PlayerCard } from "@/components/football/player-card";
import { Pitch } from "@/components/football/pitch";
import { Card, CardTitle, EmptyState, Notice, Stat } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/form";
import { useChampRecommend, usePlanRound, VARIANT_LABEL, type Variant } from "@/lib/client/champcoach";
import { useApp } from "@/state/store";
import { num, pct } from "@/lib/utils";

const VARIANTS: Variant[] = ["safe", "balanced", "aggressive"];
const POS_LABEL: Record<string, string> = { GK: "Keepers", DEF: "Verdedigers", MID: "Middenvelders", FWD: "Aanvallers" };

export default function RoundPlanner() {
  const idx = useIndex();
  const planRound = usePlanRound();
  const [picked, setPicked] = useState<string | undefined>();
  const roundId = picked ?? planRound;
  const [variant, setVariant] = useState<Variant>("balanced");
  const { data, error, loading, reload } = useChampRecommend(roundId, VARIANTS);
  const used = useApp((s) => s.champcoach.used);
  const set = useApp((s) => s.set);
  const [taken, setTaken] = useState(false);

  if (!roundId) return <EmptyState title="Geen open ronde">Alle rondes van deze fase zijn gespeeld.</EmptyState>;
  const round = idx.rounds.get(roundId)!;
  const rec = data?.recommendations[variant];
  const name = (id: string) => idx.players.get(id)?.name ?? id;
  const usedRound = (id: string) => used.find((u) => u.playerId === id)?.roundId;

  const takeOver = () => {
    if (!rec) return;
    set((s) => ({ champcoach: { ...s.champcoach, teams: { ...s.champcoach.teams, [roundId]: { playerIds: rec.playerIds, captainId: rec.captainId, variant } } } }));
    setTaken(true);
  };

  return (
    <div className="space-y-4">
      <DataBanner />
      <PageHeader
        title={`Rondeplanner · ${round.shortName}`}
        subtitle={<Deadline roundId={roundId} />}
        action={<RoundSelect value={roundId} onChange={(id) => { setPicked(id); setTaken(false); }} filter={(s) => s !== "past"} />}
      />
      <DemoHistoryNotice />
      <FixtureFilters />
      <Segmented label="Variant" value={variant} onChange={setVariant} options={VARIANTS.map((v) => ({ value: v, label: VARIANT_LABEL[v] }))} />

      {error && <ErrorBlock error={error} onRetry={reload} />}
      {loading && !rec && <LoadingBlock label="Plan over alle resterende rondes berekenen…" />}
      {rec && !rec.feasible && <Notice tone="bad">Geen geldig team mogelijk met deze filters en gebruikte spelers. Verruim het tijdfilter of controleer je gebruikte spelers.</Notice>}

      {rec && rec.feasible && (
        <>
          <Card>
            <p className="font-display text-xl font-bold leading-tight">{rec.headline}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Verwacht (incl. captain)" value={`${num(rec.expectedPoints)} pt`} />
              <Stat label="Captain" value={rec.captainId ? name(rec.captainId) : "–"} hint={`${rec.captainMultiplier * 100}%`} />
              <Stat label="Al gebruikt deze fase" value={new Set(used.map((u) => u.playerId)).size} />
              <Stat label="Bewaard voor later" value={rec.saved.length} />
            </div>
          </Card>

          {rec.warnings.length > 0 && (
            <Notice tone="warn">
              <ul className="list-disc pl-4">
                {rec.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Notice>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <Pitch
                playerIds={rec.playerIds}
                render={(id) => (
                  <PlayerCard playerId={id} projection={rec.picks.find((p) => p.playerId === id)?.projection} captain={id === rec.captainId} captainMultiplier={rec.captainMultiplier} />
                )}
                footer={
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>1-2-2-2 · {VARIANT_LABEL[variant]}</span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={takeOver}>
                        {taken ? "Overgenomen" : "Neem over in Team Builder"}
                      </Button>
                      {taken && (
                        <Link href="/champcoach/team" className="rounded-xl border border-[var(--color-border)] px-3 py-1.5 text-sm">
                          Open Team Builder
                        </Link>
                      )}
                    </div>
                  </div>
                }
              />
              <p className="text-xs text-[var(--color-muted)]">Een advies wordt pas definitief als jij het zelf bij de aanbieder invoert en hier op “Team gereed” zet.</p>
            </div>

            <Card>
              <CardTitle>Waarom deze spelers</CardTitle>
              <ul className="space-y-3">
                {rec.picks.map((p) => (
                  <li key={p.playerId} className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{name(p.playerId)}</span>
                      <StatusBadge status={p.projection.status} size="sm" />
                      <span className="tabular text-[var(--color-muted)]">{num(p.projection.ev, 1)} xP</span>
                    </div>
                    <p className="text-[var(--color-muted)]">{p.reason}</p>
                    <p className="text-xs">
                      <span className="text-[var(--color-muted)]">Wat je hierdoor later verliest: </span>
                      {p.lostFuture ? p.lostFuture.text : "geen betere toekomstige inzet in de planning."}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardTitle>Captain</CardTitle>
              {rec.captain ? (
                <>
                  <p className="text-sm">
                    <span className="font-semibold">{name(rec.captain.playerId)}</span> · {rec.captain.reason}
                  </p>
                  {rec.captain.alternatives.length > 0 && (
                    <ul className="mt-2 text-sm text-[var(--color-muted)]">
                      {rec.captain.alternatives.map((a) => (
                        <li key={a.playerId}>
                          {name(a.playerId)}: {num(a.pointsLess, 1)} pt minder verwacht
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-sm text-[var(--color-muted)]">Geen captain gekozen.</p>
              )}
              <SuperCaptain futurePlan={rec.futurePlan} name={name} />
            </Card>

            <Card>
              <CardTitle>Bewaaradvies</CardTitle>
              {rec.conflict && <p className="mb-2 text-sm">{rec.conflict.summary}</p>}
              {rec.saved.length ? (
                <ul className="space-y-1 text-sm">
                  {rec.saved.slice(0, 8).map((s) => (
                    <li key={s.playerId}>{s.reason}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--color-muted)]">Geen spelers die je beter kunt bewaren.</p>
              )}
            </Card>
          </div>

          <Card>
            <CardTitle>Beste wedstrijden</CardTitle>
            <ul className="grid gap-2 md:grid-cols-2">
              {rec.bestFixtures.map((f) => (
                <li key={f.fixtureId} className="rounded-xl bg-[var(--color-surface-2)] p-3 text-sm">
                  <p>{f.text}</p>
                  <p className="text-xs text-[var(--color-muted)]">Kans favoriet wint: {pct(f.pFavourite)}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTitle>Beste beschikbare spelers per positie</CardTitle>
            <div className="grid gap-3 md:grid-cols-4">
              {Object.entries(rec.bestByPosition).map(([pos, ids]) => (
                <div key={pos}>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">{POS_LABEL[pos] ?? pos}</h3>
                  <ol className="space-y-0.5 text-sm">
                    {ids.slice(0, 5).map((id) => (
                      <li key={id} className={rec.playerIds.includes(id) ? "font-semibold" : undefined}>
                        {name(id)}
                        {usedRound(id) && <span className="text-xs text-[var(--color-bad)]"> · al gebruikt</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Plan voor de resterende rondes</CardTitle>
            <p className="mb-2 text-xs text-[var(--color-muted)]">Zo verdeelt de planner je spelers over de fase (iedere speler één keer). Latere rondes wegen iets minder zwaar door onzekerheid.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-[var(--color-muted)]">
                  <tr>
                    <th className="py-1 pr-3">Ronde</th>
                    <th className="py-1 pr-3">Spelers</th>
                    <th className="py-1 text-right">xP</th>
                  </tr>
                </thead>
                <tbody>
                  {rec.futurePlan.map((r) => (
                    <tr key={r.roundId} className="border-t border-[var(--color-border)] align-top">
                      <td className="py-1.5 pr-3 font-semibold">{idx.rounds.get(r.roundId)?.shortName}</td>
                      <td className="py-1.5 pr-3">
                        {r.playerIds.map((id) => (id === r.captainId ? `${name(id)} (C)` : name(id))).join(", ")}
                      </td>
                      <td className="py-1.5 text-right tabular">{num(r.expectedPoints)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function SuperCaptain({ futurePlan, name }: { futurePlan: { roundId: string; captainId?: string }[]; name: (id: string) => string }) {
  const idx = useIndex();
  const sup = futurePlan.find((r) => (idx.rounds.get(r.roundId)?.captainMultiplier ?? 0) >= 3);
  if (!sup) return null;
  return (
    <p className="mt-3 rounded-xl border border-yellow-400/40 p-2 text-sm">
      Beste 300%-captain ({idx.rounds.get(sup.roundId)?.shortName}): <span className="font-semibold">{sup.captainId ? name(sup.captainId) : "nog niet bekend"}</span>. De planner houdt hem daarvoor vrij.
    </p>
  );
}
