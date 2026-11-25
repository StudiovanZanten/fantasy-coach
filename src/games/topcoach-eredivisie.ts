import { RuleSetSchema } from "@/engine/rules/schema";
import type { GameModule } from "./types";

/**
 * TopCoach Eredivisie 2026/27.
 *
 * LET OP: deze waarden komen uit externe speluitleg die de gebruiker aanleverde en zijn
 * NOG NIET gevalideerd tegen het officiële spelreglement (dat staat achter de login van het
 * Gamecenter). Ze staan daarom als `verification.status = "unverified"` en zijn volledig
 * aanpasbaar in /admin/rules. Tegendoelpunten-aftrek is bewust leeg gelaten: de exacte
 * waarden zijn onbekend en we vullen ze niet zelf in.
 */
export const topcoachEredivisie: GameModule = {
  id: "topcoach-eredivisie",
  name: "TopCoach Eredivisie",
  description: "Eredivisie · selectie van 18 · basis 100%, bank 50%, tribune 0% · Gouden Wissels",
  sport: "football",
  competition: "Eredivisie",
  availability: "active",
  accent: "#f97316",
  defaultRules: RuleSetSchema.parse({
    mode: "budget-squad",
    roundScope: "matchday",
    lineupSize: 11,
    lineupPositions: { GK: { min: 1, max: 1 }, DEF: { min: 3, max: 4 }, MID: { min: 3, max: 5 }, FWD: { min: 2, max: 4 } },
    formations: ["3-3-4", "3-4-3", "3-5-2", "4-3-3", "4-4-2"],
    squadSize: 18,
    squadPositions: { GK: { min: 2, max: 2 }, DEF: { min: 5, max: 5 }, MID: { min: 6, max: 6 }, FWD: { min: 5, max: 5 } },
    squadSlots: { benchSize: 4, benchFactor: 0.5, tribuneSize: 3 },
    budget: 48,
    maxPerClub: 4,
    usage: { oncePerPhase: false },
    captain: { enabled: true, multiplier: 2, roundOverrides: {} },
    transfers: { enabled: true, freePerRound: 0, maxPerRound: null, pointCostPerExtra: 0 },
    transferPhases: [
      { name: "Proefperiode", fromRound: 1, toRound: 4, kind: "unlimited" },
      { name: "Vaste selectie (1e helft)", fromRound: 5, toRound: 17, kind: "locked" },
      { name: "Wintertransferperiode", fromRound: 18, toRound: 18, kind: "window" },
      { name: "Vaste selectie (2e helft)", fromRound: 19, toRound: 34, kind: "locked" },
    ],
    goldenSubs: {
      perHalf: 2,
      unusedBonus: 250,
      halves: [
        { name: "1e seizoenshelft", fromRound: 5, toRound: 17 },
        { name: "2e seizoenshelft", fromRound: 19, toRound: 34 },
      ],
    },
    substitutions: { autoSubs: false, benchSize: 4 },
    deadline: { mode: "round-start" },
    timeSlots: [],
    matchOfTheRound: { enabled: false },
    availability: { excludeInjured: true, excludeSuspended: true },
    priceChanges: { enabled: true },
    horizon: 4,
    verification: {
      status: "unverified",
      source: "Externe speluitleg 2026/27, aangeleverd door de gebruiker",
      notes: "Budget, clubmaximum, formaties, tegendoelpunten en minutengrenzen nog valideren tegen het officiële reglement.",
    },
    scoring: {
      football: {
        appearance: 0,
        minutesThreshold: 45,
        minutesPoints: { GK: 36, DEF: 36, MID: 32, FWD: 28 },
        goal: { GK: 120, DEF: 96, MID: 72, FWD: 64 },
        assist: { GK: 60, DEF: 48, MID: 36, FWD: 32 },
        cleanSheet: { GK: 60, DEF: 48, MID: 16, FWD: 0 },
        win: { GK: 36, DEF: 36, MID: 32, FWD: 28 },
        draw: { GK: 18, DEF: 18, MID: 16, FWD: 14 },
        yellow: -20,
        red: -60,
        penaltySaved: { GK: 120, DEF: 0, MID: 0, FWD: 0 },
        penaltyMissed: -40,
        ownGoal: -40,
        hattrickBonus: 50,
      },
    },
  }),
};
