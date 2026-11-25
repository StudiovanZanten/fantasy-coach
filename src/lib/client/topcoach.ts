"use client";
import { useMemo } from "react";
import type { TopCoachAdvice } from "@/engine/recommend/topcoach";
import { entryPlayerId } from "@/data/identity";
import { useApp, type Snapshot } from "@/state/store";
import { useEngine, useEngineBase } from "./hooks";

export interface AdviceResponse {
  advice: TopCoachAdvice;
  rounds: { next?: string; live?: string; lastPast?: string };
  isMock: boolean;
  unlinked: string[];
  generatedAt: string;
}

export function useTopCoachAdvice(opts: { roundId?: string; includeTransfers?: boolean; enabled?: boolean } = {}) {
  const base = useEngineBase();
  const tc = useApp((s) => s.topcoach);
  const body = useMemo(
    () => ({ ...base, roundId: opts.roundId, starters: tc.starters, bench: tc.bench, captainKey: tc.captainKey, goldenSubsUsed: tc.goldenSubsUsed, bank: tc.bank, includeGoldenSubs: true, includeTransfers: opts.includeTransfers ?? false }),
    [base, tc.starters, tc.bench, tc.captainKey, tc.goldenSubsUsed, tc.bank, opts.roundId, opts.includeTransfers],
  );
  return useEngine<AdviceResponse>("/api/topcoach/advice", body, opts.enabled ?? true);
}

/** Sleutel (entry.key) ↔ speler-id. */
export function useSquadIds() {
  const entries = useApp((s) => s.topcoach.entries);
  return useMemo(() => {
    const idOf = new Map<string, string>();
    const keyOf = new Map<string, string>();
    for (const e of entries) {
      const id = entryPlayerId(e);
      if (id) {
        idOf.set(e.key, id);
        keyOf.set(id, e.key);
      }
    }
    return { idOf, keyOf };
  }, [entries]);
}

export function snapshotFrom(a: TopCoachAdvice, availability: (id: string) => string): Snapshot {
  const players: Snapshot["players"] = {};
  for (const [id, p] of Object.entries(a.projections)) {
    players[id] = { status: p?.status ?? "GEEN WEDSTRIJD", pStart: p?.minutes?.pStart ?? 0, xsp: p?.ev ?? 0, availability: availability(id) };
  }
  return { at: new Date().toISOString(), roundId: a.roundId, players, idealStarters: a.ideal?.starters ?? [], captainId: a.ideal?.captainId, expected: a.ideal?.expectedPoints ?? 0 };
}
