"use client";
import { useMemo } from "react";
import type { Recommendation } from "@/engine/recommend/football";
import type { LineupCheckResult } from "@/engine/lineup/check";
import type { EvaluationResult } from "@/engine/evaluation/evaluate";
import type { DatasetIndex } from "@/engine/recommend/dataset";
import { UCL_DEMO_USED_MD1_3 } from "@/data/seed/ucl";
import { useApp, type ChampCoachState } from "@/state/store";
import { useRounds } from "@/components/providers/game-data";
import { useEngine, useEngineBase } from "./hooks";

export type Variant = "safe" | "balanced" | "aggressive";
export const VARIANT_LABEL: Record<Variant, string> = { safe: "Veilig", balanced: "Gebalanceerd", aggressive: "Aanvallend" };

/** Spelers die al in een ándere ronde van deze fase zijn gebruikt (eenmalig-gebruikregel). */
export function usedOutside(cc: ChampCoachState, roundId?: string): string[] {
  return [...new Set(cc.used.filter((u) => u.roundId !== roundId).map((u) => u.playerId))];
}

export function useChampBase(roundId?: string) {
  const base = useEngineBase();
  const cc = useApp((s) => s.champcoach);
  return useMemo(() => ({ ...base, usedPlayerIds: usedOutside(cc, roundId), overrides: cc.overrides }), [base, cc, roundId]);
}

/** Ronde waarvoor je nu een team kiest: de eerstvolgende met een open deadline. */
export function usePlanRound(): string | undefined {
  const r = useRounds();
  return r.next ?? r.live;
}

/** Ronde die nu loopt (per wedstrijd een deadline), anders de eerstvolgende. */
export function useCheckRound(): string | undefined {
  const r = useRounds();
  return r.live ?? r.next;
}

export function useChampRecommend(roundId: string | undefined, variants: Variant[], extra: { lockedIds?: string[]; excludedIds?: string[] } = {}) {
  const base = useChampBase(roundId);
  const body = useMemo(() => ({ ...base, roundId, variants, ...extra }), [base, roundId, variants, extra]);
  return useEngine<{ recommendations: Partial<Record<Variant, Recommendation>>; isMock: boolean; generatedAt: string }>("/api/champcoach/recommend", body, Boolean(roundId));
}

export function useLineupCheck(roundId: string | undefined, playerIds: string[], captainId?: string) {
  const base = useChampBase(roundId);
  const body = useMemo(() => ({ ...base, roundId, playerIds, captainId }), [base, roundId, playerIds, captainId]);
  return useEngine<{ check: LineupCheckResult; isMock: boolean; checkedAt: string }>("/api/champcoach/lineup-check", body, Boolean(roundId) && playerIds.length > 0);
}

export function useEvaluation(roundId: string | undefined, playerIds: string[], captainId?: string) {
  const base = useChampBase(roundId);
  const body = useMemo(() => ({ ...base, roundId, playerIds, captainId }), [base, roundId, playerIds, captainId]);
  return useEngine<{ evaluation: EvaluationResult; isMock: boolean }>("/api/champcoach/evaluate", body, Boolean(roundId) && playerIds.length > 0);
}

/**
 * Demo-historie: de gebruikte spelers uit de eerdere demorondes. Alleen voor demodata;
 * met echte data voer je je eigen gebruikte spelers in op de pagina "Gebruikte spelers".
 */
export function demoHistory(idx: DatasetIndex): { used: ChampCoachState["used"]; teams: ChampCoachState["teams"] } {
  const past = [...idx.ds.rounds].filter((r) => r.status === "past").sort((a, b) => a.deadline.localeCompare(b.deadline));
  const byName = new Map(idx.ds.players.map((p) => [p.name, p.id]));
  const ids = UCL_DEMO_USED_MD1_3.map((n) => byName.get(n)).filter((x): x is string => Boolean(x));
  const used: ChampCoachState["used"] = [];
  const teams: ChampCoachState["teams"] = {};
  if (!past.length) return { used, teams };
  // Verdeel per positie over de gespeelde rondes zodat iedere ronde een geldige 1-2-2-2 benadert.
  const byPos = (pos: string) => ids.filter((id) => idx.players.get(id)?.position === pos);
  const need: Record<string, number> = { GK: 1, DEF: 2, MID: 2, FWD: 2 };
  const pools = Object.fromEntries(Object.keys(need).map((p) => [p, byPos(p)]));
  past.forEach((r, i) => {
    const team: string[] = [];
    for (const [pos, n] of Object.entries(need)) team.push(...pools[pos].splice(0, n));
    // Overgebleven spelers bij de laatste gespeelde ronde onderbrengen (gebruikt, maar niet in het team).
    if (i === past.length - 1) for (const pos of Object.keys(need)) for (const id of pools[pos].splice(0)) used.push({ playerId: id, roundId: r.id });
    for (const id of team) used.push({ playerId: id, roundId: r.id });
    teams[r.id] = { playerIds: team, captainId: team.find((id) => idx.players.get(id)?.position === "FWD"), finalizedAt: r.deadline, variant: "demo" };
  });
  return { used, teams };
}
