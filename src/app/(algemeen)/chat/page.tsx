"use client";
import { useEffect, useRef, useState } from "react";
import { DataBanner, PageHeader } from "@/components/common/data-banner";
import { useBundle, useIndex, useNow } from "@/components/providers/game-data";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { useTopCoachAdvice } from "@/lib/client/topcoach";
import { useChampRecommend, usePlanRound } from "@/lib/client/champcoach";
import type { TopCoachAdvice } from "@/engine/recommend/topcoach";
import type { Recommendation } from "@/engine/recommend/football";
import type { DatasetIndex } from "@/engine/recommend/dataset";
import { useApp } from "@/state/store";
import { countdown, fmtDateTime, num, pct } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; text: string; source?: "engine" | "llm" };
const BALANCED = ["balanced" as const];

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

/** Zoekt een spelersnaam in de vraag (volledige naam of achternaam van minstens 4 letters). */
function findPlayer(q: string, idx: DatasetIndex, among?: string[]): string | undefined {
  const ids = among ?? idx.ds.players.map((p) => p.id);
  let best: { id: string; len: number } | undefined;
  for (const id of ids) {
    const name = idx.players.get(id)?.name.toLowerCase();
    if (!name) continue;
    const last = name.split(" ").slice(-1)[0];
    const hit = q.includes(name) ? name.length : last.length >= 4 && q.includes(last) ? last.length : 0;
    if (hit && (!best || hit > best.len)) best = { id, len: hit };
  }
  return best?.id;
}

function answerTopCoach(q: string, a: TopCoachAdvice, idx: DatasetIndex, now: Date, applied: { at: string; text: string }[]): string {
  const name = (id?: string) => (id ? idx.players.get(id)?.name ?? id : "–");
  const squad = Object.keys(a.projections);
  if (has(q, "doorgevoerd", "toegepast", "gedaan")) {
    if (!applied.length) return "Je hebt nog niets als ‘doorgevoerd’ gemarkeerd. Alles wat je ziet is alleen advies.";
    return "Dit heb je zelf doorgevoerd:\n" + applied.slice(0, 5).map((l) => `• ${fmtDateTime(l.at)}: ${l.text}`).join("\n");
  }
  if (has(q, "gouden", "golden")) return a.goldenSubs?.advice ?? "Gouden Wissels zijn in deze ronde niet van toepassing.";
  if (has(q, "captain", "aanvoerder")) {
    const c = a.captainCandidates;
    if (!c.length) return "Ik heb geen captainkandidaten kunnen berekenen.";
    return `Beste captain${a.isSuperWeekend ? " (Super Weekend, 300%)" : ""}: ${name(c[0].playerId)} met ${c[0].captainPoints} xSP als captain (${c[0].label}).` +
      (c.length > 1 ? `\nAlternatieven: ${c.slice(1).map((x) => `${name(x.playerId)} (${x.captainPoints})`).join(", ")}.` : "");
  }
  if (has(q, "deadline", "hoe laat", "wanneer")) return a.deadlinePassed ? `De deadline (${fmtDateTime(a.deadline)}) is verstreken.` : `De deadline is ${fmtDateTime(a.deadline)}, nog ${countdown(a.deadline, now)}.`;
  const pid = findPlayer(q, idx, squad) ?? findPlayer(q, idx);
  if (pid) {
    const p = a.projections[pid];
    const risk = a.risks.find((r) => r.playerId === pid);
    if (!p) return `${name(pid)} heeft in deze ronde geen wedstrijd of is niet gekoppeld aan een club.`;
    return `${name(pid)}: ${p.summary}\nVerwacht ${num(p.ev, 1)} xSP, basiskans ${pct(p.startProb)}, ± ${p.minutes?.expMinutes ?? "?"} minuten.` + (risk ? `\nRisico: ${risk.reason}${risk.official ? " (officieel)" : " (voorspelling)"}` : "") + (squad.includes(pid) ? "" : "\nLet op: deze speler zit niet in je selectie.");
  }
  if (has(q, "risico", "blessure", "start", "fit", "twijfel")) {
    const r = a.risks.filter((x) => x.level !== "green");
    if (!r.length) return "Geen bijzondere risico’s in je selectie op dit moment.";
    return "Risico’s in je selectie:\n" + r.map((x) => `• ${name(x.playerId)}: ${x.reason}${x.official ? " (officieel)" : ""}`).join("\n");
  }
  if (has(q, "opstelling", "formatie", "basis", "bank", "wissel", "advies", "team")) {
    const changes = a.changes.map((c) => `• ${name(c.playerId)}: ${c.from} → ${c.to}`).join("\n");
    return `${a.headline}${a.ideal ? `\nBeste formatie: ${a.ideal.formation} (${num(a.ideal.expectedPoints)} xSP).` : ""}${changes ? `\nWijzigingen:\n${changes}` : ""}`;
  }
  return "";
}

function answerChamp(q: string, r: Recommendation, idx: DatasetIndex): string {
  const name = (id?: string) => (id ? idx.players.get(id)?.name ?? id : "–");
  if (has(q, "bewaar", "later", "sparen")) return r.saved.length ? "Bewaaradvies:\n" + r.saved.slice(0, 5).map((s) => `• ${s.reason}`).join("\n") : "Geen spelers die je beter kunt bewaren.";
  if (has(q, "captain", "aanvoerder")) return r.captain ? `Captain: ${name(r.captain.playerId)}. ${r.captain.reason}` : "Geen captain bepaald.";
  if (has(q, "wedstrijd", "fixture", "duel")) return "Beste wedstrijden:\n" + r.bestFixtures.slice(0, 4).map((f) => `• ${f.text}`).join("\n");
  const pid = findPlayer(q, idx);
  if (pid) {
    const pick = r.picks.find((p) => p.playerId === pid);
    if (pick) return `${name(pid)} zit in het advies. ${pick.reason}${pick.lostFuture ? `\nWat je later verliest: ${pick.lostFuture.text}` : ""}`;
    const later = r.futurePlan.find((f) => f.playerIds.includes(pid));
    return later ? `${name(pid)} bewaart de planner voor ronde ${idx.rounds.get(later.roundId)?.shortName}.` : `${name(pid)} zit niet in het advies voor deze ronde of het plan daarna.`;
  }
  if (has(q, "team", "advies", "opstelling", "kies", "wie")) return `${r.headline}\nTeam: ${r.playerIds.map((id) => (id === r.captainId ? `${name(id)} (C)` : name(id))).join(", ")}.\nVerwacht ${num(r.expectedPoints)} punten.`;
  return "";
}

export default function ChatPage() {
  const bundle = useBundle();
  const idx = useIndex();
  const now = useNow();
  const applied = useApp((s) => s.topcoach.appliedLog);
  const isTop = bundle.gameId === "topcoach-eredivisie";
  const isChamp = bundle.gameId === "champ-coach";
  const top = useTopCoachAdvice({ enabled: isTop });
  const planRound = usePlanRound();
  const champ = useChampRecommend(isChamp ? planRound : undefined, BALANCED);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [llm, setLlm] = useState(false);
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat").then((r) => r.json()).then((j) => setLlm(Boolean(j.llm))).catch(() => setLlm(false));
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const ready = isTop ? Boolean(top.data) : isChamp ? Boolean(champ.data) : false;
  const examples = isTop
    ? ["Wie moet mijn captain zijn?", "Welke spelers zijn een risico?", "Moet ik een Gouden Wissel gebruiken?", "Hoe staat Pepi ervoor?", "Wat heb ik doorgevoerd?"]
    : ["Welk team adviseer je?", "Wie moet captain zijn?", "Welke spelers moet ik bewaren?", "Wat zijn de beste wedstrijden?"];

  const ask = async (question: string) => {
    const q = question.toLowerCase();
    let facts = "";
    if (isTop && top.data) facts = answerTopCoach(q, top.data.advice, idx, now, applied);
    if (isChamp && champ.data?.recommendations.balanced) facts = answerChamp(q, champ.data.recommendations.balanced, idx);
    if (!isTop && !isChamp) facts = "De assistent werkt voor TopCoach en Champ Coach. Kies een van die spellen.";
    const fallback = `Dat kan ik nog niet beantwoorden. Ik weet het antwoord alleen als het uit de eigen berekeningen komt. Probeer bijvoorbeeld: ${examples.slice(0, 3).join(" · ")}`;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    if (!facts) return setMsgs((m) => [...m, { role: "assistant", text: fallback, source: "engine" }]);
    if (!llm) return setMsgs((m) => [...m, { role: "assistant", text: facts, source: "engine" }]);
    setBusy(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, facts }) });
      const j = await r.json();
      setMsgs((m) => [...m, r.ok ? { role: "assistant", text: j.text, source: "llm" } : { role: "assistant", text: facts, source: "engine" }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: facts, source: "engine" }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col space-y-3">
      <DataBanner />
      <PageHeader title="Assistent" subtitle={`Vragen over ${isTop ? "TopCoach" : isChamp ? "Champ Coach" : "dit spel"}. Antwoorden komen uit de eigen berekeningen; er wordt niets verzonnen.`} />
      {!llm && <Notice>De assistent draait zonder taalmodel: je krijgt de feitelijke uitkomst van de berekening. Met een ANTHROPIC_API_KEY op de server worden antwoorden natuurlijker geformuleerd.</Notice>}
      <div className="flex-1 space-y-2" aria-live="polite">
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {examples.map((e) => (
              <button key={e} disabled={!ready} onClick={() => ask(e)} className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-50">
                {e}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-2xl bg-[var(--color-accent)]/20 px-3 py-2 text-sm" : "max-w-[90%] whitespace-pre-line rounded-2xl bg-[var(--color-surface)] px-3 py-2 text-sm"}>
            {m.text}
            {m.role === "assistant" && <div className="mt-1 text-[10px] text-[var(--color-muted)]">{m.source === "llm" ? "Geformuleerd door Claude op basis van de berekening" : "Uit de berekening"}</div>}
          </div>
        ))}
        {busy && <div className="text-sm text-[var(--color-muted)]">Bezig…</div>}
        <div ref={end} />
      </div>
      <form
        className="sticky bottom-20 flex gap-2 md:bottom-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || !ready) return;
          ask(input.trim());
          setInput("");
        }}
      >
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={ready ? "Stel je vraag…" : "Berekening laden…"} aria-label="Vraag" />
        <Button type="submit" disabled={!ready || busy}>Vraag</Button>
      </form>
    </div>
  );
}
