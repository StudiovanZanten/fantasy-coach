"use client";
import { PageHeader } from "@/components/common/data-banner";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input, Segmented, Slider, Switch } from "@/components/ui/form";
import { useApp, type NotificationKind } from "@/state/store";
import { DEFAULT_PREFERENCES, type Preferences } from "@/engine/types";
import { Button } from "@/components/ui/button";

const WEIGHTS: { key: keyof Preferences; label: string }[] = [
  { key: "attackingFullbacks", label: "Aanvallende backs" },
  { key: "scoringMidfielders", label: "Scorende middenvelders" },
  { key: "trueStrikers", label: "Echte spitsen" },
  { key: "penaltyBonus", label: "Penaltynemers" },
  { key: "setPieceBonus", label: "Standaardsituaties" },
  { key: "nailedBonus", label: "Zekere basisspelers (90 minuten)" },
];

const NOTIFS: { kind: NotificationKind; label: string }[] = [
  { kind: "deadline", label: "Deadline nadert" },
  { kind: "lineup_published", label: "Officiële opstelling bekend" },
  { kind: "player_not_starting", label: "Mijn speler start niet" },
  { kind: "captain_not_starting", label: "Mijn captain start niet" },
  { kind: "injury", label: "Nieuwe blessure in mijn selectie" },
  { kind: "new_recommendation", label: "Nieuw advies" },
  { kind: "final_check", label: "Laatste controle (10 min voor deadline)" },
];
const GAMES = [
  { id: "topcoach-eredivisie", label: "TopCoach" },
  { id: "champ-coach", label: "Champ Coach" },
];

export default function Settings() {
  const { prefs, profile, theme, notifications, set } = useApp();
  const setPref = <K extends keyof Preferences>(k: K, v: Preferences[K]) => set((s) => ({ prefs: { ...s.prefs, [k]: v } }));
  return (
    <div className="space-y-4">
      <PageHeader title="Instellingen" subtitle="Je voorkeuren worden lokaal in deze browser bewaard." />
      <Card>
        <CardTitle>Profiel</CardTitle>
        <Field label="Naam">
          <Input value={profile?.name ?? ""} onChange={(e) => set((s) => ({ profile: { name: e.target.value, createdAt: s.profile?.createdAt ?? new Date().toISOString(), mode: "demo" } }))} />
        </Field>
        <div className="mt-3">
          <Segmented label="Thema" value={theme} onChange={(v) => set(() => ({ theme: v }))} options={[{ value: "dark", label: "Donker" }, { value: "light", label: "Licht" }]} />
        </div>
      </Card>
      <Card>
        <CardTitle>Risicoprofiel en planning</CardTitle>
        <Segmented
          label="Risicoprofiel"
          value={prefs.riskProfile}
          onChange={(v) => setPref("riskProfile", v)}
          options={[{ value: "safe", label: "Veilig" }, { value: "balanced", label: "Gebalanceerd" }, { value: "aggressive", label: "Aanvallend" }]}
        />
        <div className="mt-3 space-y-3">
          <Switch checked={prefs.onlyConfirmedStarters} onChange={(v) => setPref("onlyConfirmedStarters", v)} label="Alleen bevestigde basisspelers" description="Spelers zonder officiële basisplaats tellen niet mee zodra opstellingen bekend zijn." />
          <Slider label="Planningshorizon (rondes)" value={prefs.planningHorizon} min={1} max={8} step={1} onChange={(v) => setPref("planningHorizon", v)} format={(v) => String(v)} />
          <Slider label="Afwaardering toekomst per ronde" value={prefs.futureDiscount} min={0} max={0.3} step={0.01} onChange={(v) => setPref("futureDiscount", v)} format={(v) => `${Math.round(v * 100)}%`} />
        </div>
      </Card>
      <Card>
        <CardTitle>Voorkeuren (1 = neutraal)</CardTitle>
        <div className="space-y-3">
          {WEIGHTS.map((w) => (
            <Slider key={w.key} label={w.label} value={prefs[w.key] as number} onChange={(v) => setPref(w.key, v as never)} format={(v) => v.toFixed(1)} />
          ))}
        </div>
        <Button className="mt-3" variant="ghost" size="sm" onClick={() => set((s) => ({ prefs: { ...DEFAULT_PREFERENCES, favoritePlayerIds: s.prefs.favoritePlayerIds, blockedPlayerIds: s.prefs.blockedPlayerIds } }))}>
          Standaardwaarden herstellen
        </Button>
      </Card>
      <Card>
        <CardTitle>Meldingen</CardTitle>
        <p className="mb-2 text-sm text-[var(--color-muted)]">Voorbereid: de voorkeuren worden bewaard, maar pushmeldingen worden pas verstuurd als de meldingsdienst is gekoppeld (zie docs/TODO.md).</p>
        <div className="grid gap-4 md:grid-cols-2">
          {GAMES.map((g) => (
            <div key={g.id} className="space-y-2">
              <h3 className="text-sm font-semibold">{g.label}</h3>
              {NOTIFS.map((n) => (
                <Switch
                  key={n.kind}
                  label={n.label}
                  checked={notifications[g.id]?.[n.kind] ?? true}
                  onChange={(v) => set((s) => ({ notifications: { ...s.notifications, [g.id]: { ...s.notifications[g.id], [n.kind]: v } } }))}
                />
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
