import { z } from "zod";
import { BaseRequest, buildContext, jsonError } from "@/lib/server/context";
import { analyseDartsTournament } from "@/engine/scoring/darts";
import { planLineups } from "@/engine/optimizer/lineup";
import { captainMultiplierFor } from "@/engine/rules/schema";

const Body = BaseRequest.extend({ roundId: z.string(), variant: z.enum(["safe", "balanced", "aggressive"]).optional() });

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const { ctx, isMock } = await buildContext(body);
    const slots = ctx.idx.ds.brackets?.[body.roundId];
    if (!slots || !ctx.rules.scoring.darts) return Response.json({ error: "Geen toernooischema" }, { status: 404 });
    const prefs = body.variant ? { ...ctx.prefs, riskProfile: body.variant } : ctx.prefs;
    const analysis = analyseDartsTournament({ slots, players: ctx.idx.players, scoring: ctx.rules.scoring.darts, prefs, roundId: body.roundId });
    const m = captainMultiplierFor(ctx.rules, body.roundId);
    const plan = planLineups({
      rules: ctx.rules,
      rounds: [
        {
          roundId: body.roundId,
          captainMultiplier: m,
          weight: 1,
          candidates: analysis.projections.filter((p) => p.available).map((p) => ({ playerId: p.playerId, position: "DARTER" as const, price: ctx.idx.players.get(p.playerId)!.price, score: p.score, ev: p.ev })),
        },
      ],
    });
    return Response.json({ analysis, team: plan.rounds[0], isMock });
  } catch (e) {
    return jsonError(e);
  }
}
