import type { RuleSet } from "../rules/schema";
import type { Position } from "../types";
import { isOn, solveIlp, type IlpModel } from "./ilp";

/**
 * Lineup-optimalisatie met integer linear programming.
 *
 * Model per ronde r (binaire variabelen):
 *   x[p,r] = 1  als speler p in ronde r wordt opgesteld
 *   c[p,r] = 1  als speler p in ronde r captain is
 *
 * Doel:  max  Σ_r w_r · Σ_p ( score[p,r]·x[p,r] + (m_r − 1)·score[p,r]·c[p,r] )
 *   w_r  = onzekerheidsweging van toekomstige rondes (1 voor de huidige ronde)
 *   m_r  = captainmultiplier van ronde r (bijv. 2 of 3)
 *
 * Constraints per ronde:
 *   Σ_p x[p,r] = lineupSize
 *   min_pos ≤ Σ_{p∈pos} x[p,r] ≤ max_pos          (formatie)
 *   Σ_{p∈club} x[p,r] ≤ maxPerClub                 (clubmaximum)
 *   Σ_p price_p·x[p,r] ≤ budget                    (indien budget)
 *   Σ_p c[p,r] = 1   en   c[p,r] ≤ x[p,r]           (precies één captain uit het team)
 * Over rondes (eenmalig gebruik):
 *   Σ_r x[p,r] ≤ 1
 *
 * Doordat toekomstige rondes meetellen, "kost" het inzetten van een speler nu zijn waarde later.
 * Het model kiest dus vanzelf om een speler te bewaren als hij later (na weging) meer oplevert
 * én dat in het totaalplaatje past (opportunity cost).
 */

export interface Candidate {
  playerId: string;
  position: Position;
  clubId?: string;
  price: number;
  /** Aanbevelingsscore (voorkeuren + risico verwerkt). */
  score: number;
  /** Ruwe verwachte punten. */
  ev: number;
}

export interface RoundCandidates {
  roundId: string;
  captainMultiplier: number;
  /** Weging (1 = huidige ronde, < 1 voor onzekere toekomst). */
  weight: number;
  candidates: Candidate[];
}

export interface PlanInput {
  rules: RuleSet;
  rounds: RoundCandidates[];
  /** Spelers die in de eerste ronde verplicht in het team staan (handmatige keuze). */
  lockedIds?: string[];
  /** Spelers die nergens gebruikt mogen worden (bijv. al gebruikt). */
  excludedIds?: Set<string>;
  /** Spelers die alleen in de eerste ronde niet mogen (bewust bewaard). */
  excludedNowIds?: Set<string>;
  /** Captain verplicht (eerste ronde). */
  lockedCaptainId?: string;
  /** Kandidaten per positie per ronde (vermenigvuldigd met het benodigde aantal). */
  pruneFactor?: number;
  timeoutMs?: number;
}

export interface PlannedRound {
  roundId: string;
  playerIds: string[];
  captainId?: string;
  /** Verwachte punten incl. captainmultiplier. */
  expectedPoints: number;
  score: number;
}

export interface PlanResult {
  feasible: boolean;
  rounds: PlannedRound[];
  timedOut: boolean;
  objective: number;
}

const varX = (p: string, r: number) => `x|${r}|${p}`;
const varC = (p: string, r: number) => `c|${r}|${p}`;

/** Houd per ronde per positie alleen de beste kandidaten over: houdt het model klein en snel. */
export function pruneCandidates(rules: RuleSet, cands: Candidate[], factor: number, keep: Set<string>): Candidate[] {
  const byPos = new Map<Position, Candidate[]>();
  for (const c of cands) (byPos.get(c.position) ?? byPos.set(c.position, []).get(c.position)!).push(c);
  const out: Candidate[] = [];
  for (const [pos, list] of byPos) {
    const need = rules.lineupPositions[pos]?.max ?? rules.lineupSize;
    // Extra marge zodat clubmaxima en budget nog keuze overlaten.
    const k = Math.max(need * factor + 2, 6);
    list.sort((a, b) => b.score - a.score);
    list.forEach((c, i) => {
      if (i < k || keep.has(c.playerId)) out.push(c);
    });
  }
  return out;
}

export function planLineups(input: PlanInput): PlanResult {
  const { rules } = input;
  const excluded = input.excludedIds ?? new Set<string>();
  const excludedNow = input.excludedNowIds ?? new Set<string>();
  const locked = new Set(input.lockedIds ?? []);
  const factor = input.pruneFactor ?? 3;

  const model: IlpModel = { objective: {}, constraints: {}, coefficients: {}, binaries: [], timeoutMs: input.timeoutMs };
  const coef = (v: string, c: string, a: number) => ((model.coefficients[v] ??= {})[c] = a);
  const roundCands: Candidate[][] = [];

  input.rounds.forEach((round, r) => {
    let cands = round.candidates.filter((c) => !excluded.has(c.playerId) && !(r === 0 && excludedNow.has(c.playerId)));
    cands = pruneCandidates(rules, cands, factor, r === 0 ? locked : new Set());
    roundCands.push(cands);

    const size = `r${r}|size`;
    const cap = `r${r}|cap`;
    model.constraints[size] = { equal: rules.lineupSize };
    if (rules.captain.enabled) model.constraints[cap] = { equal: 1 };
    for (const [pos, rg] of Object.entries(rules.lineupPositions)) {
      if (rg) model.constraints[`r${r}|pos|${pos}`] = { min: rg.min, max: rg.max };
    }
    if (rules.budget !== null) model.constraints[`r${r}|budget`] = { max: rules.budget };

    for (const c of cands) {
      const x = varX(c.playerId, r);
      model.binaries.push(x);
      model.objective[x] = round.weight * c.score;
      coef(x, size, 1);
      coef(x, `r${r}|pos|${c.position}`, 1);
      if (rules.maxPerClub !== null && c.clubId) {
        const cc = `r${r}|club|${c.clubId}`;
        model.constraints[cc] = { max: rules.maxPerClub };
        coef(x, cc, 1);
      }
      if (rules.budget !== null) coef(x, `r${r}|budget`, c.price);
      if (rules.usage.oncePerPhase) {
        const once = `once|${c.playerId}`;
        model.constraints[once] = { max: 1 };
        coef(x, once, 1);
      }
      if (r === 0 && locked.has(c.playerId)) {
        model.constraints[`lock|${c.playerId}`] = { min: 1 };
        coef(x, `lock|${c.playerId}`, 1);
      }
      if (rules.captain.enabled) {
        const cv = varC(c.playerId, r);
        model.binaries.push(cv);
        model.objective[cv] = round.weight * (round.captainMultiplier - 1) * c.score;
        coef(cv, cap, 1);
        const link = `r${r}|cx|${c.playerId}`;
        model.constraints[link] = { max: 0 };
        coef(cv, link, 1);
        coef(x, link, -1);
        if (r === 0 && input.lockedCaptainId === c.playerId) {
          model.constraints[`lockcap`] = { min: 1 };
          coef(cv, `lockcap`, 1);
        }
      }
    }
  });

  const res = solveIlp(model);
  if (!res.feasible) return { feasible: false, rounds: [], timedOut: res.timedOut, objective: 0 };

  const rounds: PlannedRound[] = input.rounds.map((round, r) => {
    const cands = roundCands[r];
    const picked = cands.filter((c) => isOn(res, varX(c.playerId, r)));
    const captain = cands.find((c) => isOn(res, varC(c.playerId, r)));
    const m = round.captainMultiplier;
    return {
      roundId: round.roundId,
      playerIds: picked.map((c) => c.playerId),
      captainId: captain?.playerId,
      expectedPoints: round2(picked.reduce((s, c) => s + c.ev, 0) + (captain ? (m - 1) * captain.ev : 0)),
      score: round2(picked.reduce((s, c) => s + c.score, 0) + (captain ? (m - 1) * captain.score : 0)),
    };
  });
  return { feasible: true, rounds, timedOut: res.timedOut, objective: res.objective };
}

const round2 = (x: number) => Math.round(x * 100) / 100;
