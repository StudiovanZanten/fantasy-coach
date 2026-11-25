"use client";
import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { DataBanner, ErrorBlock, LoadingBlock, PageHeader } from "@/components/common/data-banner";
import { useIndex, useNow } from "@/components/providers/game-data";
import { Pitch, SlotRow } from "@/components/football/pitch";
import { PlayerCard } from "@/components/football/player-card";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, Notice, Stat } from "@/components/ui/card";
import { useApp } from "@/state/store";
import { snapshotFrom, useSquadIds, useTopCoachAdvice } from "@/lib/client/topcoach";
import { diffSnapshots, nextCheck } from "@/engine/monitoring/diff";
import { AVAILABILITY_LABEL } from "@/engine/types";
import { countdown, fmtDateTime } from "@/lib/utils";

export default function TopCoachOverview() {
  const { data, error, loading, reload } = useTopCoachAdvice();
  const idx = useIndex();
  const now = useNow();
  const tc = useApp((s) => s.topcoach);
  const set = useApp((s) => s.set);
  const { idOf } = useSquadIds();
  const name = (id: string) => idx.players.get(id)?.name ?? id;

  const a = data?.advice;
  const last = tc.snapshots.filter((s) => s.roundId === a?.roundId).at(-1);
  const changes = useMemo(() => (a && last ? diffSnapshots(last, snapshotFrom(a, (id) => idx.players.get(id)?.availability.status ?? "?"), name) : []), [a, last]); // eslint-disable-line

  if (error) return <ErrorBlock error={error} onRetry={reload} />;
  if (loading && !a) return <LoadingBlock />;
  if (!a) return null;

  const round = idx.rounds.get(a.roundId)!;
  const starters = a.current?.starters ?? [];
  const risky = a.risks.filter((r) => starters.includes(r.playerId) && ["orange", "red"].includes(r.level));
  const riskOf = (id: string) => a.risks.find((r) => r.playerId === id)?.level;
  const check = nextCheck(round.deadline, now);

  const saveCheck = () =>
    set((s) => ({ topcoach: { ...s.topcoach, snapshots: [...s.topcoach.snapshots.slice(-19), snapshotFrom(a, (id) => idx.players.get(id)?.availability.status ?? "?")] } }));

  const applyIdeal = () => {
    if (!a.ideal) return;
    const keyOf = new Map([...idOf.entries()].map(([k, v]) => [v, k]));
    set((s) => ({
      topcoach: {
        ...s.topcoach,
        starters: a.ideal!.starters.map((id) => keyOf.get(id)!).filter(Boolean),
        bench: a.ideal!.bench.map((id) => keyOf.get(id)!).filter(Boolean),
        captainKey: a.ideal!.captainId ? keyOf.get(a.ideal!.captainId) : s.topcoach.captainKey,
        appliedLog: [...s.topcoach.appliedLog, { at: new Date().toISOString(), text: `Ideale opstelling (${a.ideal!.formation}) overgenomen voor ${round.name}` }],
      },
    }));
  };

  return (
    <div className="space-y-4">
      <DataBanner />
      <PageHeader title={round.name} subtitle={`Deadline ${fmtDateTime(round.deadline)}${a.deadlinePassed ? " · verstreken" : ""}`} />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <Stat label="Deadline over" value={countdown(round.deadline, now)} tone={a.deadlinePassed ? "bad" : undefined} hint={check ? `Volgende check: ${check.label}` : undefined} />
        <Stat label="Verwacht (jij)" value={a.current?.expectedPoints ?? "–"} hint="xSP huidige opstelling" />
        <Stat label="Verwacht (ideaal)" value={a.ideal?.expectedPoints ?? "–"} hint={a.ideal?.formation} tone="ok" />
        <Stat label="Risicospelers" value={risky.length} tone={risky.length ? "warn" : "ok"} hint="in je basis" />
        <Stat label="Captain" value={a.current?.captainId ? name(a.current.captainId).split(" ").at(-1) : "–"} hint={a.isSuperWeekend ? "Super Weekend: 300%" : "200%"} />
        <Stat label="Gouden Wissels" value={a.goldenSubs ? a.goldenSubs.available : "–"} hint={a.phase?.name} />
      </div>

      {data.unlinked.length > 0 && (
        <Notice tone="warn">
          <strong>{data.unlinked.length} spelers zijn nog niet gekoppeld</strong> aan een geverifieerde speler (naam + club + positie). Zonder koppeling kan de app hun punten niet berekenen.{" "}
          <Link href="/topcoach/selectie" className="font-semibold underline">
            Koppel ze in Mijn selectie
          </Link>
        </Notice>
      )}

      <Card className="border-[var(--color-accent)]/50">
        <div className="flex items-start gap-3">
          {a.changes.length || a.captainChange ? <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-[var(--color-warn)]" /> : <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-[var(--color-ok)]" />}
          <div className="flex-1">
            <p className="text-lg font-semibold leading-snug md:text-xl">{a.headline}</p>
            {a.deadlinePassed && <p className="mt-1 text-sm text-[var(--color-muted)]">Informatie na de deadline gebruiken we alleen nog voor live monitoring en de volgende ronde.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/topcoach/opstelling">
                <Button>Bekijk ideale opstelling</Button>
              </Link>
              {(a.changes.length > 0 || a.captainChange) && !a.deadlinePassed && (
                <Button variant="secondary" onClick={applyIdeal}>
                  Ik heb dit doorgevoerd
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle
          action={
            <Button size="sm" variant="secondary" onClick={() => { reload(); saveCheck(); }}>
              <RefreshCw className="h-4 w-4" /> Controleer nu
            </Button>
          }
        >
          Sinds de vorige controle
        </CardTitle>
        {!last ? (
          <p className="text-sm text-[var(--color-muted)]">Nog geen eerdere controle voor deze ronde. Druk op ‘Controleer nu’ om een vergelijkingspunt op te slaan.</p>
        ) : changes.length === 0 ? (
          <p className="text-sm">Geen wijzigingen sinds {fmtDateTime(last.at)}.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {changes.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className={c.kind === "official" ? "font-bold text-[var(--color-ok)]" : c.kind === "advice" ? "font-bold text-[var(--color-accent-2)]" : "font-bold text-[var(--color-warn)]"}>
                  {c.kind === "official" ? "Bevestigd" : c.kind === "advice" ? "Advies" : "Voorspelling"}
                </span>
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {a.current ? (
        <Card>
          <CardTitle>Jouw opstelling · {a.current.formation}</CardTitle>
          <Pitch
            playerIds={a.current.starters}
            render={(id) => <PlayerCard playerId={id} projection={a.projections[id]} risk={riskOf(id)} captain={id === a.current!.captainId} captainMultiplier={a.captainMultiplier} />}
            footer={
              <div className="space-y-2">
                <SlotRow title="Bank" factor="50%" ids={a.current.bench} render={(id) => <PlayerCard compact playerId={id} projection={a.projections[id]} risk={riskOf(id)} />} />
                <SlotRow title="Tribune" factor="0%" ids={a.current.tribune} render={(id) => <PlayerCard compact dim playerId={id} projection={a.projections[id]} risk={riskOf(id)} />} />
              </div>
            }
          />
          <ul className="mt-3 space-y-1 text-sm">
            {a.risks
              .filter((r) => r.level !== "green" && a.current!.starters.concat(a.current!.bench).includes(r.playerId))
              .map((r) => {
                const pl = idx.players.get(r.playerId);
                return (
                  <li key={r.playerId}>
                    <strong>{pl?.name}</strong>: {r.reason}
                    {pl && pl.availability.status !== "fit" && ` · ${AVAILABILITY_LABEL[pl.availability.status]}`} <span className="text-xs text-[var(--color-muted)]">({r.official ? "officieel" : "voorspelling"})</span>
                  </li>
                );
              })}
          </ul>
        </Card>
      ) : (
        <Notice>Vul je huidige opstelling in bij Mijn selectie om je eigen opstelling te laten controleren.</Notice>
      )}

      {tc.appliedLog.length > 0 && (
        <Card>
          <CardTitle>Wat jij hebt doorgevoerd</CardTitle>
          <ul className="space-y-1 text-sm text-[var(--color-muted)]">
            {tc.appliedLog.slice(-5).reverse().map((l, i) => (
              <li key={i}>
                {fmtDateTime(l.at)} – {l.text}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
