"use client";
import { useMemo, useState } from "react";
import { DataBanner, PageHeader } from "@/components/common/data-banner";
import { useIndex, useRounds } from "@/components/providers/game-data";
import { PlayerTable } from "@/components/football/player-table";
import { projectRound } from "@/engine/recommend/football";
import { useRules } from "@/lib/client/hooks";
import { useApp } from "@/state/store";
import { useSquadIds } from "@/lib/client/topcoach";
import { Select } from "@/components/ui/form";

export default function PlayersPage() {
  const idx = useIndex();
  const { rules } = useRules();
  const prefs = useApp((s) => s.prefs);
  const { next, now } = useRounds();
  const [roundId, setRoundId] = useState(next ?? idx.ds.rounds[0].id);
  const { keyOf } = useSquadIds();
  const proj = useMemo(() => projectRound({ idx, rules, prefs, usedPlayerIds: [], now }, roundId), [idx, rules, prefs, now, roundId]);
  return (
    <div className="space-y-4">
      <DataBanner />
      <PageHeader
        title="Spelersanalyse"
        subtitle="Verwachte punten (xSP) per wedstrijd, met beschikbaarheid, basisplaats en speeltijd als aparte variabelen."
        action={
          <Select aria-label="Speelronde" className="w-auto" value={roundId} onChange={(e) => setRoundId(e.target.value)}>
            {idx.ds.rounds.filter((r) => r.status !== "past").map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
        }
      />
      <PlayerTable projections={[...proj.values()]} highlight={(id) => keyOf.has(id)} highlightLabel="In mijn selectie" />
    </div>
  );
}
