import { z } from "zod";
import { BaseRequest, buildContext, jsonError } from "@/lib/server/context";
import { adviseTopCoach } from "@/engine/recommend/topcoach";
import { roundForNow } from "@/engine/recommend/dataset";
import { entryPlayerId, type UserPlayerEntry } from "@/data/identity";

const Body = BaseRequest.extend({
  roundId: z.string().optional(),
  starters: z.array(z.string()).default([]),
  bench: z.array(z.string()).default([]),
  captainKey: z.string().optional(),
  goldenSubsUsed: z.record(z.string(), z.number()).default({}),
  bank: z.number().default(0),
  includeGoldenSubs: z.boolean().default(true),
  includeTransfers: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const { ctx, isMock } = await buildContext(body);
    const entries = (body.entries ?? []) as UserPlayerEntry[];
    const idOf = new Map(entries.map((e) => [e.key, entryPlayerId(e)]));
    const playerIds = entries.map((e) => idOf.get(e.key)).filter((x): x is string => Boolean(x));
    const map = (keys: string[]) => keys.map((k) => idOf.get(k)).filter((x): x is string => Boolean(x));
    const rounds = roundForNow(ctx.idx, ctx.now);
    const roundId = body.roundId ?? rounds.next ?? rounds.live;
    if (!roundId) return Response.json({ error: "Geen open speelronde gevonden" }, { status: 404 });
    const advice = adviseTopCoach(ctx, {
      roundId,
      squad: { playerIds, starters: map(body.starters), bench: map(body.bench), captainId: body.captainKey ? idOf.get(body.captainKey) : undefined, goldenSubsUsed: body.goldenSubsUsed, bank: body.bank },
      includeGoldenSubs: body.includeGoldenSubs,
      includeTransfers: body.includeTransfers,
    });
    return Response.json({ advice, rounds, isMock, unlinked: entries.filter((e) => !idOf.get(e.key)).map((e) => e.key), generatedAt: new Date().toISOString() });
  } catch (e) {
    return jsonError(e);
  }
}
