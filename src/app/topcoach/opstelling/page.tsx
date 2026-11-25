"use client";
import { ArrowRight } from "lucide-react";
import { DataBanner, ErrorBlock, LoadingBlock, PageHeader } from "@/components/common/data-banner";
import { useIndex } from "@/components/providers/game-data";
import { Pitch, SlotRow } from "@/components/football/pitch";
import { PlayerCard } from "@/components/football/player-card";
import { Card, CardTitle, Notice } from "@/components/ui/card";
import { useTopCoachAdvice } from "@/lib/client/topcoach";
import { cn } from "@/lib/utils";

const SLOT_LABEL = { basis: "Basis", bank: "Bank", tribune: "Tribune" } as const;

export default function IdealLineup() {
  const { data, error, loading, reload } = useTopCoachAdvice();
  const idx = useIndex();
  if (error) return <ErrorBlock error={error} onRetry={reload} />;
  if (loading && !data) return <LoadingBlock />;
  if (!data) return null;
  const a = data.advice;
  const ideal = a.ideal;
  const riskOf = (id: string) => a.risks.find((r) => r.playerId === id)?.level;
  const name = (id: string) => idx.players.get(id)?.name ?? id;

  return (
    <div className="space-y-4">
      <DataBanner />
      <PageHeader title="Ideale opstelling" subtitle="Doel: basis (100%) + bank (50%) + extra captainpunten. Tribune telt niet." />
      {!ideal ? (
        <Notice tone="bad">Geen geldige opstelling mogelijk. Controleer je selectie en koppel alle spelers.</Notice>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle>
                Advies · {ideal.formation} · {ideal.expectedPoints} xSP
              </CardTitle>
              <Pitch
                playerIds={ideal.starters}
                render={(id) => <PlayerCard playerId={id} projection={a.projections[id]} risk={riskOf(id)} captain={id === ideal.captainId} captainMultiplier={a.captainMultiplier} />}
                footer={
                  <div className="space-y-2">
                    <SlotRow title="Bank" factor="50%" ids={ideal.bench} render={(id) => <PlayerCard compact playerId={id} projection={a.projections[id]} risk={riskOf(id)} />} />
                    <SlotRow title="Tribune" factor="0%" ids={ideal.tribune} render={(id) => <PlayerCard compact dim playerId={id} projection={a.projections[id]} risk={riskOf(id)} />} />
                  </div>
                }
              />
            </Card>
            <div className="space-y-4">
              <Card>
                <CardTitle>Formaties vergeleken</CardTitle>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-[var(--color-muted)]">
                    <tr>
                      <th className="py-1">Formatie</th>
                      <th className="py-1 text-right">Verwachte punten</th>
                      <th className="py-1 text-right">Verschil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.formations.map((f) => (
                      <tr key={f.formation} className={cn("border-t border-[var(--color-border)]", f.formation === ideal.formation && "font-bold text-[var(--color-accent)]")}>
                        <td className="py-1.5">{f.formation}{a.current?.formation === f.formation && <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">(jouw formatie)</span>}</td>
                        <td className="py-1.5 text-right tabular">{f.feasible ? f.expectedPoints : "niet mogelijk"}</td>
                        <td className="py-1.5 text-right tabular">{f.feasible ? f.expectedPoints - ideal.expectedPoints : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-[var(--color-muted)]">Alleen formaties die in de spelregels staan worden doorgerekend (aanpasbaar bij Spelregels).</p>
              </Card>
              <Card>
                <CardTitle>Wijzigingen t.o.v. jouw opstelling</CardTitle>
                {!a.current ? (
                  <p className="text-sm text-[var(--color-muted)]">Geen huidige opstelling ingevoerd.</p>
                ) : a.changes.length === 0 && !a.captainChange ? (
                  <p className="text-sm">Je opstelling is al optimaal.</p>
                ) : (
                  <>
                    <p className="mb-2 text-sm">
                      Verwachte winst: <strong className="text-[var(--color-ok)]">+{Math.max(0, a.gain)} xSP</strong> ({a.current.expectedPoints} → {ideal.expectedPoints})
                    </p>
                    <ul className="space-y-2 text-sm">
                      {a.changes.map((c) => (
                        <li key={c.playerId} className="rounded-xl bg-[var(--color-surface-2)] p-2">
                          <div className="flex items-center gap-2 font-semibold">
                            {name(c.playerId)} <span className="text-[var(--color-muted)]">{SLOT_LABEL[c.from]}</span> <ArrowRight className="h-3 w-3" /> <span>{SLOT_LABEL[c.to]}</span>
                          </div>
                          <div className="text-xs text-[var(--color-muted)]">{a.projections[c.playerId]?.summary ?? "Geen wedstrijd of niet gekoppeld."}</div>
                        </li>
                      ))}
                      {a.captainChange && (
                        <li className="rounded-xl bg-yellow-400/10 p-2">
                          <strong>Captain:</strong> {a.captainChange.from ? name(a.captainChange.from) : "–"} → {name(a.captainChange.to)} (+{a.captainChange.gain} xSP)
                        </li>
                      )}
                    </ul>
                  </>
                )}
              </Card>
            </div>
          </div>
          <Card>
            <CardTitle>Waarom deze spelers</CardTitle>
            <ul className="grid gap-2 text-sm md:grid-cols-2">
              {[...ideal.starters, ...ideal.bench].map((id) => {
                const p = a.projections[id];
                return (
                  <li key={id} className="rounded-xl bg-[var(--color-surface-2)] p-2">
                    <div className="flex justify-between font-semibold">
                      <span>{name(id)}</span>
                      <span className="tabular">{p?.ev ?? 0} xSP</span>
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">{p?.summary}</div>
                    {p && (
                      <div className="mt-1 text-[11px] text-[var(--color-muted)] tabular">
                        Ondergrens {p.floor} · topscore {p.ceiling} · basis {Math.round((p.minutes?.pStart ?? 0) * 100)}% · inval {Math.round((p.minutes?.pSub ?? 0) * 100)}% · ≥45′ {Math.round((p.minutes?.pThreshold ?? 0) * 100)}%
                      </div>
                    )}
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
