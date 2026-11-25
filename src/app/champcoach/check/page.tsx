"use client";
import { useState } from "react";
import Link from "next/link";
import { DataBanner, ErrorBlock, LoadingBlock, PageHeader } from "@/components/common/data-banner";
import { Deadline, RoundSelect } from "@/components/champcoach/common";
import { useIndex } from "@/components/providers/game-data";
import { Card, CardTitle, EmptyState, Notice } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCheckRound, useLineupCheck } from "@/lib/client/champcoach";
import { useApp } from "@/state/store";
import { fmtDateTime, fmtTime } from "@/lib/utils";

/** Opstellingencheck: ± 60 minuten voor aftrap, zodra de officiële opstellingen bekend zijn. */
export default function LineupCheckPage() {
  const idx = useIndex();
  const checkRound = useCheckRound();
  const [picked, setPicked] = useState<string | undefined>();
  const roundId = picked ?? checkRound;
  const team = useApp((s) => (roundId ? s.champcoach.teams[roundId] : undefined));
  const set = useApp((s) => s.set);
  const { data, error, loading, reload } = useLineupCheck(roundId, team?.playerIds ?? [], team?.captainId);
  const name = (id?: string) => (id ? idx.players.get(id)?.name ?? id : "–");

  if (!roundId) return <EmptyState title="Geen ronde om te controleren" />;
  const round = idx.rounds.get(roundId)!;
  const header = (
    <>
      <DataBanner />
      <PageHeader title={`Opstellingencheck · ${round.shortName}`} subtitle={<Deadline roundId={roundId} />} action={<RoundSelect value={roundId} onChange={setPicked} filter={(s) => s !== "past"} />} />
    </>
  );
  if (!team?.playerIds.length)
    return (
      <div className="space-y-4">
        {header}
        <EmptyState title="Nog geen team voor deze ronde">
          Stel eerst je team samen in de <Link className="underline" href="/champcoach/team">Team Builder</Link> of neem het advies over uit de <Link className="underline" href="/champcoach">rondeplanner</Link>.
        </EmptyState>
      </div>
    );
  if (error) return <div className="space-y-4">{header}<ErrorBlock error={error} onRetry={reload} /></div>;
  if (loading && !data) return <div className="space-y-4">{header}<LoadingBlock label="Opstellingen controleren…" /></div>;
  if (!data) return null;
  const c = data.check;
  const changed = c.suggestedPlayerIds.some((id) => !team.playerIds.includes(id)) || c.suggestedCaptainId !== team.captainId;

  const apply = () =>
    set((s) => ({
      champcoach: { ...s.champcoach, teams: { ...s.champcoach.teams, [roundId]: { ...team, playerIds: c.suggestedPlayerIds, captainId: c.suggestedCaptainId, finalizedAt: undefined } } },
    }));

  return (
    <div className="space-y-4">
      {header}
      <Card className={c.allStarting ? "border-[var(--color-ok)]" : undefined}>
        <p className="font-display text-2xl font-extrabold">{c.message}</p>
        <p className="text-sm text-[var(--color-muted)]">
          Gecontroleerd op {fmtDateTime(data.checkedAt)}. {c.allPublished ? "Alle officiële opstellingen zijn bekend." : "Nog niet alle officiële opstellingen zijn gepubliceerd; voorspelde statussen zijn geen zekerheid."}
        </p>
      </Card>

      <Card>
        <CardTitle>Jouw spelers</CardTitle>
        <ul className="divide-y divide-[var(--color-border)]">
          {c.players.map((p) => (
            <li key={p.playerId} className="py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{name(p.playerId)}</span>
                {p.playerId === c.captainId && <span className="rounded-full bg-yellow-400 px-1.5 text-[11px] font-bold text-slate-950">C</span>}
                <StatusBadge status={p.status} size="sm" />
                {p.kickoff && <span className="text-xs text-[var(--color-muted)]">aftrap {fmtTime(p.kickoff)}</span>}
                {p.locked && <span className="text-xs text-[var(--color-muted)]">· wedstrijd begonnen, vast</span>}
              </div>
              {p.replacement && (
                <p className="mt-1 text-[var(--color-accent)]">
                  Vervanger op dezelfde positie: <span className="font-semibold">{name(p.replacement.playerId)}</span> ({p.replacement.reason})
                </p>
              )}
              {!p.replacement && ["BANK", "AFWEZIG"].includes(p.status) && !p.locked && <p className="mt-1 text-[var(--color-warn)]">Geen geldige vervanger gevonden binnen de regels.</p>}
            </li>
          ))}
        </ul>
      </Card>

      {c.suggestedCaptainId && c.suggestedCaptainId !== c.captainId && (
        <Notice tone="warn">
          Captain {name(c.captainId)} {c.captainStatus ? `heeft status “${c.captainStatus}”` : "staat niet meer in het team"}. Nieuwe captain: <strong>{name(c.suggestedCaptainId)}</strong>.
        </Notice>
      )}
      {c.violations.length > 0 && (
        <Notice tone="bad">
          <ul className="list-disc pl-4">{c.violations.map((v, i) => <li key={i}>{v.message}</li>)}</ul>
        </Notice>
      )}

      <div className="flex flex-wrap gap-2">
        {changed && <Button onClick={apply}>Wijzigingen overnemen in mijn team</Button>}
        <Button variant="secondary" onClick={reload}>Opnieuw controleren</Button>
        <Link href="/champcoach/definitief" className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium">
          Naar definitief team
        </Link>
      </div>
      <p className="text-xs text-[var(--color-muted)]">Alleen gepubliceerde, officiële opstellingen gelden als “Basis”, “Bank” of “Afwezig”. Daarvoor tonen we een voorspelling. Wijzig je team zelf bij de aanbieder.</p>
    </div>
  );
}
