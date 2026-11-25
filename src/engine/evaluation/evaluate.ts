import { captainMultiplierFor } from "../rules/schema";
import { planLineups, type Candidate } from "../optimizer/lineup";
import { joinNl } from "../scoring/explain";
import { projectRound, type RecommendContext } from "../recommend/football";

/**
 * Evaluatie na afloop van een ronde: wat leverde het team op, wat deed de captainkeuze,
 * wat was achteraf het beste team (met dezelfde regels en gebruikte spelers), en welke lessen
 * trekken we daaruit voor de volgende ronde.
 */

export interface EvaluationResult {
  roundId: string;
  total: number;
  expected: number;
  perPlayer: { playerId: string; points: number; expected: number; isCaptain: boolean; delta: number }[];
  captain: { playerId?: string; points: number; bestInTeamId?: string; bestInTeamPoints: number; lostPoints: number; multiplier: number };
  hindsight: { playerIds: string[]; captainId?: string; total: number };
  missed: { playerId: string; points: number }[];
  goodChoices: { playerId: string; points: number; expected: number }[];
  lessons: string[];
}

export function evaluateRound(ctx: RecommendContext, roundId: string, playerIds: string[], captainId?: string): EvaluationResult {
  const { idx, rules } = ctx;
  const results = idx.ds.results[roundId] ?? {};
  const round = idx.rounds.get(roundId)!;
  const m = captainMultiplierFor(rules, roundId, round.captainMultiplier);
  const proj = projectRound({ ...ctx, now: new Date(round.deadline) }, roundId);
  const pts = (id: string) => results[id] ?? 0;

  const perPlayer = playerIds.map((id) => {
    const isCaptain = id === captainId;
    const points = pts(id) * (isCaptain ? m : 1);
    const expected = (proj.get(id)?.ev ?? 0) * (isCaptain ? m : 1);
    return { playerId: id, points, expected: round1(expected), isCaptain, delta: round1(points - expected) };
  });
  const total = perPlayer.reduce((s, p) => s + p.points, 0);
  const expected = perPlayer.reduce((s, p) => s + p.expected, 0);

  const best = [...playerIds].sort((a, b) => pts(b) - pts(a))[0];
  const capPts = captainId ? pts(captainId) : 0;
  const lostPoints = (pts(best) - capPts) * (m - 1);

  // Achteraf-optimum: zelfde regels, met behaalde punten als score.
  const cands: Candidate[] = [...proj.values()].map((p) => {
    const pl = idx.players.get(p.playerId)!;
    return { playerId: p.playerId, position: pl.position, clubId: pl.clubId, price: pl.price, score: pts(p.playerId), ev: pts(p.playerId) };
  });
  const usedBefore = new Set(ctx.usedPlayerIds.filter((id) => !playerIds.includes(id)));
  const hs = planLineups({
    rules,
    rounds: [{ roundId, captainMultiplier: m, weight: 1, candidates: cands }],
    excludedIds: rules.usage.oncePerPhase ? usedBefore : new Set(),
    pruneFactor: 5,
  });
  const hsRound = hs.rounds[0];

  const missed = cands
    .filter((c) => !playerIds.includes(c.playerId) && !usedBefore.has(c.playerId))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((c) => ({ playerId: c.playerId, points: c.score }));
  const goodChoices = perPlayer.filter((p) => p.delta >= 2).map((p) => ({ playerId: p.playerId, points: p.points, expected: p.expected }));

  const lessons: string[] = [];
  const name = (id: string) => idx.players.get(id)?.name ?? id;
  if (captainId && best !== captainId && lostPoints > 0)
    lessons.push(`De captainkeuze kostte ${lostPoints.toFixed(0)} punten: ${name(best)} scoorde meer dan ${name(captainId)}.`);
  else if (captainId) lessons.push(`Goede captainkeuze: ${name(captainId)} was de topscorer van je team.`);
  const zero = perPlayer.filter((p) => p.points <= 1).map((p) => name(p.playerId));
  if (zero.length) lessons.push(`${joinNl(zero)} leverde${zero.length > 1 ? "n" : ""} (bijna) niets op. Check of dit pech was of een slechte inschatting van basisplaats of tegenstander.`);
  if (hsRound) {
    const gap = hsRound.score - total;
    if (gap > 0) lessons.push(`Het achteraf-beste team had ${gap.toFixed(0)} punten meer. Dat is ter referentie: achteraf weet je alles.`);
  }
  if (total >= expected) lessons.push(`Het team scoorde ${(total - expected).toFixed(0)} punten boven verwachting.`);
  else lessons.push(`Het team scoorde ${(expected - total).toFixed(0)} punten onder verwachting.`);

  return {
    roundId,
    total,
    expected: round1(expected),
    perPlayer,
    captain: { playerId: captainId, points: capPts * m, bestInTeamId: best, bestInTeamPoints: pts(best) * m, lostPoints: Math.max(0, lostPoints), multiplier: m },
    hindsight: { playerIds: hsRound?.playerIds ?? [], captainId: hsRound?.captainId, total: hsRound?.score ?? 0 },
    missed,
    goodChoices,
    lessons,
  };
}

const round1 = (x: number) => Math.round(x * 10) / 10;
