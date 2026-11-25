"use client";
import { useMemo, useState } from "react";
import { DataBanner, PageHeader } from "@/components/common/data-banner";
import { FixtureFilters, RoundSelect } from "@/components/champcoach/common";
import { useIndex, useNow } from "@/components/providers/game-data";
import { PlayerTable } from "@/components/football/player-table";
import { projectRound } from "@/engine/recommend/football";
import { useRules } from "@/lib/client/hooks";
import { usePlanRound, usedOutside } from "@/lib/client/champcoach";
import { useApp } from "@/state/store";
import { EmptyState } from "@/components/ui/card";

export default function Scouting() {
  const idx = useIndex();
  const now = useNow();
  const { rules } = useRules();
  const prefs = useApp((s) => s.prefs);
  const cc = useApp((s) => s.champcoach);
  const plan = usePlanRound();
  const [picked, setPicked] = useState<string | undefined>();
  const roundId = picked ?? plan;
  const used = useMemo(() => usedOutside(cc, roundId), [cc, roundId]);
  const proj = useMemo(() => (roundId ? projectRound({ idx, rules, prefs, overrides: cc.overrides, usedPlayerIds: used, now }, roundId) : new Map()), [idx, rules, prefs, cc.overrides, used, now, roundId]);
  if (!roundId) return <EmptyState title="Geen open ronde" />;
  const team = cc.teams[roundId]?.playerIds ?? [];
  return (
    <div className="space-y-4">
      <DataBanner />
      <PageHeader title="Scouting" subtitle="Alle spelers van deze ronde met verwachte punten, basiskans en speeltijd." action={<RoundSelect value={roundId} onChange={setPicked} filter={(s) => s !== "past"} />} />
      <FixtureFilters />
      <PlayerTable projections={[...proj.values()]} highlight={(id) => team.includes(id)} highlightLabel="In je team" usedIds={new Set(used)} />
    </div>
  );
}
