"use client";
import type { GameBundle } from "@/data/adapters/types";
import { useApp } from "@/state/store";
import { GameDataProvider } from "./game-data";

/** Voor algemene pagina's (assistent, instellingen…): data van het spel dat de gebruiker als laatste koos. */
export function ActiveGameProvider({ bundles, children }: { bundles: GameBundle[]; children: React.ReactNode }) {
  const active = useApp((s) => s.activeGameId);
  const bundle = bundles.find((b) => b.gameId === active) ?? bundles[0];
  return <GameDataProvider key={bundle.gameId} bundle={bundle}>{children}</GameDataProvider>;
}
