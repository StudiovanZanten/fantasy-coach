import type { Club, ConfirmedLineup, Fixture, Player, PredictedLineupEntry, Round } from "../types";

/** Alles wat de engine nodig heeft over een spel en zijn rondes. Wordt gevuld door een data-adapter. */
export interface Dataset {
  clubs: Club[];
  players: Player[];
  rounds: Round[];
  fixtures: Fixture[];
  predicted: Record<string, Record<string, PredictedLineupEntry>>;
  /** Alle bekende officiële opstellingen; zichtbaar vanaf `publishedAt`. */
  confirmed: ConfirmedLineup[];
  /** Behaalde fantasypunten per ronde per speler (na afloop). */
  results: Record<string, Record<string, number>>;
  /** Darts: loting per ronde-id. */
  brackets?: Record<string, (string | null)[]>;
  timeZone: string;
}

export interface DatasetIndex {
  ds: Dataset;
  clubs: Map<string, Club>;
  players: Map<string, Player>;
  rounds: Map<string, Round>;
  fixtures: Map<string, Fixture>;
  playersByClub: Map<string, Player[]>;
}

export function indexDataset(ds: Dataset): DatasetIndex {
  const playersByClub = new Map<string, Player[]>();
  for (const p of ds.players) if (p.clubId) (playersByClub.get(p.clubId) ?? playersByClub.set(p.clubId, []).get(p.clubId)!).push(p);
  return {
    ds,
    clubs: new Map(ds.clubs.map((c) => [c.id, c])),
    players: new Map(ds.players.map((p) => [p.id, p])),
    rounds: new Map(ds.rounds.map((r) => [r.id, r])),
    fixtures: new Map(ds.fixtures.map((f) => [f.id, f])),
    playersByClub,
  };
}

/** Lokale aftraptijd "HH:MM" in de tijdzone van de competitie. */
export function localTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(new Date(iso));
}

export function localWeekday(iso: string, timeZone: string): number {
  const d = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone }).format(new Date(iso));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(d);
}

/** Wedstrijden van een ronde, eventueel gefilterd op tijdsloten (bijv. alleen 21:00) en dagen. */
export function roundFixtures(idx: DatasetIndex, roundId: string, filter?: { timeSlots?: string[]; days?: number[] }): Fixture[] {
  const round = idx.rounds.get(roundId);
  if (!round) return [];
  let list = round.fixtureIds.map((id) => idx.fixtures.get(id)!).filter(Boolean);
  if (filter?.timeSlots?.length) list = list.filter((f) => filter.timeSlots!.includes(localTime(f.kickoff, idx.ds.timeZone)));
  if (filter?.days?.length) list = list.filter((f) => filter.days!.includes(localWeekday(f.kickoff, idx.ds.timeZone)));
  return list;
}

/** Officiële opstelling van een wedstrijd zoals die op moment `now` bekend is. */
export function visibleLineup(idx: DatasetIndex, fixtureId: string, now: Date): ConfirmedLineup | undefined {
  return idx.ds.confirmed.find((l) => l.fixtureId === fixtureId && new Date(l.publishedAt) <= now);
}

export function upcomingRounds(idx: DatasetIndex, fromRoundId: string, horizon: number): string[] {
  const sorted = [...idx.ds.rounds].sort((a, b) => a.deadline.localeCompare(b.deadline));
  const start = sorted.findIndex((r) => r.id === fromRoundId);
  if (start < 0) return [];
  return sorted.slice(start, start + horizon).map((r) => r.id);
}
