import { z } from "zod";
import { BaseRequest, buildContext, jsonError } from "@/lib/server/context";
import { recommend } from "@/engine/recommend/football";

const Body = BaseRequest.extend({
  roundId: z.string(),
  variants: z.array(z.enum(["safe", "balanced", "aggressive"])).default(["balanced"]),
  lockedIds: z.array(z.string()).optional(),
  lockedCaptainId: z.string().optional(),
  excludedIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const { ctx, isMock } = await buildContext(body);
    const recs = Object.fromEntries(
      body.variants.map((v) => [v, recommend(ctx, { roundId: body.roundId, variant: v, lockedIds: body.lockedIds, lockedCaptainId: body.lockedCaptainId, excludedIds: body.excludedIds })]),
    );
    return Response.json({ recommendations: recs, isMock, generatedAt: new Date().toISOString() });
  } catch (e) {
    return jsonError(e);
  }
}
