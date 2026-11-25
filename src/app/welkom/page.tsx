"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { APP } from "@/config/app";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented } from "@/components/ui/form";
import { useApp } from "@/state/store";
import type { RiskProfile } from "@/engine/types";

const GAMES = [
  { id: "topcoach-eredivisie", label: "TopCoach", href: "/topcoach/selectie" },
  { id: "champ-coach", label: "Champ Coach", href: "/champcoach" },
];

export default function Welcome() {
  const router = useRouter();
  const set = useApp((s) => s.set);
  const [name, setName] = useState("");
  const [game, setGame] = useState(GAMES[0].id);
  const [risk, setRisk] = useState<RiskProfile>("balanced");
  const start = () => {
    set((s) => ({
      profile: { name: name.trim() || "Coach", createdAt: new Date().toISOString(), mode: "demo" },
      onboarded: true,
      activeGameId: game,
      prefs: { ...s.prefs, riskProfile: risk },
    }));
    router.push(GAMES.find((g) => g.id === game)!.href);
  };
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-4 py-10">
      <h1 className="font-display text-4xl font-extrabold">Welkom bij {APP.name}</h1>
      <p className="text-sm text-[var(--color-muted)]">Je hebt geen account nodig. Je gegevens blijven in deze browser. Je logt nergens in en we vragen nooit om wachtwoorden van een spelaanbieder.</p>
      <Field label="Hoe mogen we je noemen?"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" /></Field>
      <div>
        <p className="mb-1 text-sm font-medium">Waar wil je mee beginnen?</p>
        <Segmented label="Spel" value={game} onChange={setGame} options={GAMES.map((g) => ({ value: g.id, label: g.label }))} />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium">Hoeveel risico neem je?</p>
        <Segmented label="Risicoprofiel" value={risk} onChange={setRisk} options={[{ value: "safe", label: "Veilig" }, { value: "balanced", label: "Gebalanceerd" }, { value: "aggressive", label: "Aanvallend" }]} />
      </div>
      <Button size="lg" onClick={start}>Start</Button>
      <p className="text-xs text-[var(--color-muted)]">De app start met duidelijk gemarkeerde demodata en jouw testselectie uit de briefing. Je kunt alles later aanpassen.</p>
    </main>
  );
}
