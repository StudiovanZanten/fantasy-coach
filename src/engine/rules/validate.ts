import type { Player, Position } from "../types";
import type { RuleSet } from "./schema";

export interface RuleViolation {
  code:
    | "size"
    | "position_min"
    | "position_max"
    | "club_max"
    | "budget"
    | "used"
    | "captain_missing"
    | "captain_not_in_team"
    | "duplicate"
    | "unavailable"
    | "not_in_round"
    | "locked";
  message: string;
  playerIds?: string[];
}

export interface ValidateInput {
  rules: RuleSet;
  players: Map<string, Player>;
  playerIds: string[];
  captainId?: string;
  /** Opstelling (true) of hele selectie (false, TopCoach). */
  scope?: "lineup" | "squad";
  usedPlayerIds?: Set<string>;
  /** Spelers die in deze ronde (binnen de gekozen tijdsloten) spelen. */
  eligiblePlayerIds?: Set<string>;
  budgetOverride?: number;
}

const POS_LABEL: Record<Position, string> = {
  GK: "keeper",
  DEF: "verdediger",
  MID: "middenvelder",
  FWD: "aanvaller",
  DARTER: "darter",
};

/** Controleert een team tegen alle spelregels. Lege lijst = geldig. */
export function validateTeam(input: ValidateInput): RuleViolation[] {
  const { rules, players, playerIds, captainId, usedPlayerIds, eligiblePlayerIds } = input;
  const scope = input.scope ?? "lineup";
  const size = scope === "squad" && rules.squadSize ? rules.squadSize : rules.lineupSize;
  const ranges = scope === "squad" && rules.squadPositions ? rules.squadPositions : rules.lineupPositions;
  const v: RuleViolation[] = [];

  const unique = new Set(playerIds);
  if (unique.size !== playerIds.length) v.push({ code: "duplicate", message: "Een speler staat dubbel in het team" });

  if (playerIds.length !== size)
    v.push({ code: "size", message: `Team heeft ${playerIds.length} van de ${size} spelers` });

  const posCount: Partial<Record<Position, number>> = {};
  const clubCount: Record<string, string[]> = {};
  let cost = 0;
  for (const id of playerIds) {
    const p = players.get(id);
    if (!p) continue;
    posCount[p.position] = (posCount[p.position] ?? 0) + 1;
    if (p.clubId) (clubCount[p.clubId] ??= []).push(id);
    cost += p.price;
    if (usedPlayerIds?.has(id) && rules.usage.oncePerPhase)
      v.push({ code: "used", message: `${p.name} is al eerder gebruikt`, playerIds: [id] });
    if (eligiblePlayerIds && !eligiblePlayerIds.has(id))
      v.push({ code: "not_in_round", message: `${p.name} speelt niet in deze (deel)ronde`, playerIds: [id] });
    if (
      (rules.availability.excludeInjured && ["injured", "ill", "withdrawn"].includes(p.availability.status)) ||
      (rules.availability.excludeSuspended && p.availability.status === "suspended")
    )
      v.push({ code: "unavailable", message: `${p.name} is niet beschikbaar (${p.availability.note ?? p.availability.status})`, playerIds: [id] });
  }

  for (const [pos, rg] of Object.entries(ranges) as [Position, { min: number; max: number } | undefined][]) {
    if (!rg) continue;
    const n = posCount[pos] ?? 0;
    if (n < rg.min) v.push({ code: "position_min", message: `Minimaal ${rg.min} ${POS_LABEL[pos]}${rg.min === 1 ? "" : "s"} nodig (nu ${n})` });
    if (n > rg.max) v.push({ code: "position_max", message: `Maximaal ${rg.max} ${POS_LABEL[pos]}${rg.max === 1 ? "" : "s"} toegestaan (nu ${n})` });
  }

  if (rules.maxPerClub !== null) {
    for (const [club, ids] of Object.entries(clubCount)) {
      if (ids.length > rules.maxPerClub)
        v.push({ code: "club_max", message: `Maximaal ${rules.maxPerClub} spelers per club (${ids.length} van ${club})`, playerIds: ids });
    }
  }

  const budget = input.budgetOverride ?? rules.budget;
  if (budget !== null && budget !== undefined && cost > budget + 1e-9)
    v.push({ code: "budget", message: `Budget overschreden: ${cost.toFixed(1)} van ${budget.toFixed(1)}` });

  if (rules.captain.enabled && scope === "lineup") {
    if (!captainId) v.push({ code: "captain_missing", message: "Kies een captain" });
    else if (!playerIds.includes(captainId)) v.push({ code: "captain_not_in_team", message: "De captain staat niet in het team" });
  }
  return v;
}

export function teamCost(players: Map<string, Player>, ids: string[]): number {
  return ids.reduce((s, id) => s + (players.get(id)?.price ?? 0), 0);
}
