"use client";
import { createContext, useContext, useMemo } from "react";
import type { GameBundle } from "@/data/adapters/types";
import { indexDataset, roundForNow, type DatasetIndex } from "@/engine/recommend/dataset";
import { withUserPlayers } from "@/data/identity";
import { useApp } from "@/state/store";

const Ctx = createContext<GameBundle | null>(null);

export function GameDataProvider({ bundle, children }: { bundle: GameBundle; children: React.ReactNode }) {
  return <Ctx.Provider value={bundle}>{children}</Ctx.Provider>;
}

export function useBundle(): GameBundle {
  const b = useContext(Ctx);
  if (!b) throw new Error("GameDataProvider ontbreekt");
  return b;
}

/** "Nu" in demomodus: de gekozen demoklok; anders de echte tijd. */
export function useNow(): Date {
  const bundle = useBundle();
  const clockId = useApp((s) => s.demoClock[bundle.gameId]);
  return useMemo(() => {
    if (!bundle.meta.isMock) return new Date();
    const c = bundle.demoClocks.find((x) => x.id === clockId) ?? bundle.demoClocks[0];
    return c ? new Date(c.now) : new Date();
  }, [bundle, clockId]);
}

/** Geïndexeerde dataset inclusief de eigen spelers van de gebruiker. */
export function useIndex(): DatasetIndex {
  const bundle = useBundle();
  const entries = useApp((s) => s.topcoach.entries);
  return useMemo(() => indexDataset(bundle.gameId === "topcoach-eredivisie" ? withUserPlayers(bundle.dataset, entries) : bundle.dataset), [bundle, entries]);
}

export function useRounds() {
  const idx = useIndex();
  const now = useNow();
  return useMemo(() => ({ ...roundForNow(idx, now), now }), [idx, now]);
}
