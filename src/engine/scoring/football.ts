import { pv, type FootballScoring } from "../rules/schema";
import type {
  Club,
  ConfirmedStatus,
  Fixture,
  FootballPosition,
  FootballStats,
  LineupStatus,
  MinutesProjection,
  Player,
  PlayerProjection,
  PredictedLineupEntry,
  Preferences,
  ScoreFactor,
} from "../types";
import { clamp, matchOutcome, poissonPmf } from "./poisson";
import { describeFootball } from "./explain";

/**
 * Voorspelling van verwachte fantasypunten (bij TopCoach: xSP, Expected Scorito Points).
 *
 * Drie aparte variabelen (les uit de praktijk):
 *   1. Beschikbaarheid  – is de speler fit/beschikbaar?          → pAvailable
 *   2. Basisplaats      – start hij, valt hij in, of speelt niet?  → pStart, pSub, pNone
 *   3. Speelminuten     – hoeveel minuten bij start/invalbeurt?    → expMinutes, pThreshold
 *
 * Per scenario (start / invalbeurt) berekenen we de verwachte punten analytisch:
 *   doelpunten ~ Poisson(xG90 · teamfactor · minuten/90),  assists idem,
 *   clean sheet = P(tegenstander scoort 0) · P(minuten ≥ grens),
 *   resultaat   = P(winst)·winst + P(gelijk)·gelijk,
 *   tegendoelpunten = λ_tegen · minuten/90 · aftrek.
 * Een Monte-Carlosimulatie (vaste seed) levert daarnaast de spreiding: veilige ondergrens (P10)
 * en potentiële topscore (P90). Gebeurtenissen hangen samen: wie niet speelt kan niet scoren,
 * en clean sheet/winst volgen uit dezelfde gesimuleerde wedstrijduitslag.
 */

export const LEAGUE_AVG_GOALS = 1.35;

export interface FootballContext {
  player: Player;
  club: Club;
  opponent: Club;
  fixture: Fixture;
  roundId: string;
  scoring: FootballScoring;
  prefs: Preferences;
  predicted?: PredictedLineupEntry;
  confirmed?: ConfirmedStatus;
  lineupPublished: boolean;
  isMatchOfTheRound?: boolean;
  matchOfTheRoundMultiplier?: number;
  ruleExclusion?: string;
  /** Verhoogd rotatierisico (uitleg), bijv. "club is al geplaatst". Wordt via `predicted` verwerkt. */
  rotationRisk?: string;
  /** Aantal simulaties voor de spreiding (0 = uit). */
  simulations?: number;
}

const RISK_LAMBDA = { safe: 0.35, balanced: 0.1, aggressive: -0.2 } as const;

export const prefMultiplier = (w: number, strength = 0.3) => 1 + (w - 1) * strength;

export function teamExpectedGoals(fixture: Fixture, club: Club, opponent: Club, isHome: boolean) {
  if (fixture.odds) {
    return isHome ? { team: fixture.odds.xgHome, opp: fixture.odds.xgAway } : { team: fixture.odds.xgAway, opp: fixture.odds.xgHome };
  }
  const homeAdv = isHome ? 1.1 : 0.9;
  return {
    team: LEAGUE_AVG_GOALS * club.attack * opponent.defense * homeAdv,
    opp: LEAGUE_AVG_GOALS * opponent.attack * club.defense * (2 - homeAdv),
  };
}

const AVAILABLE_P: Record<string, number> = {
  fit: 1,
  doubtful: 0.6,
  returning: 0.85,
  unknown: 0.85,
  injured: 0,
  suspended: 0,
  ill: 0,
  not_in_squad: 0,
  withdrawn: 0,
};

/** Beschikbaarheid, basisplaats en minuten. Nooit "zeker" zonder officiële opstelling. */
export function minutesModel(
  ctx: Pick<FootballContext, "player" | "predicted" | "confirmed" | "lineupPublished">,
  threshold: number,
): { m: MinutesProjection; status: LineupStatus; startMinutes: number; subMinutes: number } {
  const { player, predicted, confirmed, lineupPublished } = ctx;
  const stats = player.stats as FootballStats;
  // Terugkerende spelers worden vaak rustig opgebouwd: minder minuten bij een basisplaats.
  const buildUp = player.availability.status === "returning" && player.availability.recovery !== "match_fit" ? 0.8 : 1;
  const startMinutes = clamp((predicted?.expMinutes ?? Math.max(stats.minutesAvg, 70)) * buildUp, 45, 90);
  const subMinutes = 20;
  const pFullGivenStart = clamp((startMinutes - 60) / 30, 0, 1) * 0.85;
  const pThrStart = startMinutes >= threshold + 15 ? 0.95 : 0.8;
  const pThrSub = threshold <= 30 ? 0.3 : 0.03;

  const build = (pAvailable: number, pStart: number, pSub: number, status: LineupStatus) => {
    const pNone = clamp(1 - pStart - pSub, 0, 1);
    return {
      m: {
        pAvailable,
        pStart,
        pSub,
        pNone,
        expMinutes: pStart * startMinutes + pSub * subMinutes,
        pThreshold: pStart * pThrStart + pSub * pThrSub,
        pFull: pStart * pFullGivenStart,
      },
      status,
      startMinutes,
      subMinutes,
    };
  };

  if (lineupPublished) {
    if (confirmed === "starting") return build(1, 1, 0, "BASIS");
    if (confirmed === "bench") return build(1, 0, 0.45, "BANK");
    return build(0, 0, 0, "AFWEZIG");
  }
  const pAvailable = AVAILABLE_P[player.availability.status] ?? 0.85;
  if (pAvailable === 0) return build(0, 0, 0, "AFWEZIG");
  const known = predicted !== undefined;
  const base = predicted?.startProb ?? clamp((stats.startsLast5 / 5) * (1 - stats.rotationRisk * 0.5), 0, 0.95);
  const pStart = clamp(base * pAvailable, 0, 0.95);
  const pSub = clamp((pAvailable - pStart) * 0.55, 0, 1 - pStart);
  const status: LineupStatus = !known && player.availability.status === "unknown"
    ? "ONZEKER"
    : pStart >= 0.75
      ? "VERWACHTE_BASIS"
      : pStart >= 0.45
        ? "MOGELIJKE_BASIS"
        : pStart > 0
          ? "VERWACHTE_RESERVE"
          : "ONZEKER";
  return build(pAvailable, pStart, pSub, status);
}

interface ScenarioInput {
  pos: FootballPosition;
  scoring: FootballScoring;
  xg90: number;
  xa90: number;
  teamFactor: number;
  lt: number;
  lo: number;
  pWin: number;
  pDraw: number;
  pCs: number;
}

/** Verwachte punten in één scenario (start of invalbeurt) met `minutes` speeltijd. */
function scenarioPoints(s: ScenarioInput, minutes: number, pThr: number) {
  const f = minutes / 90;
  const xg = s.xg90 * s.teamFactor * f;
  const xa = s.xa90 * s.teamFactor * f;
  const goal = xg * s.scoring.goal[s.pos];
  const assist = xa * pv(s.scoring.assist, s.pos);
  const cs = s.pCs * s.scoring.cleanSheet[s.pos] * pThr;
  const conceded = s.scoring.goalConceded ? -s.lo * f * s.scoring.goalConceded[s.pos] : 0;
  const result = s.pWin * pv(s.scoring.win, s.pos) + s.pDraw * pv(s.scoring.draw, s.pos);
  const minutesPts = pv(s.scoring.appearance, s.pos) + pThr * pv(s.scoring.minutesPoints, s.pos);
  const pHat = 1 - poissonPmf(0, xg) - poissonPmf(1, xg) - poissonPmf(2, xg);
  const hattrick = pHat * s.scoring.hattrickBonus;
  const cards = (s.pos === "DEF" || s.pos === "MID" ? 0.17 : 0.09) * f * s.scoring.yellow;
  const penSave = s.pos === "GK" ? 0.025 * pv(s.scoring.penaltySaved, s.pos) : 0;
  return { xg, xa, goal, assist, cs, conceded, result, minutesPts, hattrick, cards, penSave };
}

export function projectFootball(ctx: FootballContext): PlayerProjection {
  const { player, club, opponent, fixture, scoring, prefs } = ctx;
  const pos = player.position as FootballPosition;
  const stats = player.stats as FootballStats;
  const isHome = fixture.homeId === club.id;
  const { team: lt, opp: lo } = teamExpectedGoals(fixture, club, opponent, isHome);
  const teamFactor = lt / LEAGUE_AVG_GOALS;
  const o = fixture.odds
    ? { pWin: isHome ? fixture.odds.pHome : fixture.odds.pAway, pDraw: fixture.odds.pDraw }
    : (() => {
        const r = matchOutcome(isHome ? lt : lo, isHome ? lo : lt);
        return { pWin: isHome ? r.pHome : r.pAway, pDraw: r.pDraw };
      })();
  const pCs = Math.exp(-lo);
  const threshold = scoring.minutesThreshold;
  const mm = minutesModel(ctx, threshold);
  const { m, status } = mm;

  // Vorm, strafschoppen en spelhervattingen verhogen de aanvallende verwachting per 90 minuten.
  const formAdj = 0.9 + 0.02 * clamp(stats.form, 0, 10);
  let penaltyXg90 = 0;
  if (player.roles.includes("penalty_1")) penaltyXg90 = 0.1 * 0.78;
  else if (player.roles.includes("penalty_2")) penaltyXg90 = 0.012;
  const fkXg90 = player.roles.includes("freekick") ? 0.025 : 0;
  const spXa90 = (player.roles.includes("freekick") ? 0.03 : 0) + (player.roles.includes("corner") ? 0.05 : 0);
  const sIn: ScenarioInput = {
    pos,
    scoring,
    xg90: stats.xgPer90 * formAdj + penaltyXg90 + fkXg90,
    xa90: stats.xaPer90 * formAdj + spXa90,
    teamFactor,
    lt,
    lo,
    pWin: o.pWin,
    pDraw: o.pDraw,
    pCs,
  };
  const startThr = m.pStart > 0 ? (m.pThreshold - m.pSub * (threshold <= 30 ? 0.3 : 0.03)) / m.pStart : 0.95;
  const st = scenarioPoints(sIn, mm.startMinutes, clamp(startThr, 0, 1));
  const sb = scenarioPoints(sIn, mm.subMinutes, threshold <= 30 ? 0.3 : 0.03);
  const sum = (x: ReturnType<typeof scenarioPoints>) => x.goal + x.assist + x.cs + x.conceded + x.result + x.minutesPts + x.hattrick + x.cards + x.penSave;
  const motrMult = ctx.isMatchOfTheRound ? ctx.matchOfTheRoundMultiplier ?? 1 : 1;
  const ev = (m.pStart * sum(st) + m.pSub * sum(sb)) * motrMult;
  const w = (k: keyof ReturnType<typeof scenarioPoints>) => m.pStart * st[k] + m.pSub * sb[k];

  // ── Spreiding via simulatie ──
  const sims = ctx.simulations ?? 400;
  const { sd, floor, ceiling } = sims > 0 ? simulate(sIn, mm, threshold, sims, `${player.id}|${fixture.id}`, motrMult) : { sd: Math.sqrt(Math.max(ev, 0)) * 2, floor: 0, ceiling: ev * 2 };

  const factors: ScoreFactor[] = [
    { key: "goal", label: "Doelpuntkans", value: w("goal") + w("hattrick"), kind: "points" },
    { key: "assist", label: "Assistkans", value: w("assist"), kind: "points" },
    { key: "cleansheet", label: "Kans op de nul", value: w("cs") + w("conceded"), kind: "points" },
    { key: "result", label: "Winst/gelijkspel", value: w("result"), kind: "points" },
    { key: "minutes", label: "Speeltijd", value: w("minutesPts") + w("cards") + w("penSave"), kind: "points" },
  ];
  if (penaltyXg90 > 0)
    factors.push({ key: "penalty", label: "Strafschoppen", value: m.pStart * penaltyXg90 * teamFactor * (mm.startMinutes / 90) * scoring.goal[pos], kind: "points" });
  if (fkXg90 + spXa90 > 0)
    factors.push({
      key: "setpieces",
      label: "Spelhervattingen",
      value: m.pStart * teamFactor * (mm.startMinutes / 90) * (fkXg90 * scoring.goal[pos] + spXa90 * pv(scoring.assist, pos)),
      kind: "points",
    });
  if (motrMult !== 1) factors.push({ key: "motr", label: "Wedstrijd van de ronde", value: motrMult, kind: "multiplier" });

  // ── Voorkeuren → aanbevelingsscore ──
  let mult = 1;
  const addMult = (key: string, label: string, mu: number) => {
    if (Math.abs(mu - 1) < 1e-6) return;
    mult *= mu;
    factors.push({ key, label, value: mu, kind: "multiplier" });
  };
  if (pos === "DEF" && (player.roles.includes("attacking_fullback") || player.roles.includes("wingback")))
    addMult("pref_fullback", "Voorkeur: aanvallende back", prefMultiplier(prefs.attackingFullbacks, 0.15));
  if (pos === "MID" && (player.roles.includes("attacking_mid") || stats.xgPer90 + stats.xaPer90 >= 0.4))
    addMult("pref_mid", "Voorkeur: scorende middenvelder", prefMultiplier(prefs.scoringMidfielders, 0.15));
  if (pos === "FWD" && player.roles.includes("striker")) addMult("pref_striker", "Voorkeur: echte spits", prefMultiplier(prefs.trueStrikers, 0.15));
  if (player.roles.includes("penalty_1")) addMult("pref_pen", "Voorkeur: strafschopnemer", prefMultiplier(prefs.penaltyBonus, 0.1));
  if (player.roles.includes("freekick") || player.roles.includes("corner"))
    addMult("pref_setpiece", "Voorkeur: spelhervattingen", prefMultiplier(prefs.setPieceBonus, 0.08));
  if (pos === "DEF" && !player.roles.includes("attacking_fullback") && !player.roles.includes("wingback") && prefs.attackingFullbacks > 1)
    addMult("pref_def_plain", "Verdediger zonder aanvallende bijdrage", 1 / prefMultiplier(prefs.attackingFullbacks, 0.08));
  if (m.pStart >= 0.85) addMult("pref_nailed", "Voorkeur: zekere basisplaats", prefMultiplier(prefs.nailedBonus, 0.1));
  if (m.pFull >= 0.6) addMult("pref_full", "Grote kans op 90 minuten", prefMultiplier(prefs.nailedBonus, 0.04));
  if (ctx.rotationRisk) addMult("rotation", ctx.rotationRisk, 0.97);
  if (prefs.favoritePlayerIds.includes(player.id)) addMult("favorite", "Favoriet", 1.03);

  const lambda: number = RISK_LAMBDA[prefs.riskProfile];
  let score = ev * mult - lambda * sd;
  if (prefs.riskProfile === "safe" && status !== "BASIS") score *= Math.sqrt(Math.max(m.pStart, 0.01)) * 0.5 + 0.5;
  if (lambda !== 0) factors.push({ key: "risk", label: `Risicoprofiel (${riskLabel(prefs.riskProfile)})`, value: -lambda * sd, kind: "points" });

  let available = true;
  let unavailableReason: string | undefined;
  if (ctx.ruleExclusion) {
    available = false;
    unavailableReason = ctx.ruleExclusion;
  } else if (prefs.blockedPlayerIds.includes(player.id)) {
    available = false;
    unavailableReason = "Handmatig geblokkeerd";
  } else if (status === "AFWEZIG" || status === "BANK") {
    available = false;
    unavailableReason =
      status === "BANK"
        ? "Officieel reserve"
        : player.availability.reasonKnown === false
          ? "Niet in de wedstrijdselectie – reden onbekend"
          : player.availability.note ?? "Niet in de wedstrijdselectie";
  } else if (prefs.onlyConfirmedStarters && status !== "BASIS") {
    available = false;
    unavailableReason = "Nog niet officieel bevestigd (alleen bevestigde basisspelers)";
  }

  const confidence = status === "BASIS" ? 0.9 : status === "AFWEZIG" ? 0.95 : clamp(0.35 + 0.5 * Math.abs(m.pStart - 0.5) * 2 * m.pAvailable, 0.2, 0.8);
  const projection: PlayerProjection = {
    playerId: player.id,
    roundId: ctx.roundId,
    fixtureId: fixture.id,
    opponentId: opponent.id,
    isHome,
    ev: r2(ev),
    sd: r2(sd),
    score: r2(Math.max(score, 0)),
    startProb: m.pStart,
    status,
    pGoal: m.pStart * (1 - Math.exp(-st.xg)) + m.pSub * (1 - Math.exp(-sb.xg)),
    pAssist: m.pStart * (1 - Math.exp(-st.xa)) + m.pSub * (1 - Math.exp(-sb.xa)),
    pCleanSheet: pCs,
    pWin: o.pWin,
    xGoals: r2(m.pStart * st.xg + m.pSub * sb.xg),
    xAssists: r2(m.pStart * st.xa + m.pSub * sb.xa),
    minutes: { ...m, expMinutes: Math.round(m.expMinutes) },
    floor: r2(floor),
    ceiling: r2(ceiling),
    confidence,
    factors: factors.map((f) => ({ ...f, value: f.kind === "multiplier" ? Math.round(f.value * 1000) / 1000 : r2(f.value) })),
    summary: "",
    available,
    unavailableReason,
  };
  projection.summary = describeFootball(player, opponent, projection);
  return projection;
}

export const riskLabel = (r: Preferences["riskProfile"]) => (r === "safe" ? "veilig" : r === "aggressive" ? "aanvallend" : "gebalanceerd");

/** Deterministische generator (mulberry32) voor reproduceerbare simulaties. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(l: number, r: () => number) {
  const L = Math.exp(-l);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= r();
  } while (p > L && k < 20);
  return k - 1;
}

/**
 * Simuleert wedstrijden: rol (start/inval/niet), minuten, uitslag, en welk deel van de
 * teamdoelpunten de speler maakt of voorgeeft. Geeft spreiding, P10 en P90.
 */
function simulate(s: ScenarioInput, mm: ReturnType<typeof minutesModel>, threshold: number, n: number, seed: string, mult: number) {
  const r = seeded(seed);
  const { m } = mm;
  const shareG = clamp((s.xg90 * s.teamFactor) / Math.max(s.lt, 0.05), 0, 0.8);
  const shareA = clamp((s.xa90 * s.teamFactor) / Math.max(s.lt, 0.05), 0, 0.8);
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = r();
    const minutes = u < m.pStart ? clamp(mm.startMinutes + (r() - 0.5) * 30, 30, 90) : u < m.pStart + m.pSub ? 5 + r() * 30 : 0;
    if (minutes === 0) {
      pts.push(0);
      continue;
    }
    const tg = poisson(s.lt, r);
    const og = poisson(s.lo, r);
    const f = minutes / 90;
    let goals = 0;
    let assists = 0;
    for (let g = 0; g < tg; g++) {
      if (r() < shareG * f) goals++;
      else if (r() < shareA * f) assists++;
    }
    let p = pv(s.scoring.appearance, s.pos);
    if (minutes >= threshold) p += pv(s.scoring.minutesPoints, s.pos);
    p += goals * s.scoring.goal[s.pos] + assists * pv(s.scoring.assist, s.pos);
    if (goals >= 3) p += s.scoring.hattrickBonus;
    if (og === 0 && minutes >= threshold) p += s.scoring.cleanSheet[s.pos];
    if (s.scoring.goalConceded) p -= og * f * s.scoring.goalConceded[s.pos];
    if (tg > og) p += pv(s.scoring.win, s.pos);
    else if (tg === og) p += pv(s.scoring.draw, s.pos);
    if (r() < (s.pos === "DEF" || s.pos === "MID" ? 0.17 : 0.09) * f) p += s.scoring.yellow;
    pts.push(p * mult);
  }
  pts.sort((a, b) => a - b);
  const mean = pts.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(pts.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return { sd, floor: pts[Math.floor(n * 0.1)], ceiling: pts[Math.floor(n * 0.9)] };
}

const r2 = (x: number) => Math.round(x * 100) / 100;
