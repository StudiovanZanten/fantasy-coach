import type { RuleSet } from "../rules/schema";
import type { Position } from "../types";
import { isOn, solveIlp, type IlpModel } from "./ilp";

/**
 * Selectie-optimalisatie voor budgetspellen (TopCoach).
 *
 * Variabelen:
 *   s[p]   = 1 als speler p in de selectie zit
 *   x[p,r] = 1 als p in ronde r in de opstelling staat  (x[p,r] ≤ s[p])
 *   b[p,r] = 1 als p in ronde r op de bank zit          (x[p,r] + b[p,r] ≤ s[p], telt voor benchFactor)
 *   c[p,r] = 1 als p in ronde r captain is              (c[p,r] ≤ x[p,r])
 *   f[k,r] = 1 als in ronde r formatie k wordt gespeeld (Σ_k f[k,r] = 1, aantallen per linie volgen f)
 *   e      = aantal betaalde transfers (integer ≥ 0)
 *
 * Doel: max Σ_r w_r·Σ_p (score·x + (m−1)·score·c)  +  β·Σ_p score_bank·s  −  kosten·e
 *   (β is een kleine weging voor een sterke bank, i.v.m. automatische wissels)
 *
 * Constraints: selectiegrootte + posities, budget, clubmaximum over de selectie,
 * formatie per ronde, transfers t.o.v. de huidige selectie:
 *   Σ_{p∉huidig} s[p] ≤ maxPerRound,   e ≥ Σ_{p∉huidig} s[p] − gratis
 */

export interface SquadCandidate {
  playerId: string;
  position: Position;
  clubId?: string;
  price: number;
  /** Score per ronde-index (0 = huidige ronde). Ontbreekt = speelt niet. */
  scores: (number | undefined)[];
  evs: (number | undefined)[];
}

export interface SquadInput {
  rules: RuleSet;
  candidates: SquadCandidate[];
  roundIds: string[];
  weights: number[];
  captainMultipliers: number[];
  currentSquadIds?: string[];
  /** Budget inclusief bank + waarde huidige selectie. Standaard rules.budget. */
  budget?: number;
  excludedIds?: Set<string>;
  lockedIds?: string[];
  /** Kandidaten per positie = benodigd aantal × poolFactor. */
  poolFactor?: number;
  timeoutMs?: number;
}

export interface SquadResult {
  feasible: boolean;
  squadIds: string[];
  /** Opstelling + captain per ronde. */
  lineups: { roundId: string; playerIds: string[]; benchIds: string[]; captainId?: string; expectedPoints: number }[];
  transfersIn: string[];
  transfersOut: string[];
  paidTransfers: number;
  cost: number;
  timedOut: boolean;
}

const BENCH_WEIGHT = 0.02;

export function optimizeSquad(input: SquadInput): SquadResult {
  const { rules } = input;
  const squadSize = rules.squadSize ?? rules.lineupSize;
  const squadPos = rules.squadPositions ?? rules.lineupPositions;
  const current = new Set(input.currentSquadIds ?? []);
  const locked = new Set(input.lockedIds ?? []);
  const excluded = input.excludedIds ?? new Set();
  const budget = input.budget ?? rules.budget;

  // Voorselectie: per positie de beste kandidaten over de hele horizon + huidige selectie.
  const total = (c: SquadCandidate) => c.scores.reduce<number>((s, v, i) => s + (v ?? 0) * (input.weights[i] ?? 0), 0);
  const byPos = new Map<Position, SquadCandidate[]>();
  for (const c of input.candidates) {
    if (excluded.has(c.playerId) && !current.has(c.playerId)) continue;
    (byPos.get(c.position) ?? byPos.set(c.position, []).get(c.position)!).push(c);
  }
  const cands: SquadCandidate[] = [];
  for (const [pos, list] of byPos) {
    const need = squadPos[pos]?.max ?? squadSize;
    // Twee lijsten: beste absolute waarde én beste waarde per miljoen (anders past niets binnen budget).
    const k = need * (input.poolFactor ?? 3);
    const byValue = [...list].sort((a, b) => total(b) - total(a)).slice(0, k);
    const byRatio = [...list].sort((a, b) => total(b) / Math.max(b.price, 0.5) - total(a) / Math.max(a.price, 0.5)).slice(0, k);
    const keep = new Set([...byValue, ...byRatio].map((c) => c.playerId));
    for (const c of list) if (keep.has(c.playerId) || current.has(c.playerId) || locked.has(c.playerId)) cands.push(c);
  }

  const m: IlpModel = { objective: {}, constraints: {}, coefficients: {}, binaries: [], ints: [], timeoutMs: input.timeoutMs ?? 6000 };
  const coef = (v: string, c: string, a: number) => ((m.coefficients[v] ??= {})[c] = a);

  m.constraints["squad|size"] = { equal: squadSize };
  for (const [pos, rg] of Object.entries(squadPos)) if (rg) m.constraints[`squad|pos|${pos}`] = { min: rg.min, max: rg.max };
  if (budget !== null && budget !== undefined) m.constraints["squad|budget"] = { max: budget };

  const hasTransfers = rules.transfers.enabled && current.size > 0;
  if (hasTransfers) {
    if (rules.transfers.maxPerRound !== null) m.constraints["tr|max"] = { max: rules.transfers.maxPerRound };
    m.constraints["tr|paid"] = { min: -rules.transfers.freePerRound };
    m.ints!.push("e");
    m.objective["e"] = -rules.transfers.pointCostPerExtra;
    coef("e", "tr|paid", 1);
  }

  const benchSize = rules.squadSlots?.benchSize ?? 0;
  const benchFactor = rules.squadSlots?.benchFactor ?? 0;
  input.roundIds.forEach((_, r) => {
    m.constraints[`r${r}|size`] = { equal: rules.lineupSize };
    for (const [pos, rg] of Object.entries(rules.lineupPositions)) if (rg) m.constraints[`r${r}|pos|${pos}`] = { min: rg.min, max: rg.max };
    if (rules.captain.enabled) m.constraints[`r${r}|cap`] = { equal: 1 };
    if (benchSize) m.constraints[`r${r}|bench`] = { max: benchSize };
    if (rules.formations.length) {
      m.constraints[`r${r}|form`] = { equal: 1 };
      rules.formations.forEach((f, k) => {
        const v = `f|${r}|${k}`;
        m.binaries.push(v);
        coef(v, `r${r}|form`, 1);
        const [d, mi, a] = f.split("-").map(Number);
        coef(v, `r${r}|line|DEF`, -d);
        coef(v, `r${r}|line|MID`, -mi);
        coef(v, `r${r}|line|FWD`, -a);
      });
      for (const pos of ["DEF", "MID", "FWD"]) m.constraints[`r${r}|line|${pos}`] = { equal: 0 };
    }
  });

  for (const c of cands) {
    const s = `s|${c.playerId}`;
    m.binaries.push(s);
    m.objective[s] = BENCH_WEIGHT * total(c);
    coef(s, "squad|size", 1);
    coef(s, `squad|pos|${c.position}`, 1);
    if (budget !== null && budget !== undefined) coef(s, "squad|budget", c.price);
    if (rules.maxPerClub !== null && c.clubId) {
      m.constraints[`club|${c.clubId}`] = { max: rules.maxPerClub };
      coef(s, `club|${c.clubId}`, 1);
    }
    if (hasTransfers && !current.has(c.playerId)) {
      if (rules.transfers.maxPerRound !== null) coef(s, "tr|max", 1);
      coef(s, "tr|paid", -1);
    }
    if (locked.has(c.playerId)) {
      m.constraints[`lock|${c.playerId}`] = { min: 1 };
      coef(s, `lock|${c.playerId}`, 1);
    }
    input.roundIds.forEach((_, r) => {
      const score = c.scores[r];
      if (score === undefined || excluded.has(c.playerId)) return;
      const x = `x|${r}|${c.playerId}`;
      m.binaries.push(x);
      m.objective[x] = input.weights[r] * score;
      coef(x, `r${r}|size`, 1);
      coef(x, `r${r}|pos|${c.position}`, 1);
      if (rules.formations.length && c.position !== "GK") coef(x, `r${r}|line|${c.position}`, 1);
      const link = `r${r}|xs|${c.playerId}`;
      m.constraints[link] = { max: 0 };
      coef(x, link, 1);
      coef(s, link, -1);
      if (benchSize) {
        const b = `b|${r}|${c.playerId}`;
        m.binaries.push(b);
        m.objective[b] = input.weights[r] * benchFactor * score;
        coef(b, `r${r}|bench`, 1);
        coef(b, link, 1);
      }
      if (rules.captain.enabled) {
        const cv = `c|${r}|${c.playerId}`;
        m.binaries.push(cv);
        m.objective[cv] = input.weights[r] * (input.captainMultipliers[r] - 1) * score;
        coef(cv, `r${r}|cap`, 1);
        const cl = `r${r}|cx|${c.playerId}`;
        m.constraints[cl] = { max: 0 };
        coef(cv, cl, 1);
        coef(x, cl, -1);
      }
    });
  }

  const res = solveIlp(m);
  if (!res.feasible)
    return { feasible: false, squadIds: [], lineups: [], transfersIn: [], transfersOut: [], paidTransfers: 0, cost: 0, timedOut: res.timedOut };

  const squad = cands.filter((c) => isOn(res, `s|${c.playerId}`));
  const squadIds = squad.map((c) => c.playerId);
  const lineups = input.roundIds.map((roundId, r) => {
    const picked = squad.filter((c) => isOn(res, `x|${r}|${c.playerId}`));
    const bench = squad.filter((c) => isOn(res, `b|${r}|${c.playerId}`));
    const cap = squad.find((c) => isOn(res, `c|${r}|${c.playerId}`));
    const ev =
      picked.reduce((s, c) => s + (c.evs[r] ?? 0), 0) +
      benchFactor * bench.reduce((s, c) => s + (c.evs[r] ?? 0), 0) +
      (cap ? (input.captainMultipliers[r] - 1) * (cap.evs[r] ?? 0) : 0);
    return { roundId, playerIds: picked.map((c) => c.playerId), benchIds: bench.map((c) => c.playerId), captainId: cap?.playerId, expectedPoints: Math.round(ev * 100) / 100 };
  });
  return {
    feasible: true,
    squadIds,
    lineups,
    transfersIn: current.size ? squadIds.filter((id) => !current.has(id)) : [],
    transfersOut: [...current].filter((id) => !squadIds.includes(id)),
    paidTransfers: Math.round(res.values["e"] ?? 0),
    cost: Math.round(squad.reduce((s, c) => s + c.price, 0) * 10) / 10,
    timedOut: res.timedOut,
  };
}
