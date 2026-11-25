import type { Dataset } from "@/engine/recommend/dataset";
import type { FootballPosition, Player } from "@/engine/types";
import { slug } from "./seed/rng";

/**
 * Spelersidentiteit. We koppelen NOOIT automatisch op alleen een achternaam: een koppeling
 * wordt pas definitief als de gebruiker hem bevestigt. Bij meerdere kandidaten (bijv. twee
 * spelers "Van Bergen") moet de gebruiker kiezen.
 */
export interface UserPlayerEntry {
  key: string;
  input: string;
  position: FootballPosition;
  /** Gekoppelde speler uit de databron (na bevestiging). */
  linkedPlayerId?: string;
  /** Speler niet in de databron: gebruiker koppelt zelf een club. */
  customClubId?: string;
  confirmed: boolean;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\bjr\.?\b/g, "jr")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Kandidaten: volledige naam gelijk, of de invoer is exact het laatste deel van de naam. Zelfde positie verplicht. */
export function matchCandidates(players: Player[], input: string, position: FootballPosition): Player[] {
  const q = norm(input);
  return players.filter((p) => {
    if (p.position !== position || p.placeholder) return false;
    const n = norm(p.name);
    return n === q || n.endsWith(` ${q}`);
  });
}

export type MatchState = "confirmed" | "suggested" | "ambiguous" | "unmatched" | "custom";

export function matchState(players: Player[], e: UserPlayerEntry): { state: MatchState; candidates: Player[] } {
  if (e.linkedPlayerId && e.confirmed) return { state: "confirmed", candidates: [] };
  if (e.customClubId) return { state: "custom", candidates: [] };
  const c = matchCandidates(players, e.input, e.position);
  if (c.length === 1) return { state: "suggested", candidates: c };
  if (c.length > 1) return { state: "ambiguous", candidates: c };
  return { state: "unmatched", candidates: [] };
}

export const customPlayerId = (e: UserPlayerEntry) => `usr-${slug(e.key)}`;

/** Spelers die de gebruiker zelf aan een club koppelde, met neutrale DEMO-statistieken. */
export function customPlayer(e: UserPlayerEntry): Player {
  const pos = e.position;
  const base = { GK: [0, 0.01], DEF: [0.04, 0.06], MID: [0.12, 0.14], FWD: [0.3, 0.12] }[pos];
  return {
    id: customPlayerId(e),
    name: e.input,
    clubId: e.customClubId,
    position: pos,
    price: 2,
    roles: [],
    identityVerified: false,
    availability: { status: "unknown", note: "eigen invoer – status onbekend" },
    stats: { kind: "football", minutesAvg: 70, startsLast5: 3, goals: 0, assists: 0, xgPer90: base[0], xaPer90: base[1], shotsPer90: 1, keyPassesPer90: 0.8, form: 5, rotationRisk: 0.3 },
  };
}

/** Speler-id in de selectie voor een entry (gekoppeld, eigen club, of nog niets). */
export function entryPlayerId(e: UserPlayerEntry): string | undefined {
  if (e.linkedPlayerId && e.confirmed) return e.linkedPlayerId;
  if (e.customClubId) return customPlayerId(e);
  return undefined;
}

/** Dataset aangevuld met de eigen spelers van de gebruiker (en hun voorspelde opstelling). */
export function withUserPlayers(ds: Dataset, entries: UserPlayerEntry[]): Dataset {
  const custom = entries.filter((e) => e.customClubId && !(e.linkedPlayerId && e.confirmed)).map(customPlayer);
  if (!custom.length) return ds;
  const predicted = { ...ds.predicted };
  for (const f of ds.fixtures) {
    for (const p of custom) {
      if (p.clubId === f.homeId || p.clubId === f.awayId) predicted[f.id] = { ...predicted[f.id], [p.id]: { startProb: 0.5, expMinutes: 75 } };
    }
  }
  return { ...ds, players: [...ds.players, ...custom], predicted };
}
