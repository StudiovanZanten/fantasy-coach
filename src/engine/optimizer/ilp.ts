import solver from "javascript-lp-solver";

/**
 * Dunne, getypeerde laag boven javascript-lp-solver.
 *
 * We bouwen modellen als: variabelen met een objectiefcoëfficiënt en coëfficiënten per constraint.
 * Alle variabelen in onze modellen zijn binair (0/1) of integer.
 */
export interface IlpModel {
  objective: Record<string, number>;
  /** constraintNaam → { min?, max?, equal? } */
  constraints: Record<string, { min?: number; max?: number; equal?: number }>;
  /** variabele → { constraintNaam: coëfficiënt } */
  coefficients: Record<string, Record<string, number>>;
  binaries: string[];
  ints?: string[];
  timeoutMs?: number;
}

export interface IlpResult {
  feasible: boolean;
  objective: number;
  values: Record<string, number>;
  /** true als de solver de tijdslimiet raakte (oplossing kan suboptimaal zijn). */
  timedOut: boolean;
}

const OBJ = "__objective";

export function solveIlp(m: IlpModel): IlpResult {
  const variables: Record<string, Record<string, number>> = {};
  const allVars = new Set([...Object.keys(m.objective), ...Object.keys(m.coefficients), ...m.binaries, ...(m.ints ?? [])]);
  for (const v of allVars) variables[v] = { [OBJ]: m.objective[v] ?? 0, ...(m.coefficients[v] ?? {}) };

  // Binaire variabelen: expliciete bovengrens 1 via eigen constraint (robuuster dan alleen "binaries").
  const constraints: Record<string, { min?: number; max?: number; equal?: number }> = { ...m.constraints };
  for (const b of m.binaries) {
    const name = `__ub_${b}`;
    constraints[name] = { max: 1 };
    variables[b][name] = 1;
  }

  const binaries: Record<string, 1> = {};
  for (const b of m.binaries) binaries[b] = 1;
  const ints: Record<string, 1> = {};
  for (const i of m.ints ?? []) ints[i] = 1;

  const started = Date.now();
  const res = solver.Solve({
    optimize: OBJ,
    opType: "max",
    constraints,
    variables,
    binaries,
    ints,
    options: { timeout: m.timeoutMs ?? 4000, tolerance: 0 },
  } as never) as Record<string, number | boolean | undefined>;

  const values: Record<string, number> = {};
  for (const v of allVars) {
    const val = res[v];
    values[v] = typeof val === "number" ? Math.round(val * 1e6) / 1e6 : 0;
  }
  return {
    feasible: Boolean(res.feasible),
    objective: typeof res.result === "number" ? res.result : 0,
    values,
    timedOut: Date.now() - started >= (m.timeoutMs ?? 4000),
  };
}

export const isOn = (r: IlpResult, v: string) => (r.values[v] ?? 0) > 0.5;
