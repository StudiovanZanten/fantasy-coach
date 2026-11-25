"use client";
import { useState } from "react";
import { PageHeader } from "@/components/common/data-banner";
import { Card, CardTitle, Notice } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/state/store";

export default function Privacy() {
  const reset = useApp((s) => s.reset);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const exportData = () => {
    const { set: _s, reset: _r, ...data } = useApp.getState();
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "fantasy-coach-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="space-y-4">
      <PageHeader title="Privacy en gegevens" />
      <Card>
        <CardTitle>Wat we bewaren</CardTitle>
        <ul className="list-disc space-y-1 pl-4 text-sm">
          <li>Je selectie, opstelling, gebruikte spelers, voorkeuren en eigen nieuwsnotities. In deze versie alleen in je eigen browser.</li>
          <li>Geen wachtwoorden of inloggegevens van spelaanbieders. Fantasy Coach logt nooit namens jou in.</li>
          <li>Voor de berekening stuurt je browser je selectie naar de eigen server van deze app; die bewaart niets.</li>
          <li>Alleen als er een taalmodel is ingesteld, gaan je vraag en de berekende feiten naar Anthropic om het antwoord te formuleren.</li>
        </ul>
      </Card>
      <Card>
        <CardTitle>Je gegevens</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportData}>Exporteer als JSON</Button>
          {!confirm ? (
            <Button variant="danger" onClick={() => setConfirm(true)}>Alles verwijderen</Button>
          ) : (
            <>
              <Button variant="danger" onClick={() => { reset(); setConfirm(false); setDone(true); }}>Ja, verwijder alles</Button>
              <Button variant="ghost" onClick={() => setConfirm(false)}>Annuleren</Button>
            </>
          )}
        </div>
        {confirm && <p className="mt-2 text-sm text-[var(--color-warn)]">Dit wist al je lokale gegevens in deze browser. Dit kan niet ongedaan worden gemaakt; exporteer eerst als je ze wilt bewaren.</p>}
        {done && <Notice tone="ok">Alle gegevens zijn verwijderd en de app staat weer op de beginwaarden.</Notice>}
      </Card>
    </div>
  );
}
