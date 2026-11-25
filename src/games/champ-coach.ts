import { RuleSetSchema } from "@/engine/rules/schema";
import type { GameModule } from "./types";

/**
 * Champ Coach (Champions League). Regels volgens de specificatie van de gebruiker;
 * puntentabel is een benadering (zie docs/02-ASSUMPTIONS.md, A2) en is aanpasbaar in /admin/rules.
 */
export const champCoach: GameModule = {
  id: "champ-coach",
  name: "Champ Coach",
  description: "Champions League · 7 spelers per deelronde · iedere speler één keer in de league phase",
  sport: "football",
  competition: "Champions League",
  availability: "active",
  accent: "#38bdf8",
  defaultRules: RuleSetSchema.parse({
    mode: "once-per-phase",
    roundScope: "sub-round",
    lineupSize: 7,
    lineupPositions: { GK: { min: 1, max: 1 }, DEF: { min: 2, max: 2 }, MID: { min: 2, max: 2 }, FWD: { min: 2, max: 2 } },
    budget: null,
    maxPerClub: 4,
    usage: { oncePerPhase: true, phase: "league" },
    captain: { enabled: true, multiplier: 2, roundOverrides: {} },
    transfers: { enabled: false },
    substitutions: { autoSubs: false, benchSize: 0 },
    deadline: { mode: "per-fixture" },
    timeSlots: ["18:45", "21:00"],
    matchOfTheRound: { enabled: true, bonusMultiplier: 1 },
    availability: { excludeInjured: true, excludeSuspended: true },
    priceChanges: { enabled: false },
    horizon: 8,
    verification: { status: "unverified", source: "Specificatie gebruiker; puntentabel is een aanname" },
    scoring: {
      football: {
        appearance: 1,
        minutesThreshold: 60,
        minutesPoints: 1,
        goal: { GK: 6, DEF: 6, MID: 5, FWD: 4 },
        assist: 3,
        cleanSheet: { GK: 4, DEF: 4, MID: 1, FWD: 0 },
        win: 2,
        draw: 1,
        yellow: -1,
        red: -3,
      },
    },
  }),
};
