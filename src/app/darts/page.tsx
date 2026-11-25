"use client";
import { useMemo, useState } from "react";
import { DataBanner, ErrorBlock, LoadingBlock, PageHeader } from "@/components/common/data-banner";
import { useIndex } from "@/components/providers/game-data";
import { Card, CardTitle, Notice, Stat } from "@/components/ui/card";
import { Segmented } from "@/components/ui/form";
import { useEngine, useEngineBase } from "@/lib/client/hooks";
import type { DartsAnalysis } from "@/engine/scoring/darts";
import type { PlannedRound } from "@/engine/optimizer/lineup";
import { AVAILABILITY_LABEL } from "@/engine/types";
import { VARIANT_LABEL, type Variant } from "@/lib/client/champcoach";
import { num, pct } from "@/lib/utils";

const ROUND_LABEL: Record<string, string> = { R1: "1e ronde", R2: "2e ronde", R3: "3e ronde", R4: "4e ronde", QF: "Kwartfinale", SF: "Halve finale", F: "Finale" };

/** Darts: voorbereide module met demotoernooi. Route door het schema en teamadvies binnen budget. */
export default function DartsPage() {
  const idx = useIndex();
  const base = useEngineBase();
  const roundId = idx.ds.rounds[0]?.id;
  const [variant, setVariant] = useState<Variant>("balanced");
  const body = useMemo(() => ({ ...base, roundId, variant }), [base, roundId, variant]);
  const { data, error, loading, reload } = useEngine<{ analysis: DartsAnalysis; team?: PlannedRound }>("/api/darts/analyse", body, Boolean(roundId));
  const slots = roundId ? idx.ds.brackets?.[roundId] ?? [] : [];
  const name = (id?: string | null) => (id ? idx.players.get(id)?.name ?? id : "bye");

  return (
    <div className="space-y-4">
      <DataBanner />
      <PageHeader title="WK Darts (demo)" subtitle="Kansen per ronde uit een exacte doorrekening van het schema, met Elo-ratings op basis van gemiddelde, finishpercentage, vorm en marktkansen." />
      <Notice tone="warn">Deze module is voorbereid met fictief gemarkeerde demodata (deelnemers, statistieken en loting). Spelregels en schema zijn niet van een echte aanbieder.</Notice>
      <Segmented label="Risicoprofiel" value={variant} onChange={setVariant} options={(["safe", "balanced", "aggressive"] as Variant[]).map((v) => ({ value: v, label: VARIANT_LABEL[v] }))} />
      {error && <ErrorBlock error={error} onRetry={reload} />}
      {loading && !data && <LoadingBlock label="Toernooi doorrekenen…" />}
      {data && (
        <>
          {data.team && (
            <Card>
              <CardTitle>Teamadvies</CardTitle>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Stat label="Verwacht" value={`${num(data.team.expectedPoints)} pt`} />
                <Stat label="Captain" value={name(data.team.captainId)} />
                <Stat label="Kosten" value={`€${num(data.team.playerIds.reduce((s, id) => s + (idx.players.get(id)?.price ?? 0), 0), 1)}M`} />
              </div>
              <ul className="mt-3 grid gap-1 text-sm md:grid-cols-2">
                {data.team.playerIds.map((id) => {
                  const p = data.analysis.projections.find((x) => x.playerId === id);
                  return (
                    <li key={id} className="flex justify-between gap-2">
                      <span>{name(id)}{id === data.team!.captainId ? " (C)" : ""}</span>
                      <span className="tabular text-[var(--color-muted)]">€{idx.players.get(id)?.price}M · {num(p?.ev, 1)} xP</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
          <Card>
            <CardTitle>Kansen per ronde</CardTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs text-[var(--color-muted)]">
                  <tr>
                    <th className="py-1">Darter</th>
                    <th className="py-1 text-right">Rating</th>
                    {data.analysis.odds.roundNames.map((r) => <th key={r} className="py-1 text-right">{ROUND_LABEL[r] ?? r}</th>)}
                    <th className="py-1 text-right">xP</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.analysis.projections].sort((a, b) => b.ev - a.ev).map((p) => {
                    const pl = idx.players.get(p.playerId);
                    return (
                      <tr key={p.playerId} className="border-t border-[var(--color-border)]">
                        <td className="py-1.5">
                          {pl?.name}
                          {pl && pl.availability.status !== "fit" && <span className="ml-1 text-xs text-[var(--color-bad)]">{AVAILABILITY_LABEL[pl.availability.status]}</span>}
                        </td>
                        <td className="py-1.5 text-right tabular">{data.analysis.ratings[p.playerId]}</td>
                        {data.analysis.odds.win.map((w, r) => <td key={r} className="py-1.5 text-right tabular">{pct(w[p.playerId])}</td>)}
                        <td className="py-1.5 text-right tabular font-semibold">{num(p.ev, 1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">Per kolom: kans om die partij te winnen (en dus door te gaan).</p>
          </Card>
          <Card>
            <CardTitle>Schema eerste ronde</CardTitle>
            <ul className="grid gap-1 text-sm md:grid-cols-2">
              {Array.from({ length: Math.floor(slots.length / 2) }).map((_, i) => {
                const a = slots[2 * i], b = slots[2 * i + 1];
                const pa = a ? data.analysis.odds.win[0]?.[a] : undefined;
                return (
                  <li key={i} className="flex justify-between rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5">
                    <span>{name(a)} <span className="text-[var(--color-muted)]">vs</span> {name(b)}</span>
                    <span className="tabular text-[var(--color-muted)]">{pct(pa)}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
