import { buildFootballDataset, cet, addDays, simulateResults } from "../seed/generate";
import { UCL_CLUBS, UCL_QUALIFIED_BEFORE_LAST, UCL_ROUNDS, UCL_SUPER_ROUND } from "../seed/ucl";
import { ERE_AVAILABILITY, ERE_CLUBS, ERE_ROUNDS, ERE_SLOTS } from "../seed/eredivisie";
import { buildDartsDataset } from "../seed/darts";
import { champCoach } from "@/games/champ-coach";
import { topcoachEredivisie } from "@/games/topcoach-eredivisie";
import type { Dataset } from "@/engine/recommend/dataset";
import type { DataSourceAdapter, DemoClock, GameBundle } from "./types";

/**
 * SeedDataAdapter – levert DEMODATA voor alle spellen. Niets hiervan is live.
 * Vervang later per datatype door een echte adapter (zie docs/06-DATA_SOURCES.md).
 */
const meta = {
  sourceId: "seed",
  label: "Demodata",
  isMock: true,
  notes: "Gegenereerde statistieken, odds, opstellingen en uitslagen. Selecties kunnen verouderd zijn.",
};

let cache: Record<string, GameBundle> | null = null;

function build(): Record<string, GameBundle> {
  const updatedAt = "2026-11-25T12:00:00.000Z";

  // TopCoach Eredivisie: speelronde 13 gespeeld, 14 t/m 17 open. PSV speelt steeds op zondag.
  const ereKickoffs = (fri: string) => {
    const sat = addDays(fri, 1);
    const sun = addDays(fri, 2);
    return [cet(fri, "20:00"), cet(sat, "16:30"), cet(sat, "18:45"), cet(sat, "20:00"), cet(sat, "21:00"), cet(sun, "12:15"), cet(sun, "14:30"), cet(sun, "14:30"), cet(sun, "16:45")];
  };
  const ere: Dataset = buildFootballDataset({
    gameId: topcoachEredivisie.id,
    prefix: "ere",
    clubs: ERE_CLUBS,
    fillSlots: ERE_SLOTS,
    prices: { 5: 7, 4: 4.5, 3: 3, 2: 1.5, 1: 1 },
    availability: ERE_AVAILABILITY,
    lateClubs: ["psv"],
    rounds: ERE_ROUNDS.map(([n, fri, cap]) => ({
      id: `ere-r${n}`,
      name: `Speelronde ${n}${cap === 3 ? " · Super Weekend" : ""}`,
      shortName: `SR${n}`,
      matchday: n,
      kickoffs: ereKickoffs(fri),
      captainMultiplier: cap,
      past: n === 13,
    })),
    timeZone: "Europe/Amsterdam",
  });
  ere.results = simulateResults(ere, topcoachEredivisie.defaultRules.scoring.football!);

  // Champ Coach: speeldag 4 gespeeld; elke speeldag = deelronde dinsdag + woensdag.
  const ucl: Dataset = buildFootballDataset({
    gameId: champCoach.id,
    prefix: "ucl",
    clubs: UCL_CLUBS,
    prices: { 5: 10, 4: 8, 3: 6, 2: 5, 1: 4 },
    availability: {
      "Jamal Musiala": { status: "injured", note: "langdurige blessure", recovery: "rehab" },
      Rodri: { status: "doubtful", note: "lichte knieklachten", recovery: "team_training" },
      "Cole Palmer": { status: "returning", recovery: "team_training", note: "net terug van liesblessure" },
    },
    lineupOverrides: { "Ayase Ueda": "bench", "Ousmane Dembélé": "bench" },
    rounds: UCL_ROUNDS.map(([label, md, tue, wed]) => ({
      id: `cc-${label.toLowerCase()}`,
      name: `Ronde ${label}${label === UCL_SUPER_ROUND ? " · Superronde (captain 300%)" : ""}`,
      shortName: label,
      matchday: md,
      phase: "league",
      past: md <= 4,
      captainMultiplier: label === UCL_SUPER_ROUND ? 3 : undefined,
      rotationRiskClubs: md === 8 ? UCL_QUALIFIED_BEFORE_LAST : undefined,
      kickoffs: [
        cet(tue, "18:45"), cet(tue, "21:00"), cet(tue, "21:00"), cet(tue, "21:00"), cet(tue, "21:00"),
        cet(wed, "18:45"), cet(wed, "21:00"), cet(wed, "21:00"), cet(wed, "21:00"),
      ],
    })),
    timeZone: "Europe/Amsterdam",
  });
  ucl.results = simulateResults(ucl, champCoach.defaultRules.scoring.football!);

  const darts = buildDartsDataset();

  const clocksEre: DemoClock[] = [
    { id: "ere-wed", label: "Wo 25 nov 21:00 – ruim voor de deadline", now: "2026-11-25T20:00:00.000Z" },
    { id: "ere-fri", label: "Vr 27 nov 19:30 – nog 30 minuten tot de deadline", now: "2026-11-27T18:30:00.000Z" },
    { id: "ere-sun", label: "Zo 29 nov 15:50 – na de deadline, PSV-opstelling bekend", now: "2026-11-29T14:50:00.000Z" },
  ];
  const clocksUcl: DemoClock[] = [
    { id: "cc-1600", label: "Di 8 dec 16:00 – opstellingen nog niet bekend", now: "2026-12-08T15:00:00.000Z" },
    { id: "cc-1750", label: "Di 8 dec 17:50 – opstelling 18:45 bekend", now: "2026-12-08T16:50:00.000Z" },
    { id: "cc-2005", label: "Di 8 dec 20:05 – alle opstellingen bekend", now: "2026-12-08T19:05:00.000Z" },
  ];
  return {
    [topcoachEredivisie.id]: { gameId: topcoachEredivisie.id, meta: { ...meta, updatedAt }, dataset: ere, demoClocks: clocksEre },
    [champCoach.id]: { gameId: champCoach.id, meta: { ...meta, updatedAt }, dataset: ucl, demoClocks: clocksUcl },
    "wk-darts": {
      gameId: "wk-darts",
      meta: { ...meta, updatedAt },
      dataset: darts,
      demoClocks: [{ id: "wk-pre", label: "Vr 11 dec – voor de start van het toernooi", now: "2026-12-10T12:00:00.000Z" }],
    },
  };
}

export const seedAdapter: DataSourceAdapter = {
  meta,
  async getGameBundle(gameId) {
    cache ??= build();
    return cache[gameId] ?? null;
  },
};

export function getSeedBundleSync(gameId: string): GameBundle | null {
  cache ??= build();
  return cache[gameId] ?? null;
}
