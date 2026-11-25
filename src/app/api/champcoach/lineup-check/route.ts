import { z } from "zod";
import { BaseRequest, buildContext, jsonError } from "@/lib/server/context";
import { checkLineup } from "@/engine/lineup/check";

const Body = BaseRequest.extend({ roundId: z.string(), playerIds: z.array(z.string()), captainId: z.string().optional() });

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const { ctx, isMock } = await buildContext(body);
    return Response.json({ check: checkLineup(ctx, body.roundId, body.playerIds, body.captainId), isMock, checkedAt: ctx.now.toISOString() });
  } catch (e) {
    return jsonError(e);
  }
}
