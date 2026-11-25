"use client";
import type { ReactNode } from "react";
import type { Position } from "@/engine/types";
import { useIndex } from "@/components/providers/game-data";

/** Visueel speelveld: rijen per linie (aanval boven, keeper onder). Het veld toont geen merkmaterialen. */
export function Pitch({ playerIds, render, footer }: { playerIds: string[]; render: (id: string) => ReactNode; footer?: ReactNode }) {
  const idx = useIndex();
  const by = (pos: Position) => playerIds.filter((id) => idx.players.get(id)?.position === pos);
  const rows: Position[] = ["FWD", "MID", "DEF", "GK"];
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-pitch-line)] bg-[var(--color-pitch)]">
      <div
        className="relative space-y-3 px-2 py-4 md:space-y-5 md:px-6 md:py-6"
        style={{
          backgroundImage:
            "linear-gradient(transparent 49.6%, var(--color-pitch-line) 49.6%, var(--color-pitch-line) 50.4%, transparent 50.4%), repeating-linear-gradient(0deg, transparent 0 60px, rgba(255,255,255,0.025) 60px 120px)",
        }}
      >
        {rows.map((pos) => {
          const ids = by(pos);
          if (!ids.length) return null;
          return (
            <div key={pos} className="flex justify-center gap-1.5 md:gap-3">
              {ids.map((id) => (
                <div key={id} className="w-[23%] max-w-[130px] md:w-32">
                  {render(id)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {footer && <div className="border-t border-[var(--color-pitch-line)] bg-black/20 p-2">{footer}</div>}
    </div>
  );
}

export function SlotRow({ title, factor, ids, render }: { title: string; factor?: string; ids: string[]; render: (id: string) => ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {title} {factor && <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 normal-case">{factor}</span>}
      </div>
      <div className="grid grid-cols-4 gap-1.5 md:gap-3">{ids.map((id) => <div key={id}>{render(id)}</div>)}</div>
    </div>
  );
}
