/**
 * DEMODATA – WK Darts (demo-toernooi met 32 deelnemers).
 * Namen zijn bekende PDC-spelers; gemiddelden, kansen, prijzen en loting zijn gegenereerd/benaderd
 * en geen actuele gegevens.
 */
import type { Dataset } from "@/engine/recommend/dataset";
import type { Player, Round } from "@/engine/types";
import { rng, slug } from "./rng";

/** [naam, gemiddelde, checkout%, first9, 180/leg, vorm, toernooiwinkans] */
type DarterSpec = [string, number, number, number, number, number, number];

const DARTERS: DarterSpec[] = [
  ["Luke Littler", 101.5, 42, 112, 0.42, 9, 0.3],
  ["Luke Humphries", 99.2, 41, 108, 0.34, 7.5, 0.14],
  ["Michael van Gerwen", 97.8, 40, 107, 0.36, 7, 0.07],
  ["Gerwyn Price", 97.0, 39, 106, 0.33, 7, 0.06],
  ["Stephen Bunting", 96.5, 41, 104, 0.28, 7, 0.04],
  ["Jonny Clayton", 96.0, 40, 104, 0.29, 6.5, 0.035],
  ["Rob Cross", 95.8, 39, 104, 0.3, 6.5, 0.03],
  ["Michael Smith", 95.5, 38, 105, 0.35, 6, 0.03],
  ["Gian van Veen", 96.8, 40, 106, 0.32, 8, 0.045],
  ["Josh Rock", 96.2, 38, 106, 0.38, 6.5, 0.03],
  ["Danny Noppert", 94.8, 41, 102, 0.26, 6.5, 0.02],
  ["Chris Dobey", 95.0, 38, 103, 0.31, 6, 0.02],
  ["Nathan Aspinall", 94.9, 39, 103, 0.3, 6, 0.02],
  ["Damon Heta", 94.5, 37, 103, 0.33, 6, 0.015],
  ["Gary Anderson", 95.2, 39, 104, 0.3, 5.5, 0.015],
  ["James Wade", 93.8, 40, 101, 0.22, 5.5, 0.01],
  ["Peter Wright", 93.5, 37, 102, 0.28, 5, 0.01],
  ["Dave Chisnall", 94.0, 37, 103, 0.34, 5.5, 0.01],
  ["Ryan Searle", 94.2, 38, 103, 0.31, 6, 0.012],
  ["Martin Schindler", 94.6, 39, 103, 0.27, 6.5, 0.012],
  ["Ross Smith", 94.0, 37, 103, 0.33, 5.5, 0.01],
  ["Dimitri Van den Bergh", 93.6, 39, 101, 0.25, 5.5, 0.01],
  ["Dirk van Duijvenbode", 94.1, 37, 103, 0.32, 5.5, 0.01],
  ["Mike De Decker", 93.9, 38, 102, 0.27, 6, 0.01],
  ["Joe Cullen", 93.2, 37, 101, 0.29, 5, 0.008],
  ["Wessel Nijman", 95.0, 39, 104, 0.31, 7, 0.015],
  ["Kevin Doets", 92.8, 38, 100, 0.24, 6, 0.006],
  ["Krzysztof Ratajski", 92.9, 39, 100, 0.23, 5, 0.006],
  ["Andrew Gilding", 92.0, 38, 99, 0.24, 4.5, 0.004],
  ["Daryl Gurney", 92.3, 37, 100, 0.27, 5, 0.005],
  ["Raymond van Barneveld", 92.5, 37, 101, 0.26, 5, 0.005],
  ["Cameron Menzies", 92.7, 36, 101, 0.3, 5.5, 0.005],
];

/** Standaard plaatsingsvolgorde voor 32 spelers (1 vs 32, 16 vs 17, …). */
const SEED_ORDER = [1, 32, 16, 17, 8, 25, 9, 24, 4, 29, 13, 20, 5, 28, 12, 21, 2, 31, 15, 18, 7, 26, 10, 23, 3, 30, 14, 19, 6, 27, 11, 22];

export const DARTS_ROUND_ID = "wk-2027";

export function buildDartsDataset(): Dataset {
  const players: Player[] = DARTERS.map(([name, avg3, co, f9, oe, form, outright], i) => {
    const r = rng(`darts-${name}`);
    const price = Math.max(4, Math.round((13 - i * 0.3 + (r() - 0.5)) * 2) / 2);
    return {
      id: `wkd-${slug(name)}`,
      name,
      position: "DARTER",
      price,
      roles: [],
      seed: i + 1,
      identityVerified: true,
      availability: name === "Peter Wright" ? { status: "ill", note: "ziek afgemeld (demo-scenario)" } : { status: "fit" },
      stats: { kind: "darts", avg3, checkoutPct: co, first9: f9, oneEightiesPerLeg: oe, form, outrightProb: outright },
    };
  });
  // Loting: geplaatsten 1–16 vast, ongeplaatsten (17–32) deterministisch "geloot".
  const unseeded = players.slice(16);
  const r = rng("darts-draw-2027");
  const shuffled = [...unseeded].sort(() => r() - 0.5);
  const bySeed = (s: number) => (s <= 16 ? players[s - 1] : shuffled[s - 17]);
  const slots = SEED_ORDER.map((s) => bySeed(s).id);

  const round: Round = {
    id: DARTS_ROUND_ID,
    gameId: "wk-darts",
    name: "WK Darts 2026/27 (demo)",
    shortName: "WK",
    deadline: "2026-12-11T19:00:00.000Z",
    fixtureIds: [],
    status: "current",
  };
  return { clubs: [], players, rounds: [round], fixtures: [], predicted: {}, confirmed: [], results: {}, brackets: { [DARTS_ROUND_ID]: slots }, timeZone: "Europe/Amsterdam" };
}
