"use client";
import { useState } from "react";
import { DataBanner, PageHeader } from "@/components/common/data-banner";
import { useIndex } from "@/components/providers/game-data";
import { Card, CardTitle, EmptyState, Notice } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { useApp, type NewsItem } from "@/state/store";
import { useSquadIds } from "@/lib/client/topcoach";
import { fmtDateTime } from "@/lib/utils";

const TYPE_LABEL: Record<NewsItem["type"], string> = { injury: "Blessure", lineup: "Opstelling", training: "Training", suspension: "Schorsing", transfer: "Transfer", other: "Overig" };
const KIND_LABEL: Record<NewsItem["sourceKind"], string> = { official: "Officieel (club/competitie)", secondary: "Media", statistics: "Statistiekbron", manual: "Eigen notitie" };

/**
 * Nieuwscentrum. Er zijn nog geen nieuwsbronnen gekoppeld: Fantasy Coach verzint geen nieuws.
 * Je kunt zelf berichten met bron vastleggen; die worden dan bij de speler getoond.
 */
export default function NewsPage() {
  const idx = useIndex();
  const news = useApp((s) => s.news);
  const set = useApp((s) => s.set);
  const { keyOf } = useSquadIds();
  const squad = [...keyOf.keys()].map((id) => idx.players.get(id)!).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  const empty = { title: "", url: "", source: "", playerId: "", type: "other" as NewsItem["type"], sourceKind: "secondary" as NewsItem["sourceKind"], reliability: "medium" as NewsItem["reliability"], publishedAt: "" };
  const [form, setForm] = useState(empty);
  const validUrl = !form.url || /^https:\/\/[^\s]+$/.test(form.url);
  const canSave = form.title.trim() && form.source.trim() && validUrl && form.publishedAt;

  const save = () => {
    const item: NewsItem = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      url: form.url.trim(),
      source: form.source.trim(),
      playerId: form.playerId || undefined,
      type: form.type,
      sourceKind: form.sourceKind,
      reliability: form.reliability,
      publishedAt: new Date(form.publishedAt).toISOString(),
      fetchedAt: new Date().toISOString(),
    };
    set((s) => ({ news: [item, ...s.news] }));
    setForm(empty);
  };

  return (
    <div className="space-y-4">
      <DataBanner />
      <PageHeader title="Nieuwscentrum" subtitle="Ieder bericht met bron, publicatietijd en betrouwbaarheid." />
      <Notice>
        Er zijn nog geen automatische nieuwsbronnen gekoppeld. Fantasy Coach verzint geen nieuws, blessures of citaten. Leg zelf een bericht vast met de bron erbij; zie docs/07-RESEARCH.md voor de bronnen die we later kunnen koppelen.
      </Notice>
      <Card>
        <CardTitle>Bericht vastleggen</CardTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Kop of samenvatting"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Bron (bijv. clubwebsite)"><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></Field>
          <Field label="Link (https)" hint={!validUrl ? "Gebruik een https-link." : undefined}><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} inputMode="url" /></Field>
          <Field label="Gepubliceerd op"><Input type="datetime-local" value={form.publishedAt} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} /></Field>
          <Field label="Speler">
            <Select value={form.playerId} onChange={(e) => setForm({ ...form, playerId: e.target.value })}>
              <option value="">Algemeen</option>
              {squad.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Soort">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as NewsItem["type"] })}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Type bron">
            <Select value={form.sourceKind} onChange={(e) => setForm({ ...form, sourceKind: e.target.value as NewsItem["sourceKind"] })}>
              {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Betrouwbaarheid">
            <Select value={form.reliability} onChange={(e) => setForm({ ...form, reliability: e.target.value as NewsItem["reliability"] })}>
              <option value="high">Hoog</option><option value="medium">Gemiddeld</option><option value="low">Laag (gerucht)</option>
            </Select>
          </Field>
        </div>
        <Button className="mt-3" onClick={save} disabled={!canSave}>Opslaan</Button>
      </Card>
      {news.length === 0 ? (
        <EmptyState title="Nog geen berichten" />
      ) : (
        <ul className="space-y-2">
          {news.map((n) => (
            <li key={n.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                  <span className="rounded-full border border-[var(--color-border)] px-2">{TYPE_LABEL[n.type]}</span>
                  <span>{KIND_LABEL[n.sourceKind]}</span>
                  <span>· betrouwbaarheid {n.reliability === "high" ? "hoog" : n.reliability === "medium" ? "gemiddeld" : "laag"}</span>
                  {n.playerId && <span>· {idx.players.get(n.playerId)?.name}</span>}
                </div>
                <p className="mt-1 font-semibold">{n.title}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {n.source} · gepubliceerd {fmtDateTime(n.publishedAt)} · vastgelegd {fmtDateTime(n.fetchedAt)}
                  {n.url && (<> · <a className="underline" href={n.url} target="_blank" rel="noopener noreferrer">bron</a></>)}
                </p>
                <button className="mt-1 text-xs text-[var(--color-muted)] underline" onClick={() => set((s) => ({ news: s.news.filter((x) => x.id !== n.id) }))}>verwijderen</button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
