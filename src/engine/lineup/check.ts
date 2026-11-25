import { captainMultiplierFor } from "../rules/schema";
import { validateTeam, type RuleViolation } from "../rules/validate";
import { planLineups, type Candidate } from "../optimizer/lineup";
import type { LineupStatus, PlayerProjection } from "../types";
import { projectRound, type RecommendContext } from "../recommend/football";
import { roundFixtures } from "../recommend/dataset";

/**
 * Opstellingencheck (± 60 minuten voor aftrap).
 *
 * 1. Status per gekozen speler uit de officiële opstelling (of ONZEKER/VERWACHTE BASIS).
 * 2. Voor elke niet-starter: los het model opnieuw op met alle andere spelers vastgezet.
 *    Door de formatieconstraint komt de vervanger automatisch op dezelfde fantasypositie,
 *    en club-, budget- en eenmalig-gebruikregels blijven gelden.
 * 3. Controleer de captain; kies zo nodig de beste starter als nieuwe captain.
 */

export interface LineupCheckPlayer {
  playerId: string;
  status: LineupStatus;
  /** Wedstrijd al begonnen → speler kan niet meer worden gewisseld. */
  locked: boolean;
  kickoff?: string;
  replacement?: { playerId: string; status: LineupStatus; reason: string };
}

export interface LineupCheckResult {
  roundId: string;
  players: LineupCheckPlayer[];
  allStarting: boolean;
  allPublished: boolean;
  captainId?: string;
  captainStatus?: LineupStatus;
  suggestedCaptainId?: string;
  suggestedPlayerIds: string[];
  violations: RuleViolation[];
  message: string;
}

const NOT_STARTING: LineupStatus[] = ["BANK", "AFWEZIG"];
const numbers = ["nul", "één", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien", "elf"];

export function checkLineup(ctx: RecommendContext, roundId: string, inputIds: string[], captainId?: string): LineupCheckResult {
  const { idx, rules, now } = ctx;
  const round = idx.rounds.get(roundId);
  if (!round) throw new Error(`Onbekende ronde ${roundId}`);
  // Onbekende ids (bijv. uit een oude opslag) negeren in plaats van te laten crashen.
  const playerIds = inputIds.filter((id) => idx.players.has(id));
  const proj = projectRound(ctx, roundId);
  const fixtures = roundFixtures(idx, roundId, ctx.overrides);
  const started = (fixtureId?: string) => {
    if (rules.deadline.mode === "round-start") return new Date(round.deadline) <= now;
    const f = fixtureId ? idx.fixtures.get(fixtureId) : undefined;
    return f ? new Date(f.kickoff) <= now : false;
  };

  const players: LineupCheckPlayer[] = playerIds.map((id) => {
    const p = proj.get(id);
    const fixture = p?.fixtureId ? idx.fixtures.get(p.fixtureId) : undefined;
    return { playerId: id, status: p?.status ?? "AFWEZIG", locked: started(p?.fixtureId), kickoff: fixture?.kickoff };
  });

  // Vervangers zoeken voor niet-starters die nog gewisseld kunnen worden.
  const toReplace = players.filter((p) => NOT_STARTING.includes(p.status) && !p.locked);
  let suggested = [...playerIds];
  if (toReplace.length) {
    const keep = playerIds.filter((id) => !toReplace.some((r) => r.playerId === id));
    const anyPublished = fixtures.some((f) => idx.ds.confirmed.some((l) => l.fixtureId === f.id && new Date(l.publishedAt) <= now));
    const cands: Candidate[] = [];
    for (const p of proj.values()) {
      if (!p.available && !keep.includes(p.playerId)) continue;
      if (!keep.includes(p.playerId) && started(p.fixtureId)) continue;
      const pl = idx.players.get(p.playerId)!;
      // Bij bekende opstellingen bevestigde basisspelers duidelijk voortrekken.
      const boost = anyPublished && p.status === "BASIS" ? 1.15 : 1;
      cands.push({ playerId: p.playerId, position: pl.position, clubId: pl.clubId, price: pl.price, score: p.score * boost, ev: p.ev });
    }
    const m = captainMultiplierFor(rules, roundId, round.captainMultiplier);
    const plan = planLineups({
      rules,
      rounds: [{ roundId, captainMultiplier: m, weight: 1, candidates: cands }],
      lockedIds: keep,
      excludedIds: new Set([...(rules.usage.oncePerPhase ? ctx.usedPlayerIds : []), ...toReplace.map((r) => r.playerId)]),
      pruneFactor: 6,
    });
    if (plan.feasible && plan.rounds[0]) {
      const newIds = plan.rounds[0].playerIds.filter((id) => !keep.includes(id));
      suggested = [...keep, ...newIds];
      for (const r of toReplace) {
        const pos = idx.players.get(r.playerId)!.position;
        const repl = newIds.find((id) => idx.players.get(id)!.position === pos && !players.some((x) => x.replacement?.playerId === id));
        if (repl) {
          const rp = proj.get(repl)!;
          r.replacement = { playerId: repl, status: rp.status, reason: rp.summary };
        }
      }
    }
  }

  // Captaincontrole.
  const capProj = captainId ? proj.get(captainId) : undefined;
  let suggestedCaptainId = captainId;
  const captainOut = !captainId || !suggested.includes(captainId) || (capProj && NOT_STARTING.includes(capProj.status));
  if (rules.captain.enabled && captainOut) {
    suggestedCaptainId = bestCaptain(suggested, proj, (id) => players.find((p) => p.playerId === id)?.locked ?? false);
  }

  const violations = validateTeam({
    rules,
    players: idx.players,
    playerIds: suggested,
    captainId: suggestedCaptainId,
    usedPlayerIds: new Set(ctx.usedPlayerIds),
    eligiblePlayerIds: new Set(proj.keys()),
  });

  const allStarting = players.every((p) => p.status === "BASIS");
  const allPublished = players.every((p) => ["BASIS", "BANK", "AFWEZIG"].includes(p.status));
  const nonStarters = players.filter((p) => NOT_STARTING.includes(p.status));
  const n = players.length;
  let message: string;
  if (allStarting) message = `Alle ${numbers[n] ?? n} starten.`;
  else if (nonStarters.length)
    message = `${nonStarters.length} speler${nonStarters.length > 1 ? "s starten" : " start"} niet. ${nonStarters.every((p) => p.replacement) ? "Er staan vervangers klaar." : "Niet voor iedereen is een vervanger mogelijk."}`;
  else message = `${players.filter((p) => p.status === "BASIS").length} van de ${n} bevestigd; de rest is nog niet bekend.`;

  return {
    roundId,
    players,
    allStarting,
    allPublished,
    captainId,
    captainStatus: capProj?.status,
    suggestedCaptainId,
    suggestedPlayerIds: suggested,
    violations,
    message,
  };
}

function bestCaptain(ids: string[], proj: Map<string, PlayerProjection>, locked: (id: string) => boolean): string | undefined {
  return ids
    .map((id) => proj.get(id))
    .filter((p): p is PlayerProjection => Boolean(p) && !NOT_STARTING.includes(p!.status))
    .sort((a, b) => Number(locked(a.playerId)) - Number(locked(b.playerId)) || b.score - a.score)[0]?.playerId;
}
