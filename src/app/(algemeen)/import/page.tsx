"use client";
import { useState } from "react";
import Papa from "papaparse";
import { PageHeader } from "@/components/common/data-banner";
import { Card, CardTitle, Notice } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form";
import { useIndex } from "@/components/providers/game-data";
import { useApp } from "@/state/store";
import { slug } from "@/data/seed/rng";
import type { UserPlayerEntry } from "@/data/identity";

type Row = { name: string; position?: string; round?: string };
const POS_MAP: Record<string, UserPlayerEntry["position"]> = { gk: "GK", k: "GK", keeper: "GK", doelman: "GK", def: "DEF", v: "DEF", verdediger: "DEF", mid: "MID", m: "MID", middenvelder: "MID", fwd: "FWD", a: "FWD", aanvaller: "FWD", spits: "FWD" };

function parse(text: string): Row[] {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith("[") || t.startsWith("{")) {
    const j = JSON.parse(t);
    const arr = Array.isArray(j) ? j : j.players ?? [];
    return arr.map((x: Record<string, string>) => ({ name: String(x.name ?? x.naam ?? "").trim(), position: x.position ?? x.positie, round: x.round ?? x.ronde })).filter((r: Row) => r.name);
  }
  const res = Papa.parse<Record<string, string>>(t, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
  return res.data.map((x) => ({ name: (x.name ?? x.naam ?? "").trim(), position: x.position ?? x.positie, round: x.round ?? x.ronde })).filter((r) => r.name);
}

/** Importeren uit CSV of JSON. Je controleert altijd zelf voordat er iets wordt overgenomen. */
export default function ImportPage() {
  const idx = useIndex();
  const set = useApp((s) => s.set);
  const [target, setTarget] = useState<"topcoach" | "champcoach">("topcoach");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const preview = () => {
    setDone(null);
    try {
      setRows(parse(text));
      setErr(null);
    } catch {
      setErr("Kon het bestand niet lezen. Gebruik CSV met kolommen naam,positie(,ronde) of een JSON-lijst.");
      setRows(null);
    }
  };
  const posOf = (r: Row) => POS_MAP[(r.position ?? "").toLowerCase().trim()] ?? (["GK", "DEF", "MID", "FWD"].includes((r.position ?? "").toUpperCase()) ? (r.position!.toUpperCase() as UserPlayerEntry["position"]) : undefined);
  const findId = (name: string) => idx.ds.players.find((p) => p.name.toLowerCase() === name.toLowerCase())?.id;
  const roundOf = (r: Row) => idx.ds.rounds.find((x) => x.shortName.toLowerCase() === (r.round ?? "").toLowerCase() || x.id === r.round)?.id;

  const apply = () => {
    if (!rows) return;
    if (target === "topcoach") {
      const entries: UserPlayerEntry[] = rows.filter(posOf).map((r) => ({ key: slug(r.name), input: r.name, position: posOf(r)!, confirmed: false }));
      set((s) => ({ topcoach: { ...s.topcoach, entries, starters: [], bench: [], captainKey: undefined } }));
      setDone(`${entries.length} spelers als selectie overgenomen. Koppel en bevestig ze op ‘Mijn selectie’ en zet daar je opstelling.`);
    } else {
      const used = rows.map((r) => ({ playerId: findId(r.name), roundId: roundOf(r) })).filter((u): u is { playerId: string; roundId: string } => Boolean(u.playerId && u.roundId));
      set((s) => ({ champcoach: { ...s.champcoach, used: [...s.champcoach.used.filter((u) => !used.some((x) => x.playerId === u.playerId)), ...used] } }));
      setDone(`${used.length} gebruikte spelers overgenomen.`);
    }
    setRows(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Importeren" subtitle="Zet je selectie of gebruikte spelers in één keer over." />
      <Card>
        <Field label="Wat importeer je?">
          <Select value={target} onChange={(e) => { setTarget(e.target.value as typeof target); setRows(null); }}>
            <option value="topcoach">TopCoach-selectie (naam, positie)</option>
            <option value="champcoach">Champ Coach gebruikte spelers (naam, ronde)</option>
          </Select>
        </Field>
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Voorbeeld CSV: {target === "topcoach" ? "naam,positie ↵ Ricardo Pepi,FWD" : "naam,ronde ↵ Harry Kane,1A"}. Het actieve spel bepaalt welke spelerslijst gebruikt wordt; open eerst {target === "topcoach" ? "TopCoach" : "Champ Coach"} in het menu.
        </p>
        <input
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="mt-3 block text-sm"
          aria-label="Bestand kiezen"
          onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }}
        />
        <textarea aria-label="Of plak de inhoud" className="mt-2 h-40 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder="…of plak hier de inhoud" />
        <Button className="mt-2" variant="secondary" onClick={preview} disabled={!text.trim()}>Voorbeeld bekijken</Button>
        {err && <Notice tone="bad">{err}</Notice>}
      </Card>
      {rows && (
        <Card>
          <CardTitle>Controleer voordat je overneemt ({rows.length} regels)</CardTitle>
          <ul className="max-h-80 divide-y divide-[var(--color-border)] overflow-y-auto text-sm">
            {rows.map((r, i) => {
              const ok = target === "topcoach" ? Boolean(posOf(r)) : Boolean(findId(r.name) && roundOf(r));
              return (
                <li key={i} className="flex justify-between py-1.5">
                  <span>{r.name}</span>
                  <span className={ok ? "text-[var(--color-ok)]" : "text-[var(--color-bad)]"}>
                    {target === "topcoach" ? posOf(r) ?? "positie onbekend" : !findId(r.name) ? "speler niet gevonden" : !roundOf(r) ? "ronde onbekend" : "ok"}
                  </span>
                </li>
              );
            })}
          </ul>
          <Button className="mt-3" onClick={apply}>Overnemen</Button>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Regels met een rode melding worden overgeslagen.</p>
        </Card>
      )}
      {done && <Notice tone="ok">{done}</Notice>}
      <Card>
        <CardTitle>Screenshot herkennen (komt later)</CardTitle>
        <p className="text-sm text-[var(--color-muted)]">
          Tekstherkenning van een screenshot van je team is voorbereid maar nog niet actief. Als het er is, zie je eerst wat er herkend is en bevestig je zelf voordat er iets wordt overgenomen.
        </p>
      </Card>
    </div>
  );
}
