"use client";
import type { PlayerProjection } from "@/engine/types";
import type { RiskLevel } from "@/engine/recommend/topcoach";
import { RiskDot, StatusBadge } from "@/components/ui/badge";
import { useIndex } from "@/components/providers/game-data";
import { cn, num } from "@/lib/utils";

export function PlayerCard({
  playerId,
  projection,
  risk,
  captain,
  captainMultiplier = 2,
  compact,
  dim,
  onClick,
  selected,
  label,
}: {
  playerId: string;
  projection?: PlayerProjection | null;
  risk?: RiskLevel;
  captain?: boolean;
  captainMultiplier?: number;
  compact?: boolean;
  dim?: boolean;
  onClick?: () => void;
  selected?: boolean;
  label?: string;
}) {
  const idx = useIndex();
  const p = idx.players.get(playerId);
  const club = p?.clubId ? idx.clubs.get(p.clubId) : undefined;
  const opp = projection?.opponentId ? idx.clubs.get(projection.opponentId) : undefined;
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "relative flex w-full min-w-0 flex-col items-center rounded-xl border bg-[var(--color-surface)]/95 px-1.5 py-1.5 text-center shadow-sm",
        selected ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]" : "border-[var(--color-border)]",
        dim && "opacity-60",
        onClick && "cursor-pointer hover:border-[var(--color-accent)]",
      )}
      aria-label={label ?? p?.name}
    >
      {captain && (
        <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-yellow-400 text-[11px] font-extrabold text-slate-950" title={`Captain (${captainMultiplier * 100}%)`}>
          {captainMultiplier >= 3 ? "3×" : "C"}
        </span>
      )}
      <div className="flex w-full items-center justify-center gap-1">
        {risk && <RiskDot level={risk} />}
        <span className="truncate text-xs font-semibold md:text-sm">{shortName(p?.name ?? "?")}</span>
      </div>
      <div className="flex w-full items-center justify-center gap-1 text-[10px] text-[var(--color-muted)]">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: club?.color ?? "#64748b" }} aria-hidden />
        <span className="truncate">{club?.shortName ?? "club?"}</span>
        {opp && <span className="truncate">· {projection?.isHome ? "" : "@"}{opp.shortName}</span>}
      </div>
      {!compact && projection && (
        <div className="mt-1 flex items-center gap-1">
          <StatusBadge status={projection.status} size="sm" />
        </div>
      )}
      {projection ? (
        <div className="mt-0.5 text-[11px] tabular">
          <span className="font-bold">{num(projection.ev)}</span>
          <span className="text-[var(--color-muted)]"> xP · {projection.minutes?.expMinutes ?? "–"}′</span>
        </div>
      ) : (
        <div className="mt-0.5 text-[11px] text-[var(--color-muted)]">{p?.clubId ? "geen wedstrijd" : "niet gekoppeld"}</div>
      )}
    </Comp>
  );
}

export function shortName(name: string) {
  const parts = name.split(" ");
  if (parts.length <= 1 || name.length <= 14) return name;
  const particles = ["van", "de", "der", "den", "da", "di", "le"];
  const i = parts.findIndex((x, j) => j > 0 && (particles.includes(x.toLowerCase()) || j === parts.length - 1));
  return parts.slice(i).join(" ");
}
