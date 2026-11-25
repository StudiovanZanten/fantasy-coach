"use client";
import { useState } from "react";
import { DataBanner, ErrorBlock, LoadingBlock, PageHeader } from "@/components/common/data-banner";
import { DemoHistoryNotice, RoundSelect } from "@/components/champcoach/common";
import { useIndex, useRounds } from "@/components/providers/game-data";
import { Card, CardTitle, EmptyState, Stat } from "@/components/ui/card";
import { useEvaluation } from "@/lib/client/champcoach";
import { useApp } from "@/state/store";
import { num } from "@/lib/utils";

export default function Evaluation() {
  const idx = useIndex();
  const { lastPast } = useRounds();
  const [picked, setPicked] = useState<string | undefined>();
  const roundId = picked ?? lastPast;
  const team = useApp((s) => (roundId ? s.champcoach.teams[roundId] : undefined));
  const { data, error, loading, reload } = useEvaluation(roundId, team?.playerIds ?? [], team?.captainId);
  const name = (id?: string) => (id ? idx.players.get(id)?.name ?? id : "–");
  if (!roundId) return <EmptyState title="Nog geen gespeelde ronde" />;
  const head = (
    <>
      <DataBanner />
      <PageHeader title="Evaluatie" subtitle="Wat leverde je team op en wat leren we ervan?" action={<RoundSelect value={roundId} onChange={setPicked} filter={(s) => s === "past"} />} />
      <DemoHistoryNotice />
    </>
  );
  if (!team?.playerIds.length) return <div className="space-y-4">{head}<EmptyState title="Geen team bekend voor deze ronde">Markeer je team als gereed of laad de demo-historie.</EmptyState></div>;
  if (error) return <div className="space-y-4">{head}<ErrorBlock error={error} onRetry={reload} /></div>;
  if (loading || !data) return <div className="space-y-4">{head}<LoadingBlock /></div>;
  const e = data.evaluation;
  return (
    <div className="space-y-4">
      {head}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Behaald" value={`${num(e.total)} pt`} />
        <Stat label="Verwacht vooraf" value={`${num(e.expected)} pt`} tone={e.total >= e.expected ? "ok" : "warn"} />
        <Stat label="Beste team achteraf" value={`${num(e.hindsight.total)} pt`} />
        <Stat label="Captain liet liggen" value={`${num(e.captain.lostPoints)} pt`} tone={e.captain.lostPoints > 0 ? "warn" : "ok"} />
      </div>
      <Card>
        <CardTitle>Per speler</CardTitle>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-[var(--color-muted)]">
            <tr><th className="py-1">Speler</th><th className="py-1 text-right">Verwacht</th><th className="py-1 text-right">Behaald</th><th className="py-1 text-right">Verschil</th></tr>
          </thead>
          <tbody>
            {e.perPlayer.map((p) => (
              <tr key={p.playerId} className="border-t border-[var(--color-border)]">
                <td className="py-1.5">{name(p.playerId)}{p.isCaptain ? " (C)" : ""}</td>
                <td className="py-1.5 text-right tabular">{num(p.expected, 1)}</td>
                <td className="py-1.5 text-right tabular">{num(p.points)}</td>
                <td className={`py-1.5 text-right tabular ${p.delta >= 0 ? "text-[var(--color-ok)]" : "text-[var(--color-bad)]"}`}>{p.delta >= 0 ? "+" : ""}{num(p.delta, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Gemist</CardTitle>
          <ul className="text-sm">{e.missed.map((m) => <li key={m.playerId}>{name(m.playerId)}: {num(m.points)} pt</li>)}</ul>
        </Card>
        <Card>
          <CardTitle>Lessen voor de volgende ronde</CardTitle>
          <ul className="list-disc space-y-1 pl-4 text-sm">{e.lessons.map((l) => <li key={l}>{l}</li>)}</ul>
        </Card>
      </div>
      <p className="text-xs text-[var(--color-muted)]">De uitslagen in demomodus zijn gesimuleerd en dus geen echte resultaten.</p>
    </div>
  );
}
