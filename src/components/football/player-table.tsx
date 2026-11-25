"use client";
import { useMemo, useState } from "react";
import type { PlayerProjection, Position } from "@/engine/types";
import { AVAILABILITY_LABEL } from "@/engine/types";
import { useIndex } from "@/components/providers/game-data";
import { StatusBadge, Pill } from "@/components/ui/badge";
import { Input, Select, Switch } from "@/components/ui/form";
import { cn, num, pct } from "@/lib/utils";
import { useApp } from "@/state/store";
import { Ban, Star } from "lucide-react";

type SortKey = "score" | "ev" | "price" | "start" | "form";

/** Scoutingsranglijst met filters en uitleg per speler. */
export function PlayerTable({ projections, highlight, highlightLabel, usedIds }: { projections: PlayerProjection[]; highlight?: (id: string) => boolean; highlightLabel?: string; usedIds?: Set<string> }) {
  const idx = useIndex();
  const prefs = useApp((s) => s.prefs);
  const set = useApp((s) => s.set);
  const [pos, setPos] = useState<Position | "">("");
  const [club, setClub] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [penalty, setPenalty] = useState(false);
  const [setPieces, setSetPieces] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    let r = projections.map((p) => ({ p, pl: idx.players.get(p.playerId)! })).filter((x) => x.pl);
    if (pos) r = r.filter((x) => x.pl.position === pos);
    if (club) r = r.filter((x) => x.pl.clubId === club);
    if (q) r = r.filter((x) => x.pl.name.toLowerCase().includes(q.toLowerCase()));
    if (onlyAvailable) r = r.filter((x) => x.p.available);
    if (penalty) r = r.filter((x) => x.pl.roles.includes("penalty_1"));
    if (setPieces) r = r.filter((x) => x.pl.roles.includes("freekick") || x.pl.roles.includes("corner"));
    const key: Record<SortKey, (x: (typeof r)[number]) => number> = {
      score: (x) => x.p.score,
      ev: (x) => x.p.ev,
      price: (x) => x.pl.price,
      start: (x) => x.p.startProb,
      form: (x) => (x.pl.stats.kind === "football" ? x.pl.stats.form : 0),
    };
    return r.sort((a, b) => key[sort](b) - key[sort](a)).slice(0, 150);
  }, [projections, idx, pos, club, q, sort, onlyAvailable, penalty, setPieces]);

  const toggle = (list: "favoritePlayerIds" | "blockedPlayerIds", id: string) =>
    set((s) => ({ prefs: { ...s.prefs, [list]: s.prefs[list].includes(id) ? s.prefs[list].filter((x) => x !== id) : [...s.prefs[list], id] } }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Input placeholder="Zoek speler" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Zoek speler" />
        <Select aria-label="Positie" value={pos} onChange={(e) => setPos(e.target.value as Position | "")}>
          <option value="">Alle posities</option>
          <option value="GK">Keepers</option>
          <option value="DEF">Verdedigers</option>
          <option value="MID">Middenvelders</option>
          <option value="FWD">Aanvallers</option>
        </Select>
        <Select aria-label="Club" value={club} onChange={(e) => setClub(e.target.value)}>
          <option value="">Alle clubs</option>
          {idx.ds.clubs.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select aria-label="Sorteer" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="score">Aanbevelingsscore</option>
          <option value="ev">Verwachte punten</option>
          <option value="start">Basiszekerheid</option>
          <option value="form">Vorm</option>
          <option value="price">Prijs</option>
        </Select>
        <div className="col-span-2 flex flex-wrap gap-x-4 md:col-span-1">
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={penalty} onChange={(e) => setPenalty(e.target.checked)} /> Penalty</label>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={setPieces} onChange={(e) => setSetPieces(e.target.checked)} /> Spelhervatting</label>
        </div>
      </div>
      <Switch checked={onlyAvailable} onChange={setOnlyAvailable} label="Alleen beschikbare spelers" />
      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[var(--color-surface-2)] text-left text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2">Speler</th>
              <th className="px-2 py-2">Wedstrijd</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2 text-right">Basis</th>
              <th className="px-2 py-2 text-right">Min.</th>
              <th className="px-2 py-2 text-right">xG</th>
              <th className="px-2 py-2 text-right">xA</th>
              <th className="px-2 py-2 text-right">Verwacht</th>
              <th className="px-2 py-2 text-right">Bereik</th>
              <th className="px-2 py-2 text-right">Score</th>
              <th className="px-2 py-2 text-right">Prijs</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, pl }) => {
              const c = idx.clubs.get(pl.clubId ?? "");
              const o = p.opponentId ? idx.clubs.get(p.opponentId) : undefined;
              const isOpen = open === p.playerId;
              return [
                <tr key={p.playerId} className={cn("cursor-pointer border-t border-[var(--color-border)] hover:bg-[var(--color-surface-2)]", highlight?.(p.playerId) && "bg-emerald-500/5")} onClick={() => setOpen(isOpen ? null : p.playerId)}>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{pl.name}</div>
                    <div className="flex flex-wrap gap-1 text-xs text-[var(--color-muted)]">
                      {pl.position} · {c?.shortName}
                      {highlight?.(p.playerId) && <Pill className="text-emerald-300">{highlightLabel}</Pill>}
                      {usedIds?.has(p.playerId) && <Pill className="text-red-300">gebruikt</Pill>}
                      {pl.availability.status !== "fit" && <Pill className="text-orange-300">{AVAILABILITY_LABEL[pl.availability.status]}</Pill>}
                      {pl.placeholder && <Pill>placeholder</Pill>}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-xs">{o ? `${p.isHome ? "vs" : "@"} ${o.shortName}` : "–"}</td>
                  <td className="px-2 py-2"><StatusBadge status={p.status} size="sm" /></td>
                  <td className="px-2 py-2 text-right tabular">{pct(p.minutes?.pStart ?? p.startProb)}</td>
                  <td className="px-2 py-2 text-right tabular">{p.minutes?.expMinutes ?? "–"}</td>
                  <td className="px-2 py-2 text-right tabular">{num(p.xGoals, 2)}</td>
                  <td className="px-2 py-2 text-right tabular">{num(p.xAssists, 2)}</td>
                  <td className="px-2 py-2 text-right font-bold tabular">{num(p.ev, 1)}</td>
                  <td className="px-2 py-2 text-right text-xs tabular text-[var(--color-muted)]">{num(p.floor)}–{num(p.ceiling)}</td>
                  <td className="px-2 py-2 text-right tabular">{num(p.score, 1)}</td>
                  <td className="px-2 py-2 text-right tabular">{num(pl.price, 1)}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button aria-label={`Favoriet ${pl.name}`} aria-pressed={prefs.favoritePlayerIds.includes(pl.id)} onClick={() => toggle("favoritePlayerIds", pl.id)} className={prefs.favoritePlayerIds.includes(pl.id) ? "text-yellow-400" : "text-[var(--color-muted)]"}>
                        <Star className="h-4 w-4" />
                      </button>
                      <button aria-label={`Blokkeer ${pl.name}`} aria-pressed={prefs.blockedPlayerIds.includes(pl.id)} onClick={() => toggle("blockedPlayerIds", pl.id)} className={prefs.blockedPlayerIds.includes(pl.id) ? "text-red-400" : "text-[var(--color-muted)]"}>
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>,
                isOpen && (
                  <tr key={`${p.playerId}-x`} className="bg-[var(--color-surface-2)]">
                    <td colSpan={12} className="px-3 py-3">
                      <p className="mb-2">{p.summary}</p>
                      {p.unavailableReason && <p className="mb-2 text-[var(--color-bad)]">Niet selecteerbaar: {p.unavailableReason}</p>}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {p.factors.map((f) => (
                          <span key={f.key} className="rounded-lg bg-[var(--color-surface)] px-2 py-1">
                            {f.label}: <strong>{f.kind === "multiplier" ? `×${f.value}` : f.value > 0 ? `+${f.value}` : f.value}</strong>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
