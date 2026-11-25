import { champCoach } from "./champ-coach";
import { topcoachEredivisie } from "./topcoach-eredivisie";
import { wkDarts } from "./wk-darts";
import { preparedGames } from "./prepared";
import type { GameModule } from "./types";

export const activeGames: GameModule[] = [champCoach, topcoachEredivisie, wkDarts];
export const allGames: GameModule[] = [...activeGames, ...preparedGames];

export function getGame(id: string): GameModule | undefined {
  return allGames.find((g) => g.id === id);
}
