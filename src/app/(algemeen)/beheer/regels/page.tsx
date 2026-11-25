"use client";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/data-banner";
import { Card, CardTitle, Notice } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { getGame } from "@/games/registry";
import { parseRuleSet, type RuleSet } from "@/engine/rules/schema";
import { useApp } from "@/state/store";

const GAMES = ["topcoach-eredivisie", "champ-coach", "wk-darts"];
const POS = ["GK", "DEF", "MID", "FWD"] as const;
const SCORING_ROWS: { key: string; label: string }[] = [
  { key: "goal", label: "Doelpunt" },
  { key: "assist", label: "Assist" },
  { key: "minutesPoints", label: "Speeltijd (boven grens)" },
  { key: "win", label: "Winst" },
  { key: "draw", label: "Gelijkspel" },
  { key: "cleanSheet", label: "De nul" },
  { key: "penaltySaved", label: "Penalty gestopt" },
];
const SINGLE_ROWS: { key: string; label: string }[] = [
  { key: "minutesThreshold", label: "Grens speeltijd (min)" },
  { key: "yellow", label: "Gele kaart" },
  { key: "red", label: "Rode kaart" },
  { key: "penaltyMissed", label: "Penalty gemist" },
  { key: "ownGoal", label: "Eigen doelpunt" },
  { key: "hattrickBonus", label: "Hattrick-bonus" },
];

/** Spelregels aanpassen zonder code. Wijzigingen worden gevalideerd en lokaal opgeslagen. */
export default function RulesEditor() {
  const overrides = useApp((s) => s.ruleOverrides);
  const set = useApp((s) => s.set);
  const [gameId, setGameId] = useState(GAMES[0]);
  const game = getGame(gameId)!;
  const current = (overrides[gameId] as RuleSet | undefined) ?? game.defaultRules;
  const [draft, setDraft] = useState<RuleSet>(structuredClone(current));
  const [json, setJson] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const result = useMemo(() => {
    if (json !== null) {
      try {
        return parseRuleSet(JSON.parse(json));
      } catch {
        return { ok: false as const, errors: ["Geen geldige JSON"] };
      }
    }
    return parseRuleSet(draft);
  }, [draft, json]);

  const switchGame = (id: string) => {
    setGameId(id);
    setDraft(structuredClone((overrides[id] as RuleSet | undefined) ?? getGame(id)!.defaultRules));
    setJson(null);
    setSaved(false);
  };
  const upd = (fn: (r: RuleSet) => void) => {
    const next = structuredClone(draft);
    fn(next);
    setDraft(next);
    setSaved(false);
  };
  const fb = draft.scoring.football as Record<string, unknown> | undefined;
  const cell = (key: string, pos: (typeof POS)[number]) => {
    const v = fb?.[key];
    return typeof v === "number" ? v : (v as Record<string, number> | undefined)?.[pos] ?? 0;
  };
  const numIn = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div className="space-y-4">
      <PageHeader title="Spelregels" subtitle="Pas de regels aan als de aanbieder iets wijzigt. Alles wordt eerst gecontroleerd." />
      <Field label="Spel">
        <Select value={gameId} onChange={(e) => switchGame(e.target.value)}>
          {GAMES.map((id) => <option key={id} value={id}>{getGame(id)?.name}</option>)}
        </Select>
      </Field>
      <Notice tone={draft.verification.status === "verified" ? "ok" : "warn"}>
        Status: {draft.verification.status === "verified" ? "gecontroleerd" : "nog niet gecontroleerd met de officiële spelregels"}. {draft.verification.notes}
      </Notice>
      {json === null ? (
        <>
          <Card>
            <CardTitle>Algemeen</CardTitle>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Budget (mln, leeg = geen)"><Input inputMode="decimal" value={draft.budget ?? ""} onChange={(e) => upd((r) => { r.budget = e.target.value === "" ? null : Number(e.target.value); })} /></Field>
              <Field label="Max. spelers per club"><Input inputMode="numeric" value={draft.maxPerClub ?? ""} onChange={(e) => upd((r) => { r.maxPerClub = e.target.value === "" ? null : Number(e.target.value); })} /></Field>
              <Field label="Captain-multiplier"><Input inputMode="decimal" value={draft.captain.multiplier} onChange={(e) => upd((r) => { r.captain.multiplier = numIn(e.target.value); })} /></Field>
              <Field label="Tijdsloten (komma-gescheiden)"><Input value={draft.timeSlots.join(", ")} onChange={(e) => upd((r) => { r.timeSlots = e.target.value.split(",").map((x) => x.trim()).filter(Boolean); })} /></Field>
              <Field label="Eenmalig gebruik per fase">
                <Select value={draft.usage.oncePerPhase ? "ja" : "nee"} onChange={(e) => upd((r) => { r.usage.oncePerPhase = e.target.value === "ja"; })}>
                  <option value="ja">Ja</option><option value="nee">Nee</option>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={draft.verification.status} onChange={(e) => upd((r) => { r.verification.status = e.target.value as RuleSet["verification"]["status"]; })}>
                  <option value="unverified">Niet gecontroleerd</option><option value="verified">Gecontroleerd</option>
                </Select>
              </Field>
            </div>
          </Card>
          {fb && (
            <Card>
              <CardTitle>Puntentelling</CardTitle>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="text-left text-xs text-[var(--color-muted)]"><tr><th className="py-1">Actie</th>{POS.map((p) => <th key={p} className="py-1">{p}</th>)}</tr></thead>
                  <tbody>
                    {SCORING_ROWS.map((row) => (
                      <tr key={row.key}>
                        <td className="py-1 pr-2">{row.label}</td>
                        {POS.map((pos) => (
                          <td key={pos} className="py-1 pr-2">
                            <Input
                              aria-label={`${row.label} ${pos}`}
                              inputMode="numeric"
                              value={cell(row.key, pos)}
                              onChange={(e) => upd((r) => {
                                const s = r.scoring.football as Record<string, unknown>;
                                const prev = s[row.key];
                                const obj = typeof prev === "number" ? { GK: prev, DEF: prev, MID: prev, FWD: prev } : { ...(prev as Record<string, number>) };
                                obj[pos] = numIn(e.target.value);
                                s[row.key] = obj;
                              })}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {SINGLE_ROWS.map((row) => (
                  <Field key={row.key} label={row.label}>
                    <Input inputMode="numeric" value={(fb[row.key] as number | undefined) ?? 0} onChange={(e) => upd((r) => { (r.scoring.football as Record<string, unknown>)[row.key] = numIn(e.target.value); })} />
                  </Field>
                ))}
              </div>
            </Card>
          )}
          <Button variant="ghost" size="sm" onClick={() => setJson(JSON.stringify(draft, null, 2))}>Geavanceerd: bewerk als JSON</Button>
        </>
      ) : (
        <Card>
          <CardTitle>JSON</CardTitle>
          <textarea aria-label="Spelregels als JSON" className="h-[420px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 font-mono text-xs" value={json} onChange={(e) => { setJson(e.target.value); setSaved(false); }} />
          <Button variant="ghost" size="sm" onClick={() => { if (result.ok) setDraft(result.rules); setJson(null); }} disabled={!result.ok}>Terug naar formulier</Button>
        </Card>
      )}
      {!result.ok && (
        <Notice tone="bad"><ul className="list-disc pl-4">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul></Notice>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!result.ok} onClick={() => { if (result.ok) { set((s) => ({ ruleOverrides: { ...s.ruleOverrides, [gameId]: result.rules } })); setSaved(true); } }}>Opslaan</Button>
        <Button variant="secondary" onClick={() => { set((s) => { const o = { ...s.ruleOverrides }; delete o[gameId]; return { ruleOverrides: o }; }); setDraft(structuredClone(game.defaultRules)); setJson(null); setSaved(false); }}>Standaardregels herstellen</Button>
      </div>
      {saved && <Notice tone="ok">Opgeslagen. Alle adviezen voor {game.name} gebruiken nu deze regels.</Notice>}
    </div>
  );
}
