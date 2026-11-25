"use client";
import { DataBanner, ErrorBlock, LoadingBlock, PageHeader } from "@/components/common/data-banner";
import { useIndex } from "@/components/providers/game-data";
import { Card, CardTitle, EmptyState, Notice, Stat } from "@/components/ui/card";
import { useTopCoachAdvice } from "@/lib/client/topcoach";

export default function GoldenSubPage() {
  const { data, error, loading, reload } = useTopCoachAdvice();
  const idx = useIndex();
  if (error) return <ErrorBlock error={error} onRetry={reload} />;
  if (loading && !data) return <LoadingBlock />;
  if (!data) return null;
  const a = data.advice;
  const g = a.goldenSubs;
  const name = (id: string) => idx.players.get(id)?.name ?? id;
  return (
    <div className="space-y-4">
      <DataBanner />
      <PageHeader title="Gouden Wissel-adviseur" subtitle="Alleen bij een duidelijke aanleiding. Jij beslist altijd zelf of je een wissel inzet." />
      {!g ? (
        <Notice>{a.phase ? `Fase: ${a.phase.name}. ${a.phase.kind === "unlimited" ? "Transfers zijn nu onbeperkt; Gouden Wissels zijn niet nodig." : "Gouden Wissels gelden niet in deze fase."}` : "Geen transferfase bekend."}</Notice>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Beschikbaar" value={g.available} hint={g.half} />
            <Stat label="Resterende rondes" value={g.remainingRounds} />
            <Stat label="Bonus per ongebruikte" value="250" hint="punten aan einde helft" />
          </div>
          <Card className="border-[var(--color-accent)]/50">
            <p className="text-lg font-semibold">{g.advice}</p>
          </Card>
          {g.candidates.length === 0 ? (
            <EmptyState title="Geen kandidaten">Geen speler in je selectie heeft een duidelijke aanleiding (langdurige blessure, verloren basisplaats, vertrek of langdurige schorsing).</EmptyState>
          ) : (
            g.candidates.map((c) => (
              <Card key={c.outId}>
                <CardTitle>
                  {name(c.outId)} → {name(c.inId)}
                </CardTitle>
                <p className="mb-2 text-sm text-[var(--color-muted)]">Aanleiding: {c.trigger}</p>
                <table className="w-full text-sm tabular">
                  <tbody>
                    <tr><td>Extra punten per ronde (binnen geoptimaliseerde opstelling)</td><td className="text-right">+{c.gainPerRound}</td></tr>
                    <tr><td>Verwachte extra punten rest van de helft</td><td className="text-right">+{c.expectedGain}</td></tr>
                    <tr><td>Kosten Gouden Wissel (gemiste bonus)</td><td className="text-right">−{c.cost}</td></tr>
                    <tr><td>Optiewaarde: wissel bewaren voor latere pech</td><td className="text-right">−{c.optionValue}</td></tr>
                    <tr className="border-t border-[var(--color-border)] font-bold"><td>Netto voordeel</td><td className={c.net > 0 ? "text-right text-[var(--color-ok)]" : "text-right text-[var(--color-bad)]"}>{c.net > 0 ? "+" : ""}{c.net}</td></tr>
                    <tr><td>Onzekerheid</td><td className="text-right">± {c.uncertainty}</td></tr>
                    <tr><td>Terugverdientijd</td><td className="text-right">{Number.isFinite(c.paybackRounds) ? `${c.paybackRounds} rondes` : "nooit"}</td></tr>
                  </tbody>
                </table>
              </Card>
            ))
          )}
          <Notice>
            Rekenmethode: we vergelijken de verwachte punten van je hele geoptimaliseerde opstelling (basis, bank, captain) met en zonder de wissel over de komende rondes en extrapoleren naar de rest van de helft. Optiewaarde is een vuistregel (≈ 8 punten per resterende ronde, × 1,5 als het je laatste wissel is) en staat in de documentatie.
          </Notice>
        </>
      )}
    </div>
  );
}
