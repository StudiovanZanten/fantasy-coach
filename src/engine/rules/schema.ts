import { z } from "zod";

/**
 * Spelregels als data. Alles wat per fantasyspel verschilt staat hier, zodat regels in de
 * beheeromgeving zonder code kunnen worden aangepast.
 */

const range = z.object({ min: z.number().int().min(0), max: z.number().int().min(0) });

const positionRanges = z.object({
  GK: range.optional(),
  DEF: range.optional(),
  MID: range.optional(),
  FWD: range.optional(),
  DARTER: range.optional(),
});

const perPosition = z.object({
  GK: z.number(),
  DEF: z.number(),
  MID: z.number(),
  FWD: z.number(),
});

/** Waarde per positie, of één waarde voor alle posities. */
const posValue = z.union([z.number(), perPosition]);

export const FootballScoringSchema = z.object({
  /** Punten voor speeltijd. `minutesThreshold` bepaalt de grens (bijv. 45 of 60 minuten). */
  appearance: posValue.default(0),
  minutesThreshold: z.number().int().default(60),
  minutesPoints: posValue.default(1),
  goal: perPosition,
  assist: posValue,
  cleanSheet: perPosition,
  win: posValue.default(0),
  draw: posValue.default(0),
  yellow: z.number().default(-1),
  red: z.number().default(-3),
  penaltySaved: posValue.default(0),
  penaltyMissed: z.number().default(0),
  ownGoal: z.number().default(0),
  hattrickBonus: z.number().default(0),
  /** Aftrek per tegendoelpunt (positief getal = aftrek). */
  goalConceded: perPosition.optional(),
});

export const pv = (v: z.infer<typeof posValue>, pos: "GK" | "DEF" | "MID" | "FWD"): number => (typeof v === "number" ? v : v[pos]);

export const DartsScoringSchema = z.object({
  /** Punten per gewonnen partij, per ronde (R1, R2, …, F). */
  matchWin: z.record(z.string(), z.number()),
  per180: z.number(),
  /** Bonus als het gemiddelde in een partij boven de 100 ligt. */
  avgOver100: z.number(),
  tournamentWin: z.number(),
});

export const RuleSetSchema = z.object({
  version: z.number().int().default(1),
  /** Welke planner de engine gebruikt. */
  mode: z.enum(["once-per-phase", "budget-squad", "bracket"]),
  roundScope: z.enum(["sub-round", "matchday", "tournament"]),
  /** Aantal opgestelde spelers per ronde. */
  lineupSize: z.number().int().min(1),
  lineupPositions: positionRanges,
  /** Totale selectie (TopCoach). Leeg = gelijk aan opstelling. */
  squadSize: z.number().int().optional(),
  squadPositions: positionRanges.optional(),
  budget: z.number().nullable().default(null),
  maxPerClub: z.number().int().nullable().default(null),
  usage: z.object({
    /** Iedere speler maximaal één keer per fase (Champ Coach league phase). */
    oncePerPhase: z.boolean().default(false),
    phase: z.string().optional(),
  }),
  captain: z.object({
    enabled: z.boolean().default(true),
    multiplier: z.number().min(1).default(2),
    viceCaptain: z.boolean().default(false),
    /** Ronde-id → multiplier, bijv. speciale 300%-rondes. */
    roundOverrides: z.record(z.string(), z.number()).default({}),
  }),
  transfers: z.object({
    enabled: z.boolean().default(false),
    freePerRound: z.number().int().default(0),
    maxPerRound: z.number().int().nullable().default(null),
    pointCostPerExtra: z.number().default(0),
  }),
  substitutions: z.object({
    autoSubs: z.boolean().default(false),
    benchSize: z.number().int().default(0),
  }),
  deadline: z.object({
    /** round-start: alles vast bij eerste aftrap. per-fixture: speler vast bij aftrap van zijn wedstrijd. */
    mode: z.enum(["round-start", "per-fixture"]).default("round-start"),
  }),
  /** Beschikbare tijdsloten (lokale tijd, HH:MM). De gebruiker kan hierop filteren. */
  timeSlots: z.array(z.string()).default([]),
  matchOfTheRound: z.object({
    enabled: z.boolean().default(false),
    bonusMultiplier: z.number().default(1),
  }),
  availability: z.object({
    excludeInjured: z.boolean().default(true),
    excludeSuspended: z.boolean().default(true),
  }),
  priceChanges: z.object({ enabled: z.boolean().default(false) }),
  /**
   * Verdeling van de selectie per ronde (TopCoach): basis 100%, bank 50%, tribune 0%.
   * Leeg = alleen de opstelling telt.
   */
  squadSlots: z
    .object({
      benchSize: z.number().int().min(0),
      benchFactor: z.number().min(0).max(1),
      tribuneSize: z.number().int().min(0),
    })
    .optional(),
  /** Toegestane formaties als "DEF-MID-FWD" (bijv. "4-3-3"). Leeg = alleen positieranges gelden. */
  formations: z.array(z.string().regex(/^\d-\d-\d$/)).default([]),
  /** Gouden Wissels: aantal per seizoenshelft en bonus per ongebruikte wissel. */
  goldenSubs: z
    .object({ perHalf: z.number().int().min(0), unusedBonus: z.number(), halves: z.array(z.object({ name: z.string(), fromRound: z.number().int(), toRound: z.number().int() })) })
    .optional(),
  /** Transferfases per speelronde (proefperiode, vaste selectie, transferperiode). */
  transferPhases: z
    .array(z.object({ name: z.string(), fromRound: z.number().int(), toRound: z.number().int(), kind: z.enum(["unlimited", "locked", "window"]) }))
    .default([]),
  /** Herkomst en controle van deze regels. */
  verification: z
    .object({ status: z.enum(["unverified", "verified"]), source: z.string(), checkedAt: z.string().optional(), notes: z.string().optional() })
    .default({ status: "unverified", source: "Aanname" }),
  /** Lange-termijnprogramma: aantal rondes vooruit dat meetelt. */
  horizon: z.number().int().min(1).default(1),
  scoring: z.object({
    football: FootballScoringSchema.optional(),
    darts: DartsScoringSchema.optional(),
  }),
});

export type RuleSet = z.infer<typeof RuleSetSchema>;
export type FootballScoring = z.infer<typeof FootballScoringSchema>;
export type DartsScoring = z.infer<typeof DartsScoringSchema>;

/** Persoonlijke overrides per spel (bijv. alleen 21:00-wedstrijden). */
export const RuleOverridesSchema = z.object({
  timeSlots: z.array(z.string()).optional(),
  /** Weekdagen (0 = zondag … 6 = zaterdag) in de tijdzone van de competitie. */
  days: z.array(z.number().int().min(0).max(6)).optional(),
});
export type RuleOverrides = z.infer<typeof RuleOverridesSchema>;

export function parseRuleSet(input: unknown): { ok: true; rules: RuleSet } | { ok: false; errors: string[] } {
  const res = RuleSetSchema.safeParse(input);
  if (res.success) {
    const errors = sanityCheck(res.data);
    return errors.length ? { ok: false, errors } : { ok: true, rules: res.data };
  }
  return { ok: false, errors: res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
}

/** Inhoudelijke controles die Zod niet kan uitdrukken. */
function sanityCheck(r: RuleSet): string[] {
  const errors: string[] = [];
  const check = (label: string, ranges: RuleSet["lineupPositions"] | undefined, size: number) => {
    if (!ranges) return;
    let min = 0;
    let max = 0;
    for (const [pos, rg] of Object.entries(ranges)) {
      if (!rg) continue;
      if (rg.min > rg.max) errors.push(`${label}: ${pos} heeft min groter dan max`);
      min += rg.min;
      max += rg.max;
    }
    if (min > size) errors.push(`${label}: som van de minima (${min}) is groter dan ${size}`);
    if (max < size) errors.push(`${label}: som van de maxima (${max}) is kleiner dan ${size}`);
  };
  check("Opstelling", r.lineupPositions, r.lineupSize);
  if (r.squadSize) check("Selectie", r.squadPositions, r.squadSize);
  if (r.mode === "budget-squad" && !r.squadSize) errors.push("Budgetspel vereist een selectiegrootte");
  for (const f of r.formations) {
    const [d, m, a] = f.split("-").map(Number);
    if (d + m + a + (r.lineupPositions.GK?.min ?? 1) !== r.lineupSize) errors.push(`Formatie ${f} telt niet op tot ${r.lineupSize} spelers`);
  }
  if (r.squadSlots && r.squadSize && r.lineupSize + r.squadSlots.benchSize + r.squadSlots.tribuneSize !== r.squadSize)
    errors.push("Basis + bank + tribune moet gelijk zijn aan de selectiegrootte");
  if (r.maxPerClub !== null && r.maxPerClub < 1) errors.push("Max. per club moet minimaal 1 zijn");
  return errors;
}

export function captainMultiplierFor(rules: RuleSet, roundId: string, roundOverride?: number): number {
  if (!rules.captain.enabled) return 1;
  return rules.captain.roundOverrides[roundId] ?? roundOverride ?? rules.captain.multiplier;
}
