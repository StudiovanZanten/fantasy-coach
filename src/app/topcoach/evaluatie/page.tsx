"use client";
import { useMemo } from "react";
import { DataBanner, PageHeader } from "@/components/common/data-banner";
import { useIndex, useRounds } from "@/components/providers/game-data";
import { Card, CardTitle, EmptyState, Stat } from "@/components/ui/card";
import { projectRound } from "@/engine/recommend/football";
import { useRules } from "@/lib/client/hooks";
import { useSquadIds } from "@/lib/client/topcoach";
import { useApp } from "@/state/store";
import { num } from "@/lib/utils";

/**
 * Evaluatie van de laatst gespeelde ronde: voorspelling (zoals vóór de deadline) tegenover
 * de behaalde punten. In demomodus zijn de uitslagen gesimuleerd.
 */
export default function TopCoachEvaluation() {
  const idx = useIndex();
  const { rules } = useRules();
  const prefs = useApp((s) => s.prefs);
  const { lastPast } = useRounds();
  const { idOf, keyOf } = useSquadIds();
  const tc = useApp((s) => s.topcoach);
  const data = useMemo(() => {
    if (!lastPast) return undefined;
    const round = idx.rounds.get(lastPast)!;
    const results = idx.ds.results[lastPast] ?? {};
    const proj = projectRound({ idx, rules, prefs, usedPlayerIds: [], now: new Date(round.deadline) }, lastPast);
    const rows = [...keyOf.keys()].map((id) => ({ id, expected: proj.get(id)?.ev ?? 0, actual: results[id] ?? 0, starter: tc.starters.some((k) => idOf.get(k) === id) }));
    const all = [...proj.values()].filter((p) => results[p.playerId] !== undefined);
    const mae = all.length ? all.reduce((s, p) => s + Math.abs(p.ev - results[p.playerId]), 0) / all.length : 0;
    const bias = all.length ? all.reduce((s, p) => s + (results[p.playerId] - p.ev), 0) / all.length : 0;
    return { round, rows: rows.sort((a, b) => b.actual - a.actual), mae, bias, n: all.length };
  }, [lastPast, idx, rules, prefs, keyOf, idOf, tc.starters]);

  if (!data) return <EmptyState title="Nog geen gespeelde ronde" />;
  const name = (id: string) => idx.players.get(id)?.name ?? id;
  const starters = data.rows.filter((r) => r.starter);
  return (
    <div className="space-y-4">
      <DataBanner />
      <PageHeader title={`Evaluatie · ${data.round.name}`} subtitle="Voorspelling vooraf tegenover de behaalde punten. Zo zie je waar het model goed of slecht zat." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Basisspelers verwacht" value={`${num(starters.reduce((s, r) => s + r.expected, 0))} pt`} />
        <Stat label="Basisspelers behaald" value={`${num(starters.reduce((s, r) => s + r.actual, 0))} pt`} />
        <Stat label="Gem. afwijking model" value={`${num(data.mae, 1)} pt`} hint={`over ${data.n} spelers`} />
        <Stat label="Systematische afwijking" value={`${data.bias >= 0 ? "+" : ""}${num(data.bias, 1)} pt`} hint={Math.abs(data.bias) < 1 ? "geen duidelijke scheefheid" : data.bias > 0 ? "model te voorzichtig" : "model te optimistisch"} />
      </div>
      <Card>
        <CardTitle>Jouw selectie</CardTitle>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-[var(--color-muted)]">
            <tr><th className="py-1">Speler</th><th className="py-1 text-right">Verwacht</th><th className="py-1 text-right">Behaald</th></tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--color-border)]">
                <td className="py-1.5">{name(r.id)} {r.starter && <span className="text-xs text-[var(--color-muted)]">(basis)</span>}</td>
                <td className="py-1.5 text-right tabular">{num(r.expected, 1)}</td>
                <td className={`py-1.5 text-right tabular ${r.actual >= r.expected ? "text-[var(--color-ok)]" : "text-[var(--color-bad)]"}`}>{num(r.actual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-[var(--color-muted)]">Let op: je huidige opstelling is gebruikt als benadering van wat er in deze ronde stond. De uitslagen in demomodus zijn gesimuleerd.</p>
    </div>
  );
}
