import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * Optionele taalmodel-laag voor de assistent. De feiten komen altijd uit de eigen engine
 * (deterministisch); Claude herformuleert alleen en mag niets toevoegen. Zonder
 * ANTHROPIC_API_KEY antwoordt de assistent met de feitelijke engine-tekst.
 */
const Body = z.object({ question: z.string().min(1).max(500), facts: z.string().min(1).max(8000) });

const SYSTEM = `Je bent de assistent van Fantasy Coach, een onafhankelijke hulp voor fantasyvoetbal. Je bent niet verbonden aan een spelaanbieder.
Beantwoord de vraag van de gebruiker in kort, helder Nederlands (maximaal 120 woorden), uitsluitend op basis van de FEITEN die je krijgt.
Verzin nooit nieuws, citaten, blessures, opstellingen of cijfers die niet in de feiten staan. Als de feiten de vraag niet beantwoorden, zeg dat.
Noem een opstelling alleen "officieel" of "zeker" als de feiten dat zeggen. Een voorspelling blijft een voorspelling.`;

export async function GET() {
  return Response.json({ llm: Boolean(process.env.ANTHROPIC_API_KEY) });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Geen taalmodel geconfigureerd" }, { status: 501 });
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "Ongeldige invoer" }, { status: 400 });
  }
  const client = new Anthropic();
  try {
    const msg = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: `FEITEN:\n${body.facts}\n\nVRAAG:\n${body.question}` }],
    });
    if (msg.stop_reason === "refusal") return Response.json({ error: "Geen antwoord beschikbaar" }, { status: 422 });
    const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    return Response.json({ text });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "Even te druk, probeer het zo opnieuw" }, { status: 429 });
    if (e instanceof Anthropic.APIError) return Response.json({ error: "Taalmodel niet bereikbaar" }, { status: 502 });
    throw e;
  }
}
