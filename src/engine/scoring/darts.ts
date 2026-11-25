import { eloWinProb, simulateBracket, type BracketOdds } from "../bracket/simulate";
import type { DartsScoring } from "../rules/schema";
import type { DartsStats, Player, PlayerProjection, Preferences, ScoreFactor } from "../types";
import { clamp } from "./poisson";
import { joinNl, pct } from "./explain";

/**
 * Darts-rating: combinatie van statistiek (gemiddelde, checkout, first 9, vorm) en
 * bookmakerskansen. Het verschil van 400 punten ≈ 10:1 favoriet.
 */
export function dartsRating(s: DartsStats): number {
  const statRating = 1500 + (s.avg3 - 92) * 24 + (s.checkoutPct - 38) * 5 + (s.first9 - s.avg3 - 5) * 6 + (s.form - 5) * 14;
  // Bookmakers prijzen meer informatie in (bijv. toernooi-ervaring); 30% weging.
  const marketRating = 1500 + 160 * Math.log10(Math.max(s.outrightProb, 0.001) / 0.02);
  return Math.round(0.7 * statRating + 0.3 * marketRating);
}

export interface DartsTournamentContext {
  slots: (string | null)[];
  players: Map<string, Player>;
  scoring: DartsScoring;
  prefs: Preferences;
  roundId: string;
  usedPlayerIds?: Set<string>;
}

export interface DartsAnalysis {
  odds: BracketOdds;
  ratings: Record<string, number>;
  projections: PlayerProjection[];
  /** Gemiddelde rating van verwachte tegenstanders t/m de kwartfinale. */
  routeDifficulty: Record<string, number>;
}

const LEGS_PER_MATCH = [9, 11, 14, 17, 20, 24, 28];

export function analyseDartsTournament(ctx: DartsTournamentContext): DartsAnalysis {
  const ratings: Record<string, number> = {};
  for (const id of ctx.slots) {
    if (!id) continue;
    const p = ctx.players.get(id);
    if (!p) continue;
    const s = p.stats as DartsStats;
    // Afgemelde/zieke spelers krijgen een zeer lage rating: ze verliezen vrijwel zeker (walk-over).
    ratings[id] = ["withdrawn", "ill", "injured"].includes(p.availability.status) ? 600 : dartsRating(s);
  }
  const odds = simulateBracket(ctx.slots, eloWinProb(ratings));
  const routeRounds = Math.min(odds.roundNames.length, odds.roundNames.indexOf("QF") + 1 || odds.roundNames.length);

  const routeDifficulty: Record<string, number> = {};
  for (const id of Object.keys(ratings)) {
    let sum = 0;
    let n = 0;
    for (let r = 0; r < routeRounds; r++) {
      const opp = odds.likelyOpponent[r][id];
      if (!opp) continue;
      sum += ratings[opp.opponentId] ?? 1500;
      n++;
    }
    routeDifficulty[id] = n ? sum / n : 1500;
  }
  const sortedRoutes = Object.values(routeDifficulty).sort((a, b) => a - b);
  const median = sortedRoutes[Math.floor(sortedRoutes.length / 2)] ?? 1500;

  const projections: PlayerProjection[] = [];
  for (const id of Object.keys(ratings)) {
    const player = ctx.players.get(id)!;
    const s = player.stats as DartsStats;
    let matchPts = 0;
    let statPts = 0;
    odds.roundNames.forEach((name, r) => {
      const reach = odds.reach[r][id] ?? 0;
      const win = odds.win[r][id] ?? 0;
      matchPts += win * (ctx.scoring.matchWin[name] ?? 0);
      const legs = LEGS_PER_MATCH[r] ?? 20;
      const p100 = 1 / (1 + Math.exp(-(s.avg3 - 100) / 2.5));
      statPts += reach * (s.oneEightiesPerLeg * legs * ctx.scoring.per180 + p100 * ctx.scoring.avgOver100);
    });
    const last = odds.roundNames.length - 1;
    const pWinTournament = odds.win[last][id] ?? 0;
    const titlePts = pWinTournament * ctx.scoring.tournamentWin;
    const ev = matchPts + statPts + titlePts;
    const sd = Math.sqrt(Math.max(0, ev * 6));

    const withdrawn = ["withdrawn", "ill", "injured"].includes(player.availability.status);
    const lambda = ctx.prefs.riskProfile === "safe" ? 0.25 : ctx.prefs.riskProfile === "aggressive" ? -0.15 : 0.05;
    const routeBonus = clamp((median - routeDifficulty[id]) / 400, -0.15, 0.15);
    const fav = ctx.prefs.favoritePlayerIds.includes(id) ? 1.05 : 1;
    const score = Math.max(0, ev * fav - lambda * sd);

    const factors: ScoreFactor[] = [
      { key: "matches", label: "Gewonnen partijen (route)", value: r2(matchPts), kind: "points" },
      { key: "stats", label: "180's en hoge gemiddelden", value: r2(statPts), kind: "points" },
      { key: "title", label: "Kans op toernooiwinst", value: r2(titlePts), kind: "points" },
      { key: "route", label: "Zwaarte van de route", value: r2(routeBonus), kind: "info" },
    ];

    const qfIndex = odds.roundNames.indexOf("QF");
    const pQF = qfIndex >= 0 ? odds.reach[qfIndex][id] ?? 0 : 0;
    const firstOpp = odds.likelyOpponent[0][id];
    const secondOpp = odds.likelyOpponent[1]?.[id];
    const parts = [`gemiddelde ${s.avg3.toFixed(1)}`, `checkout ${s.checkoutPct.toFixed(0)}%`];
    if (firstOpp) {
      const opp = ctx.players.get(firstOpp.opponentId);
      parts.push(`eerste partij tegen ${opp?.name ?? "onbekend"} (winkans ${pct(eloWinProb(ratings)(id, firstOpp.opponentId))})`);
    }
    if (secondOpp && secondOpp.prob > 0.5) {
      const opp = ctx.players.get(secondOpp.opponentId);
      parts.push(`daarna waarschijnlijk ${opp?.name}`);
    }
    parts.push(routeBonus > 0.04 ? "gunstige loting" : routeBonus < -0.04 ? "zware route" : "gemiddelde route");
    parts.push(`${pct(pQF)} kans op de kwartfinale`);

    projections.push({
      playerId: id,
      roundId: ctx.roundId,
      ev: r2(ev),
      sd: r2(sd),
      score: r2(score),
      startProb: withdrawn ? 0 : 1,
      status: withdrawn ? "AFWEZIG" : "BASIS",
      pWin: pWinTournament,
      factors,
      summary: withdrawn
        ? `${player.name} – afgemeld (${player.availability.note ?? "niet beschikbaar"}).`
        : `${player.name} – ${joinNl(parts)}.`,
      available: !withdrawn && !ctx.prefs.blockedPlayerIds.includes(id),
      unavailableReason: withdrawn ? player.availability.note ?? "Afgemeld" : ctx.prefs.blockedPlayerIds.includes(id) ? "Handmatig geblokkeerd" : undefined,
    });
  }
  return { odds, ratings, projections, routeDifficulty };
}

const r2 = (x: number) => Math.round(x * 100) / 100;
