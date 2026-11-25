import type { RuleSet } from "../rules/schema";
import type { Position } from "../types";
import { isOn, solveIlp, type IlpModel } from "./ilp";

/**
 * Indeling van een vaste selectie over basis, bank en tribune (TopCoach).
 *
 * Per toegestane formatie (DEF-MID-FWD, plus 1 keeper) lossen we een klein ILP op:
 *   x[p] = basis (100%), b[p] = bank (benchFactor, bijv. 50%), c[p] = captain
 *   max  Σ score·x + benchFactor·Σ score·b + (m − 1)·Σ score·c
 *   met  Σ_pos x = formatie-aantal,  Σ b = bankgrootte,  x + b ≤ 1,  c ≤ x,  Σ c = 1
 * Spelers zonder x of b staan op de tribune (0%).
 *
 * Door elke formatie apart op te lossen kunnen we de gebruiker een vergelijking per formatie
 * tonen ("4-3-3 levert X punten, 3-4-3 levert Y").
 */

export interface SlotCandidate {
  playerId: string;
  position: Position;
  score: number;
  ev: number;
}

export interface FormationOption {
  formation: string;
  feasible: boolean;
  starters: string[];
  bench: string[];
  tribune: string[];
  captainId?: string;
  /** Verwachte punten: basis + bankfactor·bank + extra captain. */
  expectedPoints: number;
  score: number;
}

export interface SquadLineupInput {
  rules: RuleSet;
  squad: SlotCandidate[];
  captainMultiplier: number;
  /** Optioneel: vaste captain (handmatige keuze). */
  lockedCaptainId?: string;
  lockedStarters?: string[];
}

export function formationsFor(rules: RuleSet): string[] {
  if (rules.formations.length) return rules.formations;
  // Afleiden uit de positieranges als er geen lijst is.
  const out: string[] = [];
  const r = rules.lineupPositions;
  const gk = r.GK?.min ?? 1;
  for (let d = r.DEF?.min ?? 0; d <= (r.DEF?.max ?? 0); d++)
    for (let m = r.MID?.min ?? 0; m <= (r.MID?.max ?? 0); m++) {
      const f = rules.lineupSize - gk - d - m;
      if (f >= (r.FWD?.min ?? 0) && f <= (r.FWD?.max ?? 0)) out.push(`${d}-${m}-${f}`);
    }
  return out;
}

export function optimizeSquadLineup(input: SquadLineupInput): { best?: FormationOption; options: FormationOption[] } {
  const { rules, squad } = input;
  const benchSize = rules.squadSlots?.benchSize ?? 0;
  const benchFactor = rules.squadSlots?.benchFactor ?? 0;
  const m = rules.captain.enabled ? input.captainMultiplier : 1;
  const options: FormationOption[] = [];

  for (const formation of formationsFor(rules)) {
    const [d, mi, f] = formation.split("-").map(Number);
    const counts: Partial<Record<Position, number>> = { GK: rules.lineupPositions.GK?.min ?? 1, DEF: d, MID: mi, FWD: f };
    const model: IlpModel = { objective: {}, constraints: {}, coefficients: {}, binaries: [], timeoutMs: 2000 };
    const coef = (v: string, c: string, a: number) => ((model.coefficients[v] ??= {})[c] = a);
    for (const [pos, n] of Object.entries(counts)) model.constraints[`pos|${pos}`] = { equal: n };
    if (benchSize) model.constraints["bench"] = { equal: Math.min(benchSize, squad.length - rules.lineupSize) };
    if (rules.captain.enabled) model.constraints["cap"] = { equal: 1 };

    for (const p of squad) {
      const x = `x|${p.playerId}`;
      const b = `b|${p.playerId}`;
      const c = `c|${p.playerId}`;
      model.binaries.push(x);
      model.objective[x] = p.score;
      coef(x, `pos|${p.position}`, 1);
      const one = `one|${p.playerId}`;
      model.constraints[one] = { max: 1 };
      coef(x, one, 1);
      if (input.lockedStarters?.includes(p.playerId)) {
        model.constraints[`lock|${p.playerId}`] = { min: 1 };
        coef(x, `lock|${p.playerId}`, 1);
      }
      if (benchSize) {
        model.binaries.push(b);
        model.objective[b] = benchFactor * p.score;
        coef(b, "bench", 1);
        coef(b, one, 1);
      }
      if (rules.captain.enabled) {
        model.binaries.push(c);
        model.objective[c] = (m - 1) * p.score;
        coef(c, "cap", 1);
        const link = `cx|${p.playerId}`;
        model.constraints[link] = { max: 0 };
        coef(c, link, 1);
        coef(x, link, -1);
        if (input.lockedCaptainId === p.playerId) {
          model.constraints["lockcap"] = { min: 1 };
          coef(c, "lockcap", 1);
        }
      }
    }
    const res = solveIlp(model);
    if (!res.feasible) {
      options.push({ formation, feasible: false, starters: [], bench: [], tribune: [], expectedPoints: 0, score: 0 });
      continue;
    }
    const starters = squad.filter((p) => isOn(res, `x|${p.playerId}`));
    const bench = squad.filter((p) => isOn(res, `b|${p.playerId}`));
    const cap = squad.find((p) => isOn(res, `c|${p.playerId}`));
    const tribune = squad.filter((p) => !starters.includes(p) && !bench.includes(p));
    const ev = starters.reduce((s, p) => s + p.ev, 0) + benchFactor * bench.reduce((s, p) => s + p.ev, 0) + (cap ? (m - 1) * cap.ev : 0);
    const sc = starters.reduce((s, p) => s + p.score, 0) + benchFactor * bench.reduce((s, p) => s + p.score, 0) + (cap ? (m - 1) * cap.score : 0);
    options.push({
      formation,
      feasible: true,
      starters: sortByPos(starters).map((p) => p.playerId),
      bench: sortByPos(bench).map((p) => p.playerId),
      tribune: sortByPos(tribune).map((p) => p.playerId),
      captainId: cap?.playerId,
      expectedPoints: Math.round(ev),
      score: Math.round(sc),
    });
  }
  options.sort((a, b) => b.score - a.score);
  return { best: options.find((o) => o.feasible), options };
}

/** Verwachte punten van een bestaande indeling (om huidige vs. ideale opstelling te vergelijken). */
export function evaluateSlots(
  rules: RuleSet,
  squad: Map<string, SlotCandidate>,
  slots: { starters: string[]; bench: string[]; captainId?: string },
  captainMultiplier: number,
): number {
  const f = rules.squadSlots?.benchFactor ?? 0;
  const ev = (id: string) => squad.get(id)?.ev ?? 0;
  const cap = slots.captainId && slots.starters.includes(slots.captainId) ? (captainMultiplier - 1) * ev(slots.captainId) : 0;
  return Math.round(slots.starters.reduce((s, id) => s + ev(id), 0) + f * slots.bench.reduce((s, id) => s + ev(id), 0) + cap);
}

export function formationOf(ids: string[], pos: (id: string) => Position | undefined): string {
  const n = (p: Position) => ids.filter((id) => pos(id) === p).length;
  return `${n("DEF")}-${n("MID")}-${n("FWD")}`;
}

const ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3, DARTER: 4 };
const sortByPos = <T extends { position: Position; score: number }>(l: T[]) =>
  [...l].sort((a, b) => ORDER[a.position] - ORDER[b.position] || b.score - a.score);
