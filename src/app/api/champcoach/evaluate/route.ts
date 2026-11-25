import { z } from "zod";
import { BaseRequest, buildContext, jsonError } from "@/lib/server/context";
import { evaluateRound } from "@/engine/evaluation/evaluate";

const Body = BaseRequest.extend({ roundId: z.string(), playerIds: z.array(z.string()), captainId: z.string().optional() });

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const { ctx, isMock } = await buildContext(body);
    return Response.json({ evaluation: evaluateRound(ctx, body.roundId, body.playerIds, body.captainId), isMock });
  } catch (e) {
    return jsonError(e);
  }
}
