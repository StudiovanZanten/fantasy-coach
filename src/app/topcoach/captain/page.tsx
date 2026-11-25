"use client";
import { DataBanner, ErrorBlock, LoadingBlock, PageHeader } from "@/components/common/data-banner";
import { useIndex } from "@/components/providers/game-data";
import { Card, Notice } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { useTopCoachAdvice } from "@/lib/client/topcoach";
import { pct } from "@/lib/utils";

export default function CaptainPage() {
  const { data, error, loading, reload } = useTopCoachAdvice();
  const idx = useIndex();
  if (error) return <ErrorBlock error={error} onRetry={reload} />;
  if (loading && !data) return <LoadingBlock />;
  if (!data) return null;
  const a = data.advice;
  return (
    <div className="space-y-4">
      <DataBanner />
      <PageHeader title="Captainvergelijker" subtitle={a.isSuperWeekend ? "Super Weekend: je captain telt voor 300% (twee keer extra)." : "Je captain telt voor 200%."} />
      {a.isSuperWeekend && <Notice tone="warn">Super Weekend: de captainkeuze weegt deze ronde extra zwaar.</Notice>}
      <div className="grid gap-3 md:grid-cols-3">
        {a.captainCandidates.map((c, i) => {
          const pl = idx.players.get(c.playerId)!;
          const p = a.projections[c.playerId];
          return (
            <Card key={c.playerId} className={i === 0 ? "border-yellow-400/60" : undefined}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-2xl font-extrabold">{i + 1}. {pl.name}</span>
              </div>
              <div className="mb-2 flex items-center gap-2 text-sm">
                {p && <StatusBadge status={p.status} />} <span className="text-[var(--color-muted)]">{c.label}</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm tabular">
                <dt className="text-[var(--color-muted)]">Als captain</dt><dd className="text-right font-bold">{c.captainPoints} xSP</dd>
                <dt className="text-[var(--color-muted)]">Extra t.o.v. geen captain</dt><dd className="text-right">+{c.extraPoints}</dd>
                <dt className="text-[var(--color-muted)]">Potentiële topscore</dt><dd className="text-right">{c.ceiling}</dd>
                <dt className="text-[var(--color-muted)]">Basisplaats</dt><dd className="text-right">{pct(c.pStart)}</dd>
                <dt className="text-[var(--color-muted)]">Verwachte minuten</dt><dd className="text-right">{c.expMinutes}′</dd>
                <dt className="text-[var(--color-muted)]">Kans op doelpunt</dt><dd className="text-right">{pct(c.pGoal)}</dd>
                <dt className="text-[var(--color-muted)]">Kans op assist</dt><dd className="text-right">{pct(c.pAssist)}</dd>
                <dt className="text-[var(--color-muted)]">Kans op winst</dt><dd className="text-right">{pct(c.pWin)}</dd>
                <dt className="text-[var(--color-muted)]">Penaltynemer</dt><dd className="text-right">{c.penaltyTaker ? "ja" : "nee"}</dd>
                <dt className="text-[var(--color-muted)]">Rotatierisico</dt><dd className="text-right">{pct(c.rotationRisk)}</dd>
                <dt className="text-[var(--color-muted)]">Kaartrisico</dt><dd className="text-right">{pct(c.cardRisk)}</dd>
                <dt className="text-[var(--color-muted)]">Betrouwbaarheid</dt><dd className="text-right">{pct(c.reliability)}</dd>
              </dl>
              <p className="mt-2 text-xs text-[var(--color-muted)]">{c.opponent}</p>
            </Card>
          );
        })}
      </div>
      <Notice>Differentiëren t.o.v. concurrenten (minder populaire captain) kan pas als er betrouwbare eigendoms- of subleaguedata is. Die is nu niet gekoppeld.</Notice>
    </div>
  );
}
