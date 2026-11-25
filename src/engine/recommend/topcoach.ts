import { captainMultiplierFor, type RuleSet } from "../rules/schema";
import { validateTeam, type RuleViolation } from "../rules/validate";
import { evaluateSlots, formationOf, optimizeSquadLineup, type FormationOption, type SlotCandidate } from "../optimizer/squadLineup";
import { optimizeSquad, type SquadCandidate } from "../optimizer/budgetSquad";
import { joinNl, opponentLabel, pct } from "../scoring/explain";
import type { FootballStats, Player, PlayerProjection, Preferences } from "../types";
import { upcomingRounds, type DatasetIndex } from "./dataset";
import { projectRound, type RecommendContext } from "./football";

/**
 * TopCoach-advies voor één speelronde: ideale verdeling basis/bank/tribune over alle
 * toegestane formaties, captainvergelijking, risico's, Gouden Wissels en transferfase.
 */

export interface UserSquad {
  playerIds: string[];
  starters?: string[];
  bench?: string[];
  captainId?: string;
  /** Gebruikte Gouden Wissels per seizoenshelft (naam → aantal). */
  goldenSubsUsed?: Record<string, number>;
  /** Resterend budget (bank) in miljoenen. */
  bank?: number;
}

export type RiskLevel = "green" | "yellow" | "orange" | "red" | "grey";

export interface PlayerRisk {
  playerId: string;
  level: RiskLevel;
  reason: string;
  official: boolean;
}

export interface CaptainCandidate {
  playerId: string;
  /** Verwachte punten als captain (incl. multiplier). */
  captainPoints: number;
  extraPoints: number;
  pStart: number;
  expMinutes: number;
  pGoal: number;
  pAssist: number;
  pWin: number;
  penaltyTaker: boolean;
  opponent: string;
  rotationRisk: number;
  cardRisk: number;
  ceiling: number;
  reliability: number;
  label: string;
}

export interface GoldenSubCandidate {
  outId: string;
  inId: string;
  trigger: string;
  gainPerRound: number;
  expectedGain: number;
  cost: number;
  optionValue: number;
  net: number;
  paybackRounds: number;
  uncertainty: number;
}

export interface GoldenSubAdvice {
  half?: string;
  available: number;
  remainingRounds: number;
  candidates: GoldenSubCandidate[];
  advice: string;
}

export interface TopCoachAdvice {
  roundId: string;
  roundNumber?: number;
  deadline: string;
  deadlinePassed: boolean;
  phase?: { name: string; kind: "unlimited" | "locked" | "window" };
  captainMultiplier: number;
  isSuperWeekend: boolean;
  squadViolations: RuleViolation[];
  projections: Record<string, PlayerProjection | null>;
  current?: { formation: string; starters: string[]; bench: string[]; tribune: string[]; captainId?: string; expectedPoints: number };
  ideal?: FormationOption;
  formations: FormationOption[];
  changes: { playerId: string; from: Slot; to: Slot }[];
  captainChange?: { from?: string; to: string; gain: number };
  gain: number;
  captainCandidates: CaptainCandidate[];
  risks: PlayerRisk[];
  goldenSubs?: GoldenSubAdvice;
  transferAdvice?: { squadIds: string[]; transfersIn: string[]; transfersOut: string[]; cost: number; expectedPoints: number };
  headline: string;
}

export type Slot = "basis" | "bank" | "tribune";

const NOT_PLAYING = new Set(["injured", "suspended", "ill", "not_in_squad", "withdrawn"]);

function slotCandidates(idx: DatasetIndex, ids: string[], proj: Map<string, PlayerProjection>): SlotCandidate[] {
  return ids
    .map((id) => idx.players.get(id))
    .filter((p): p is Player => Boolean(p))
    .map((p) => {
      const pr = proj.get(p.id);
      const usable = pr && pr.available;
      return { playerId: p.id, position: p.position, score: usable ? pr.score : 0, ev: usable ? pr.ev : 0 };
    });
}

export function riskFor(player: Player, p: PlayerProjection | null | undefined): PlayerRisk {
  const official = p ? ["BASIS", "BANK", "AFWEZIG"].includes(p.status) : false;
  if (!p) return { playerId: player.id, level: "red", reason: "Geen wedstrijd deze speelronde", official: false };
  if (p.status === "AFWEZIG") {
    const why = player.availability.reasonKnown === false ? "reden onbekend" : player.availability.note ?? "niet in de selectie";
    return { playerId: player.id, level: "red", reason: `${official && !NOT_PLAYING.has(player.availability.status) ? "Officieel afwezig" : "Afwezig"} – ${why}`, official };
  }
  if (p.status === "BANK") return { playerId: player.id, level: "red", reason: "Officieel reserve", official: true };
  if (p.status === "BASIS") return { playerId: player.id, level: "green", reason: "Officieel basisspeler", official: true };
  if (p.status === "ONZEKER") return { playerId: player.id, level: "grey", reason: "Onvoldoende informatie over basisplaats", official: false };
  const ps = p.minutes?.pStart ?? p.startProb;
  const avail = player.availability.status;
  if (avail === "doubtful") return { playerId: player.id, level: "orange", reason: `Twijfelgeval${player.availability.note ? `: ${player.availability.note}` : ""}`, official: false };
  if (ps < 0.45) return { playerId: player.id, level: "orange", reason: `Waarschijnlijk reserve (basiskans ${pct(ps)})`, official: false };
  if (avail === "returning") return { playerId: player.id, level: "yellow", reason: `Terug van blessure, verwacht ${p.minutes?.expMinutes ?? "?"} min`, official: false };
  if (ps < 0.8) return { playerId: player.id, level: "yellow", reason: `Mogelijke basisplaats (${pct(ps)})`, official: false };
  return { playerId: player.id, level: "green", reason: `Verwachte basisplaats (${pct(ps)}), nog niet officieel`, official: false };
}

export function roundNumberOf(idx: DatasetIndex, roundId: string): number | undefined {
  return idx.rounds.get(roundId)?.matchday;
}

function phaseFor(rules: RuleSet, n?: number) {
  if (n === undefined) return undefined;
  return rules.transferPhases.find((p) => n >= p.fromRound && n <= p.toRound);
}

export interface TopCoachOptions {
  roundId: string;
  squad: UserSquad;
  /** Gouden Wissels doorrekenen (duurder). */
  includeGoldenSubs?: boolean;
  /** Bij proefperiode/transferperiode een volledige selectie-optimalisatie doen. */
  includeTransfers?: boolean;
}

export function adviseTopCoach(ctx: RecommendContext, opts: TopCoachOptions): TopCoachAdvice {
  const { idx, rules } = ctx;
  const round = idx.rounds.get(opts.roundId)!;
  const m = captainMultiplierFor(rules, round.id, round.captainMultiplier);
  const proj = projectRound(ctx, round.id);
  const squadIds = opts.squad.playerIds;
  const cands = slotCandidates(idx, squadIds, proj);
  const candMap = new Map(cands.map((c) => [c.playerId, c]));
  const { best, options } = optimizeSquadLineup({ rules, squad: cands, captainMultiplier: m });

  const projections: Record<string, PlayerProjection | null> = {};
  for (const id of squadIds) projections[id] = proj.get(id) ?? null;

  // Huidige opstelling van de gebruiker (indien ingevoerd).
  let current: TopCoachAdvice["current"];
  if (opts.squad.starters?.length) {
    const starters = opts.squad.starters;
    const bench = opts.squad.bench ?? [];
    current = {
      formation: formationOf(starters, (id) => idx.players.get(id)?.position),
      starters,
      bench,
      tribune: squadIds.filter((id) => !starters.includes(id) && !bench.includes(id)),
      captainId: opts.squad.captainId,
      expectedPoints: evaluateSlots(rules, candMap, { starters, bench, captainId: opts.squad.captainId }, m),
    };
  }

  const slotOf = (id: string, s: { starters: string[]; bench: string[] }): Slot => (s.starters.includes(id) ? "basis" : s.bench.includes(id) ? "bank" : "tribune");
  const changes =
    current && best
      ? squadIds.map((id) => ({ playerId: id, from: slotOf(id, current!), to: slotOf(id, best) })).filter((c) => c.from !== c.to)
      : [];
  const captainChange =
    best?.captainId && current && current.captainId !== best.captainId
      ? {
          from: current.captainId,
          to: best.captainId,
          gain: Math.round((m - 1) * ((candMap.get(best.captainId)?.ev ?? 0) - (current.captainId ? candMap.get(current.captainId)?.ev ?? 0 : 0))),
        }
      : undefined;

  const captainCandidates = captainAnalysis(ctx, squadIds, proj, m);
  const risks = squadIds.map((id) => riskFor(idx.players.get(id)!, proj.get(id) ?? null)).filter(Boolean);

  const squadViolations = validateTeam({ rules, players: idx.players, playerIds: squadIds, scope: "squad", budgetOverride: rules.budget ?? undefined }).filter(
    (v) => v.code !== "unavailable",
  );

  const n = round.matchday;
  const phase = phaseFor(rules, n);
  const advice: TopCoachAdvice = {
    roundId: round.id,
    roundNumber: n,
    deadline: round.deadline,
    deadlinePassed: new Date(round.deadline) <= ctx.now,
    phase,
    captainMultiplier: m,
    isSuperWeekend: m >= 3,
    squadViolations,
    projections,
    current,
    ideal: best,
    formations: options,
    changes,
    captainChange,
    gain: best && current ? best.expectedPoints - current.expectedPoints : 0,
    captainCandidates,
    risks,
    headline: "",
  };
  if (opts.includeGoldenSubs && phase?.kind === "locked") advice.goldenSubs = analyseGoldenSubs(ctx, opts.squad, round.id);
  if (opts.includeTransfers && phase && phase.kind !== "locked") advice.transferAdvice = bestSquad(ctx, round.id, opts.squad);
  advice.headline = headline(ctx, advice);
  return advice;
}

function captainAnalysis(ctx: RecommendContext, ids: string[], proj: Map<string, PlayerProjection>, m: number): CaptainCandidate[] {
  const list = ids
    .map((id) => proj.get(id))
    .filter((p): p is PlayerProjection => Boolean(p && p.available))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  return list.map((p, i) => {
    const pl = ctx.idx.players.get(p.playerId)!;
    const st = pl.stats as FootballStats;
    const opp = p.opponentId ? ctx.idx.clubs.get(p.opponentId) : undefined;
    const reliability = p.confidence ?? 0.5;
    const highCeiling = (p.ceiling ?? 0) > (list[0].ceiling ?? 0) && i > 0;
    const label =
      i === 0 ? (reliability >= 0.6 ? "Gebalanceerde keuze" : "Hoogste verwachting, wel onzeker") : highCeiling ? "Hoog plafond, meer risico" : reliability > (list[0].confidence ?? 0) ? "Veiliger alternatief" : "Alternatief";
    return {
      playerId: p.playerId,
      captainPoints: Math.round(p.ev * m),
      extraPoints: Math.round(p.ev * (m - 1)),
      pStart: p.minutes?.pStart ?? p.startProb,
      expMinutes: p.minutes?.expMinutes ?? 0,
      pGoal: p.pGoal ?? 0,
      pAssist: p.pAssist ?? 0,
      pWin: p.pWin ?? 0,
      penaltyTaker: pl.roles.includes("penalty_1"),
      opponent: opp ? `${p.isHome ? "thuis" : "uit"} vs ${opp.name} (${opponentLabel(opp).replace("een ", "")})` : "",
      rotationRisk: st.rotationRisk,
      cardRisk: pl.position === "DEF" || pl.position === "MID" ? 0.17 : 0.09,
      ceiling: Math.round((p.ceiling ?? 0) * m),
      reliability,
      label,
    };
  });
}

/**
 * Gouden Wissel-analyse. Alleen spelers met een duidelijke aanleiding worden kandidaat.
 * Netto voordeel = verwachte extra punten binnen de geoptimaliseerde selectie (rest van de helft)
 *                − bonus ongebruikte wissel (250) − optiewaarde van het bewaren.
 */
export function analyseGoldenSubs(ctx: RecommendContext, squad: UserSquad, roundId: string): GoldenSubAdvice {
  const { idx, rules } = ctx;
  const gs = rules.goldenSubs;
  const n = roundNumberOf(idx, roundId);
  if (!gs || n === undefined) return { available: 0, remainingRounds: 0, candidates: [], advice: "Gouden Wissels zijn niet ingesteld voor dit spel." };
  const half = gs.halves.find((h) => n >= h.fromRound && n <= h.toRound);
  if (!half) return { available: 0, remainingRounds: 0, candidates: [], advice: "Geen Gouden Wissels in deze fase." };
  const used = squad.goldenSubsUsed?.[half.name] ?? 0;
  const available = Math.max(0, gs.perHalf - used);
  const remainingRounds = half.toRound - n + 1;
  if (!available) return { half: half.name, available, remainingRounds, candidates: [], advice: "Je Gouden Wissels voor deze helft zijn op." };

  const roundIds = upcomingRounds(idx, roundId, Math.min(4, remainingRounds));
  const projs = roundIds.map((id) => projectRound(ctx, id));
  const ms = roundIds.map((id) => captainMultiplierFor(rules, id, idx.rounds.get(id)?.captainMultiplier));
  const valueOf = (ids: string[]) =>
    roundIds.reduce((s, _, r) => s + (optimizeSquadLineup({ rules, squad: slotCandidates(idx, ids, projs[r]), captainMultiplier: ms[r] }).best?.expectedPoints ?? 0), 0);
  const base = valueOf(squad.playerIds);

  // Aanleidingen detecteren.
  const triggers: { id: string; trigger: string; longTerm: boolean }[] = [];
  for (const id of squad.playerIds) {
    const pl = idx.players.get(id);
    if (!pl) continue;
    const a = pl.availability;
    const avgStart = projs.reduce((s, m) => s + (m.get(id)?.minutes?.pStart ?? 0), 0) / projs.length;
    if (["injured", "suspended", "ill", "withdrawn"].includes(a.status)) {
      const longTerm = !a.expectedReturn || roundsUntil(idx, roundId, a.expectedReturn) >= 3;
      triggers.push({ id, trigger: `${a.status === "suspended" ? "Geschorst" : a.status === "withdrawn" ? "Vertrokken/afgemeld" : "Geblesseerd"}${a.note ? `: ${a.note}` : ""}${a.expectedReturn ? ` (terug ± ${a.expectedReturn})` : " (terugkeer onbekend)"}`, longTerm });
    } else if (!pl.clubId) {
      triggers.push({ id, trigger: "Speelt niet meer in deze competitie", longTerm: true });
    } else if (avgStart < 0.35) {
      triggers.push({ id, trigger: `Basisplaats structureel kwijt (gem. basiskans ${pct(avgStart)})`, longTerm: true });
    }
  }

  const candidates: GoldenSubCandidate[] = [];
  const bank = squad.bank ?? 0;
  for (const t of triggers) {
    const out = idx.players.get(t.id)!;
    const others = squad.playerIds.filter((id) => id !== t.id);
    const clubCount = new Map<string, number>();
    for (const id of others) {
      const c = idx.players.get(id)?.clubId;
      if (c) clubCount.set(c, (clubCount.get(c) ?? 0) + 1);
    }
    // Snelle voorselectie: zelfde positie, binnen budget, clubmaximum, beste xSP over de horizon.
    const pool = idx.ds.players
      .filter(
        (p) =>
          p.position === out.position &&
          !squad.playerIds.includes(p.id) &&
          p.price <= out.price + bank + 1e-9 &&
          (rules.maxPerClub === null || !p.clubId || (clubCount.get(p.clubId) ?? 0) < rules.maxPerClub),
      )
      .map((p) => ({ p, v: projs.reduce((s, m) => s + (m.get(p.id)?.available ? m.get(p.id)!.score : 0), 0) }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 4);
    let bestIn: { id: string; value: number } | undefined;
    for (const { p } of pool) {
      const v = valueOf([...others, p.id]);
      if (!bestIn || v > bestIn.value) bestIn = { id: p.id, value: v };
    }
    if (!bestIn) continue;
    const gainPerRound = (bestIn.value - base) / roundIds.length;
    // Extrapolatie naar de rest van de helft; kortdurende aanleidingen tellen minder zwaar.
    const expectedGain = gainPerRound * remainingRounds * (t.longTerm ? 0.85 : 0.4);
    const optionValue = Math.min(150, remainingRounds * 8) * (available === 1 ? 1.5 : 1);
    const cost = gs.unusedBonus;
    candidates.push({
      outId: t.id,
      inId: bestIn.id,
      trigger: t.trigger,
      gainPerRound: Math.round(gainPerRound),
      expectedGain: Math.round(expectedGain),
      cost,
      optionValue: Math.round(optionValue),
      net: Math.round(expectedGain - cost - optionValue),
      paybackRounds: gainPerRound > 0 ? Math.ceil(cost / gainPerRound) : Infinity,
      uncertainty: Math.round(Math.abs(expectedGain) * 0.35 + 40),
    });
  }
  candidates.sort((a, b) => b.net - a.net);
  const top = candidates[0];
  const name = (id: string) => idx.players.get(id)?.name ?? id;
  const advice = !candidates.length
    ? "Geen Gouden Wissel nodig: er is geen speler met een duidelijke aanleiding (langdurige blessure, verloren basisplaats of vertrek)."
    : top.net > 0
      ? `Overweeg een Gouden Wissel: ${name(top.outId)} → ${name(top.inId)}. Verwacht netto +${top.net} punten (± ${top.uncertainty}) na aftrek van de ${top.cost} bonuspunten. Jij beslist.`
      : `Nog geen Gouden Wissel: de beste optie (${name(top.outId)} → ${name(top.inId)}) levert netto ${top.net} punten op. Bewaren is nu verstandiger.`;
  return { half: half.name, available, remainingRounds, candidates, advice };
}

function roundsUntil(idx: DatasetIndex, fromRoundId: string, isoDate: string): number {
  const from = idx.rounds.get(fromRoundId);
  if (!from) return 99;
  return idx.ds.rounds.filter((r) => r.deadline >= from.deadline && r.deadline < isoDate).length;
}

/** Beste selectie vanaf nul (proefperiode of transferperiode). */
function bestSquad(ctx: RecommendContext, roundId: string, squad: UserSquad) {
  const { idx, rules } = ctx;
  const roundIds = upcomingRounds(idx, roundId, Math.min(rules.horizon, 3));
  const projs = roundIds.map((id) => projectRound(ctx, id));
  const cands: SquadCandidate[] = idx.ds.players
    .filter((p) => p.position !== "DARTER")
    .map((p) => ({
      playerId: p.id,
      position: p.position,
      clubId: p.clubId,
      price: p.price,
      scores: projs.map((m) => (m.get(p.id)?.available ? m.get(p.id)!.score : undefined)),
      evs: projs.map((m) => m.get(p.id)?.ev),
    }));
  const res = optimizeSquad({
    rules: { ...rules, transfers: { ...rules.transfers, maxPerRound: null } },
    candidates: cands,
    roundIds,
    weights: roundIds.map((_, i) => Math.pow(1 - ctx.prefs.futureDiscount, i)),
    captainMultipliers: roundIds.map((id) => captainMultiplierFor(rules, id, idx.rounds.get(id)?.captainMultiplier)),
    currentSquadIds: squad.playerIds,
    poolFactor: 2,
    timeoutMs: 8000,
  });
  return { squadIds: res.squadIds, transfersIn: res.transfersIn, transfersOut: res.transfersOut, cost: res.cost, expectedPoints: Math.round(res.lineups[0]?.expectedPoints ?? 0) };
}

function headline(ctx: RecommendContext, a: TopCoachAdvice): string {
  const name = (id: string) => ctx.idx.players.get(id)?.name ?? id;
  const parts: string[] = [];
  if (a.deadlinePassed) parts.push("De deadline is verstreken: wijzigingen voor deze ronde zijn niet meer mogelijk.");
  const red = a.risks.filter((r) => r.level === "red" && a.ideal?.starters.includes(r.playerId));
  if (!a.ideal) return "Er is geen geldige opstelling mogelijk met deze selectie. Controleer de selectie.";
  if (a.current) {
    const moves = a.changes.length + (a.captainChange ? 1 : 0);
    if (!moves) parts.push(`Je opstelling staat optimaal (${a.current.formation}, ${a.current.expectedPoints} xSP).`);
    else
      parts.push(
        `${moves} wijziging${moves > 1 ? "en" : ""} leveren naar verwachting +${Math.max(a.gain, 0)} xSP op (${a.current.formation} → ${a.ideal.formation}).`,
      );
  } else parts.push(`Beste opstelling: ${a.ideal.formation} met ${a.ideal.expectedPoints} xSP.`);
  const cap = a.ideal.captainId;
  if (cap) {
    if (a.captainChange) parts.push(`Maak ${name(cap)} captain${a.isSuperWeekend ? " (Super Weekend: 300%)" : ""}.`);
    else parts.push(`Captain ${name(cap)} ${a.current ? "behouden" : "geadviseerd"}${a.isSuperWeekend ? " (Super Weekend: 300%)" : ""}.`);
  }
  const orange = a.risks.filter((r) => (r.level === "orange" || r.level === "yellow") && a.ideal!.starters.includes(r.playerId));
  if (red.length) parts.push(`${joinNl(red.map((r) => name(r.playerId)))} speelt niet.`);
  if (orange.length) parts.push(`${orange.length} risicospeler${orange.length > 1 ? "s" : ""} in je basis.`);
  return parts.join(" ");
}

export type { Preferences };
