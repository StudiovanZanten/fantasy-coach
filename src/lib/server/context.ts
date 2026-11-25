import "server-only";
import { z } from "zod";
import { getDataAdapter } from "@/data";
import { withUserPlayers, type UserPlayerEntry } from "@/data/identity";
import { indexDataset } from "@/engine/recommend/dataset";
import type { RecommendContext } from "@/engine/recommend/football";
import { parseRuleSet, RuleOverridesSchema } from "@/engine/rules/schema";
import { DEFAULT_PREFERENCES, type Preferences } from "@/engine/types";
import { getGame } from "@/games/registry";

/** Gemeenschappelijke invoer voor de engine-API's. De engine is stateless: de client stuurt zijn status mee. */
export const BaseRequest = z.object({
  gameId: z.string(),
  now: z.string().datetime().optional(),
  prefs: z.record(z.string(), z.unknown()).optional(),
  rules: z.unknown().optional(),
  overrides: RuleOverridesSchema.optional(),
  entries: z
    .array(z.object({ key: z.string(), input: z.string(), position: z.enum(["GK", "DEF", "MID", "FWD"]), linkedPlayerId: z.string().optional(), customClubId: z.string().optional(), confirmed: z.boolean() }))
    .optional(),
  usedPlayerIds: z.array(z.string()).optional(),
});
export type BaseRequest = z.infer<typeof BaseRequest>;

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function buildContext(body: BaseRequest): Promise<{ ctx: RecommendContext; isMock: boolean }> {
  const game = getGame(body.gameId);
  if (!game || game.availability !== "active") throw new HttpError(404, "Onbekend of nog niet beschikbaar spel");
  const bundle = await getDataAdapter().getGameBundle(game.id);
  if (!bundle) throw new HttpError(404, "Geen data voor dit spel");
  let rules = game.defaultRules;
  if (body.rules) {
    const parsed = parseRuleSet(body.rules);
    if (!parsed.ok) throw new HttpError(400, `Ongeldige spelregels: ${parsed.errors.join("; ")}`);
    rules = parsed.rules;
  }
  const prefs: Preferences = { ...DEFAULT_PREFERENCES, ...(body.prefs as Partial<Preferences>) };
  const ds = withUserPlayers(bundle.dataset, (body.entries ?? []) as UserPlayerEntry[]);
  return {
    ctx: {
      idx: indexDataset(ds),
      rules,
      prefs,
      overrides: body.overrides,
      usedPlayerIds: body.usedPlayerIds ?? [],
      now: body.now ? new Date(body.now) : new Date(),
    },
    isMock: bundle.meta.isMock,
  };
}

export function jsonError(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof z.ZodError) return Response.json({ error: "Ongeldige invoer", issues: e.issues }, { status: 400 });
  console.error(e);
  return Response.json({ error: "Er ging iets mis in de berekening" }, { status: 500 });
}
