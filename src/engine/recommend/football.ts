import { captainMultiplierFor, type RuleOverrides, type RuleSet } from "../rules/schema";
import { projectFootball } from "../scoring/football";
import { joinNl, opponentLabel, pct } from "../scoring/explain";
import { planLineups, type Candidate, type PlannedRound, type RoundCandidates } from "../optimizer/lineup";
import type { PlayerProjection, Preferences, RiskProfile } from "../types";
import { roundFixtures, upcomingRounds, visibleLineup, type DatasetIndex } from "./dataset";
export type { DatasetIndex };

export const ENGINE_VERSION = "0.1.0";

export interface RecommendContext {
  idx: DatasetIndex;
  rules: RuleSet;
  prefs: Preferences;
  overrides?: RuleOverrides;
  usedPlayerIds: string[];
  now: Date;
}

/** Projecties voor alle spelers die in een ronde (binnen de tijdsloten) spelen. */
export function projectRound(ctx: RecommendContext, roundId: string, prefs: Preferences = ctx.prefs): Map<string, PlayerProjection> {
  const { idx, rules } = ctx;
  const round = idx.rounds.get(roundId);
  const out = new Map<string, PlayerProjection>();
  if (!round || !rules.scoring.football) return out;
  const used = new Set(ctx.usedPlayerIds);
  for (const f of roundFixtures(idx, roundId, ctx.overrides)) {
    const lineup = visibleLineup(idx, f.id, ctx.now);
    for (const [clubId, oppId] of [
      [f.homeId, f.awayId],
      [f.awayId, f.homeId],
    ]) {
      const club = idx.clubs.get(clubId)!;
      const opponent = idx.clubs.get(oppId)!;
      const rotation = round.rotationRiskClubs?.includes(clubId) ? `Rotatiegevaar: ${club.shortName} is al geplaatst` : undefined;
      for (const player of idx.playersByClub.get(clubId) ?? []) {
        const pred = idx.ds.predicted[f.id]?.[player.id];
        out.set(
          player.id,
          projectFootball({
            player,
            club,
            opponent,
            fixture: f,
            roundId,
            scoring: rules.scoring.football,
            prefs,
            predicted: pred && rotation ? { ...pred, startProb: pred.startProb * 0.7 } : pred,
            rotationRisk: rotation,
            // Niet-geverifieerde (eigen) spelers staan niet in de bronopstelling: dan blijft hun status onbekend.
            confirmed: lineup?.players[player.id] ?? (lineup && player.identityVerified !== false ? "absent" : undefined),
            lineupPublished: Boolean(lineup) && (lineup?.players[player.id] !== undefined || player.identityVerified !== false),
            isMatchOfTheRound: rules.matchOfTheRound.enabled && round.matchOfTheRoundFixtureId === f.id,
            matchOfTheRoundMultiplier: rules.matchOfTheRound.bonusMultiplier,
            ruleExclusion: rules.usage.oncePerPhase && used.has(player.id) ? "Al eerder gebruikt" : undefined,
          }),
        );
      }
    }
  }
  return out;
}

export interface PickExplanation {
  playerId: string;
  projection: PlayerProjection;
  /** Waarom nu gebruiken (of waarom deze keuze). */
  reason: string;
  /** Wat je hierdoor later verliest (eenmalig gebruik). */
  lostFuture?: { roundId: string; ev: number; text: string };
}

export interface FixtureInsight {
  fixtureId: string;
  favouriteId: string;
  pFavourite: number;
  strengthGap: number;
  /** Som van de beste vier spelers per club (clublimiet). */
  topValue: Record<string, number>;
  text: string;
}

export interface SaveAdvice {
  playerId: string;
  laterRoundId: string;
  nowScore: number;
  laterScore: number;
  reason: string;
}

export interface Recommendation {
  engineVersion: string;
  roundId: string;
  variant: RiskProfile;
  feasible: boolean;
  playerIds: string[];
  captainId?: string;
  captainMultiplier: number;
  expectedPoints: number;
  picks: PickExplanation[];
  captain?: { playerId: string; reason: string; alternatives: { playerId: string; pointsLess: number }[] };
  saved: SaveAdvice[];
  conflict?: { summary: string; greedyPoints: number; planPoints: number; greedyOnlyIds: string[] };
  bestFixtures: FixtureInsight[];
  /** Beste beschikbare spelers per positie in deze ronde. */
  bestByPosition: Record<string, string[]>;
  futurePlan: PlannedRound[];
  headline: string;
  warnings: string[];
}

const withRisk = (p: Preferences, risk: RiskProfile): Preferences => ({ ...p, riskProfile: risk });

function toCandidates(ctx: RecommendContext, proj: Map<string, PlayerProjection>): Candidate[] {
  const out: Candidate[] = [];
  for (const p of proj.values()) {
    if (!p.available) continue;
    const pl = ctx.idx.players.get(p.playerId)!;
    out.push({ playerId: p.playerId, position: pl.position, clubId: pl.clubId, price: pl.price, score: p.score, ev: p.ev });
  }
  return out;
}

/** Rondes waarin de planner vooruit kijkt: binnen dezelfde fase, beperkt tot de horizon. */
function planningRounds(ctx: RecommendContext, roundId: string): string[] {
  const horizon = ctx.rules.mode === "once-per-phase" ? ctx.prefs.planningHorizon : Math.max(ctx.rules.horizon, 1);
  const current = ctx.idx.rounds.get(roundId);
  return upcomingRounds(ctx.idx, roundId, Math.max(horizon, 1)).filter(
    (id) => !current?.phase || ctx.idx.rounds.get(id)?.phase === current.phase,
  );
}

export interface RecommendOptions {
  roundId: string;
  variant?: RiskProfile;
  lockedIds?: string[];
  lockedCaptainId?: string;
  excludedIds?: string[];
  currentSquadIds?: string[];
}

export function recommend(ctx: RecommendContext, opts: RecommendOptions): Recommendation {
  return recommendOnce(ctx, opts);
}

/** Champ Coach-achtige spellen: eenmalig gebruik, meerdere rondes vooruit plannen. */
function recommendOnce(ctx: RecommendContext, opts: RecommendOptions): Recommendation {
  const variant = opts.variant ?? ctx.prefs.riskProfile;
  const prefs = withRisk(ctx.prefs, variant);
  const roundIds = planningRounds(ctx, opts.roundId);
  const projections = roundIds.map((id) => projectRound(ctx, id, prefs));
  const rounds: RoundCandidates[] = roundIds.map((id, i) => ({
    roundId: id,
    captainMultiplier: captainMultiplierFor(ctx.rules, id, ctx.idx.rounds.get(id)?.captainMultiplier),
    weight: Math.pow(1 - prefs.futureDiscount, i),
    candidates: toCandidates(ctx, projections[i]),
  }));

  const excludedIds = new Set([...(ctx.rules.usage.oncePerPhase ? ctx.usedPlayerIds : []), ...(opts.excludedIds ?? [])]);
  const excludedNowIds = new Set(prefs.savedPlayerIds);
  for (const c of rounds[0]?.candidates ?? []) if (c.clubId && prefs.savedClubIds.includes(c.clubId)) excludedNowIds.add(c.playerId);

  const plan = planLineups({
    rules: ctx.rules,
    rounds: ctx.rules.usage.oncePerPhase ? rounds : rounds.slice(0, 1),
    excludedIds,
    excludedNowIds,
    lockedIds: opts.lockedIds,
    lockedCaptainId: opts.lockedCaptainId,
  });
  // Ter vergelijking: het beste team als je alleen naar deze ronde kijkt.
  const greedy = planLineups({ rules: ctx.rules, rounds: rounds.slice(0, 1), excludedIds, excludedNowIds, lockedIds: opts.lockedIds });

  const base = emptyRecommendation(opts.roundId, variant, rounds[0]?.captainMultiplier ?? 1);
  if (!plan.feasible || !plan.rounds[0]?.playerIds.length) {
    base.warnings.push("Er is geen geldig team mogelijk met de huidige regels, filters en gebruikte spelers.");
    return base;
  }
  const now = plan.rounds[0];
  const proj0 = projections[0];
  const result: Recommendation = {
    ...base,
    feasible: true,
    playerIds: now.playerIds,
    captainId: now.captainId,
    expectedPoints: now.expectedPoints,
    futurePlan: plan.rounds.slice(1),
  };
  result.picks = now.playerIds.map((id) => ({ playerId: id, projection: proj0.get(id)!, reason: proj0.get(id)!.summary, lostFuture: lostFuture(ctx, id, projections, roundIds) }));
  result.bestFixtures = fixtureInsights(ctx, opts.roundId, proj0);
  const byPos: Record<string, string[]> = {};
  for (const p of [...proj0.values()].filter((p) => p.available && !excludedIds.has(p.playerId)).sort((a, b) => b.score - a.score)) {
    const pos = ctx.idx.players.get(p.playerId)!.position;
    (byPos[pos] ??= []).length < 5 && byPos[pos].push(p.playerId);
  }
  result.bestByPosition = byPos;
  result.captain = captainAdvice(ctx, now.playerIds, now.captainId, proj0, result.captainMultiplier);
  result.saved = saveAdvice(ctx, plan.rounds, projections, roundIds);

  if (greedy.feasible && greedy.rounds[0]) {
    const g = greedy.rounds[0];
    const greedyOnly = g.playerIds.filter((id) => !now.playerIds.includes(id));
    if (greedyOnly.length && g.expectedPoints - now.expectedPoints > 0.3) {
      const names = greedyOnly.map((id) => ctx.idx.players.get(id)!.name);
      result.conflict = {
        summary: `Puur voor deze ronde levert ${joinNl(names)} ${(g.expectedPoints - now.expectedPoints).toFixed(1)} punt meer op, maar over het hele toernooi is bewaren beter.`,
        greedyPoints: g.expectedPoints,
        planPoints: now.expectedPoints,
        greedyOnlyIds: greedyOnly,
      };
    }
  }
  result.headline = headline(ctx, opts.roundId, result, proj0);
  result.warnings.push(...statusWarnings(ctx, result.playerIds, proj0));
  if (plan.timedOut) result.warnings.push("De optimalisatie raakte de tijdslimiet; het advies is goed maar mogelijk niet het absolute optimum.");
  return result;
}

function emptyRecommendation(roundId: string, variant: RiskProfile, captainMultiplier: number): Recommendation {
  return {
    engineVersion: ENGINE_VERSION,
    roundId,
    variant,
    feasible: false,
    playerIds: [],
    captainMultiplier,
    expectedPoints: 0,
    picks: [],
    saved: [],
    bestFixtures: [],
    bestByPosition: {},
    futurePlan: [],
    headline: "",
    warnings: [],
  };
}

function captainReasons(ctx: RecommendContext, p: PlayerProjection): string[] {
  const pl = ctx.idx.players.get(p.playerId)!;
  const opp = p.opponentId ? ctx.idx.clubs.get(p.opponentId) : undefined;
  const r: string[] = [];
  if (pl.roles.includes("penalty_1")) r.push("zijn strafschoppen");
  if (opp && /zwakke|middelmatige/.test(opponentLabel(opp))) r.push(`${opponentLabel(opp).replace("een ", "de ")} (${opp.shortName})`);
  if ((p.pGoal ?? 0) >= 0.25) r.push(`verwachte doelpuntkans (${pct(p.pGoal!)})`);
  if (p.isHome && r.length < 3) r.push("het thuisvoordeel");
  if (!r.length) r.push("de hoogste verwachte score in het team");
  return r.slice(0, 3);
}

function captainAdvice(ctx: RecommendContext, ids: string[], captainId: string | undefined, proj: Map<string, PlayerProjection>, m: number) {
  if (!captainId) return undefined;
  const cap = proj.get(captainId);
  if (!cap) return undefined;
  const name = ctx.idx.players.get(captainId)!.name;
  const alternatives = ids
    .filter((id) => id !== captainId)
    .map((id) => ({ playerId: id, pointsLess: Math.round((cap.ev - (proj.get(id)?.ev ?? 0)) * (m - 1) * 100) / 100 }))
    .sort((a, b) => a.pointsLess - b.pointsLess)
    .slice(0, 2);
  const statusNote = cap.status === "BASIS" ? "" : " Let op: zijn basisplaats is nog niet officieel bevestigd.";
  return {
    playerId: captainId,
    reason: `${name} is de beste captain (${m * 100}%) door ${joinNl(captainReasons(ctx, cap))}.${statusNote}`,
    alternatives,
  };
}

function saveAdvice(ctx: RecommendContext, plan: PlannedRound[], projections: Map<string, PlayerProjection>[], roundIds: string[]): SaveAdvice[] {
  if (!ctx.rules.usage.oncePerPhase || plan.length < 2) return [];
  const nowIds = new Set(plan[0].playerIds);
  const proj0 = projections[0];
  // Interessante spelers van nu: per positie de top 3 op score.
  const byPos = new Map<string, PlayerProjection[]>();
  for (const p of proj0.values()) {
    if (!p.available) continue;
    const pos = ctx.idx.players.get(p.playerId)!.position;
    (byPos.get(pos) ?? byPos.set(pos, []).get(pos)!).push(p);
  }
  const interesting = [...byPos.values()].flatMap((l) => l.sort((a, b) => b.score - a.score).slice(0, 3));
  const out: SaveAdvice[] = [];
  for (const p of interesting) {
    if (nowIds.has(p.playerId)) continue;
    const later = plan.findIndex((r, i) => i > 0 && r.playerIds.includes(p.playerId));
    if (later < 0) continue;
    const lp = projections[later].get(p.playerId)!;
    const pl = ctx.idx.players.get(p.playerId)!;
    const laterRound = ctx.idx.rounds.get(roundIds[later])!;
    const opp = lp.opponentId ? ctx.idx.clubs.get(lp.opponentId) : undefined;
    out.push({
      playerId: p.playerId,
      laterRoundId: roundIds[later],
      nowScore: p.score,
      laterScore: lp.score,
      reason: `Bewaar ${pl.name} voor ${laterRound.name}: dan ${lp.isHome ? "thuis" : "uit"} tegen ${opp ? `${opponentLabel(opp)} (${opp.name})` : "een gunstiger tegenstander"} (verwacht ${lp.ev.toFixed(1)} vs. ${p.ev.toFixed(1)} nu).`,
    });
  }
  return out.sort((a, b) => b.laterScore - a.laterScore);
}

/** Opportunity cost: de beste toekomstige ronde die je opgeeft door een speler nu te gebruiken. */
function lostFuture(ctx: RecommendContext, playerId: string, projections: Map<string, PlayerProjection>[], roundIds: string[]) {
  if (!ctx.rules.usage.oncePerPhase) return undefined;
  let best: { i: number; p: PlayerProjection } | undefined;
  for (let i = 1; i < projections.length; i++) {
    const p = projections[i].get(playerId);
    if (p?.available && (!best || p.ev > best.p.ev)) best = { i, p };
  }
  if (!best) return { roundId: "", ev: 0, text: "Geen latere inzetmogelijkheid in de resterende rondes." };
  const r = ctx.idx.rounds.get(roundIds[best.i])!;
  const opp = best.p.opponentId ? ctx.idx.clubs.get(best.p.opponentId) : undefined;
  return {
    roundId: r.id,
    ev: best.p.ev,
    text: `Je geeft op: ${r.shortName} ${best.p.isHome ? "thuis" : "uit"} tegen ${opp?.name ?? "?"} (verwacht ${best.p.ev.toFixed(1)}).`,
  };
}

/** Beste wedstrijden van de ronde: krachtsverschil, winstkans en waarde van de top-4 per club. */
function fixtureInsights(ctx: RecommendContext, roundId: string, proj: Map<string, PlayerProjection>): FixtureInsight[] {
  const { idx } = ctx;
  const out: FixtureInsight[] = [];
  for (const f of roundFixtures(idx, roundId, ctx.overrides)) {
    const h = idx.clubs.get(f.homeId)!;
    const a = idx.clubs.get(f.awayId)!;
    const pH = f.odds?.pHome ?? 0.45;
    const pA = f.odds?.pAway ?? 0.3;
    const fav = pH >= pA ? h : a;
    const pFav = Math.max(pH, pA);
    const topValue: Record<string, number> = {};
    for (const c of [h, a]) {
      const vals = [...proj.values()].filter((p) => p.available && idx.players.get(p.playerId)?.clubId === c.id).map((p) => p.score).sort((x, y) => y - x);
      topValue[c.id] = Math.round(vals.slice(0, ctx.rules.maxPerClub ?? 4).reduce((s, v) => s + v, 0) * 10) / 10;
    }
    const gap = Math.abs((f.odds?.xgHome ?? 1.3) - (f.odds?.xgAway ?? 1.1));
    out.push({
      fixtureId: f.id,
      favouriteId: fav.id,
      pFavourite: pFav,
      strengthGap: Math.round(gap * 100) / 100,
      topValue,
      text: `${h.shortName} – ${a.shortName}: ${fav.shortName} favoriet (${pct(pFav)} winstkans), krachtsverschil ${gap.toFixed(1)} verwachte doelpunten.`,
    });
  }
  return out.sort((x, y) => y.pFavourite * (1 + y.strengthGap) - x.pFavourite * (1 + x.strengthGap));
}

function statusWarnings(ctx: RecommendContext, ids: string[], proj: Map<string, PlayerProjection>): string[] {
  const w: string[] = [];
  const uncertain = ids.filter((id) => proj.get(id)?.status === "ONZEKER");
  if (uncertain.length)
    w.push(`${joinNl(uncertain.map((id) => ctx.idx.players.get(id)!.name))}: basisplaats onzeker. Controleer de opstelling vlak voor de deadline.`);
  return w;
}

function headline(ctx: RecommendContext, roundId: string, rec: Recommendation, proj: Map<string, PlayerProjection>): string {
  const round = ctx.idx.rounds.get(roundId)!;
  const deadline = new Date(round.deadline);
  const sameDay = deadline.toDateString() === ctx.now.toDateString();
  const when = sameDay ? (deadline.getUTCHours() >= 16 ? "Vanavond" : "Vandaag") : `Voor ${round.name}`;
  const clubCount = new Map<string, number>();
  for (const id of rec.playerIds) {
    const c = ctx.idx.players.get(id)!.clubId;
    if (c) clubCount.set(c, (clubCount.get(c) ?? 0) + 1);
  }
  const [topClub, n] = [...clubCount.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  const numbers = ["nul", "één", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht"];
  const parts: string[] = [];
  const total = rec.playerIds.length;
  if (n >= 3) {
    const club = ctx.idx.clubs.get(topClub)!;
    parts.push(`${when} adviseren we ${numbers[n] ?? n} ${club.shortName}-spelers.`);
    const clubIds = rec.playerIds.filter((id) => ctx.idx.players.get(id)!.clubId === topClub);
    const confirmed = clubIds.filter((id) => proj.get(id)?.status === "BASIS").length;
    if (confirmed === clubIds.length) parts.push(`Alle ${numbers[n] ?? n} hebben een bevestigde basisplaats.`);
    else if (confirmed > 0) parts.push(`${confirmed} van de ${n} hebben al een bevestigde basisplaats.`);
    else parts.push("De opstellingen zijn nog niet bekend; dit zijn verwachte basisspelers.");
  } else {
    const confirmed = rec.playerIds.filter((id) => proj.get(id)?.status === "BASIS").length;
    parts.push(`${when} adviseren we een gespreid team van ${total} spelers.`);
    parts.push(confirmed === total ? `Alle ${numbers[total] ?? total} hebben een bevestigde basisplaats.` : confirmed ? `${confirmed} van de ${total} zijn al officieel bevestigd.` : "De opstellingen zijn nog niet bekend.");
  }
  if (rec.captain) {
    const cap = proj.get(rec.captain.playerId)!;
    parts.push(`${ctx.idx.players.get(rec.captain.playerId)!.name} is de beste captain door ${joinNl(captainReasons(ctx, cap))}.`);
  }
  return parts.join(" ");
}
