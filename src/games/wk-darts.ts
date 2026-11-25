import { RuleSetSchema } from "@/engine/rules/schema";
import type { GameModule } from "./types";

/** WK Darts – voorbereide module met demotoernooi (32 deelnemers, A5). */
export const wkDarts: GameModule = {
  id: "wk-darts",
  name: "WK Darts",
  description: "Darts-WK · kies 8 darters binnen budget · captain telt dubbel · route door het schema telt",
  sport: "darts",
  competition: "WK Darts",
  availability: "active",
  accent: "#a3e635",
  defaultRules: RuleSetSchema.parse({
    mode: "bracket",
    roundScope: "tournament",
    lineupSize: 8,
    lineupPositions: { DARTER: { min: 8, max: 8 } },
    budget: 60,
    maxPerClub: null,
    usage: { oncePerPhase: false },
    captain: { enabled: true, multiplier: 2, roundOverrides: {} },
    transfers: { enabled: false },
    substitutions: {},
    deadline: { mode: "round-start" },
    timeSlots: [],
    matchOfTheRound: {},
    availability: {},
    priceChanges: {},
    horizon: 1,
    scoring: {
      darts: { matchWin: { R1: 10, R2: 15, QF: 20, SF: 30, F: 40 }, per180: 1, avgOver100: 3, tournamentWin: 30 },
    },
  }),
};
