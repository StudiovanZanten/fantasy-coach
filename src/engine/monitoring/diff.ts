import { OFFICIAL_STATUSES, type LineupStatus } from "../types";

/**
 * Wijzigingsdetectie tussen twee controles. Een vervolgcontrole toont alleen wat er veranderd is,
 * en maakt onderscheid tussen bevestigd nieuws (officiële status) en een gewijzigde voorspelling.
 */
export interface SnapshotPlayer {
  status: string;
  pStart: number;
  xsp: number;
  availability: string;
}

export interface SnapshotLike {
  at: string;
  roundId: string;
  players: Record<string, SnapshotPlayer>;
  idealStarters: string[];
  captainId?: string;
  expected: number;
}

export interface Change {
  playerId?: string;
  kind: "official" | "prediction" | "advice";
  importance: "high" | "medium" | "low";
  text: string;
}

export function diffSnapshots(prev: SnapshotLike | undefined, next: SnapshotLike, name: (id: string) => string): Change[] {
  if (!prev || prev.roundId !== next.roundId) return [];
  const out: Change[] = [];
  for (const [id, n] of Object.entries(next.players)) {
    const p = prev.players[id];
    if (!p) continue;
    if (p.status !== n.status) {
      const official = OFFICIAL_STATUSES.includes(n.status as LineupStatus);
      out.push({
        playerId: id,
        kind: official ? "official" : "prediction",
        importance: official || n.status === "AFWEZIG" ? "high" : "medium",
        text: official
          ? `${name(id)} is officieel ${label(n.status)}.`
          : `${name(id)}: voorspelling gewijzigd van ${label(p.status)} naar ${label(n.status)}.`,
      });
    } else if (Math.abs(n.pStart - p.pStart) >= 0.15) {
      out.push({
        playerId: id,
        kind: "prediction",
        importance: "medium",
        text: `${name(id)}: basiskans ${n.pStart > p.pStart ? "gestegen" : "gedaald"} van ${Math.round(p.pStart * 100)}% naar ${Math.round(n.pStart * 100)}%.`,
      });
    }
    if (p.availability !== n.availability)
      out.push({ playerId: id, kind: "prediction", importance: "high", text: `${name(id)}: beschikbaarheid gewijzigd (${p.availability} → ${n.availability}).` });
  }
  if (prev.captainId !== next.captainId && next.captainId)
    out.push({ kind: "advice", importance: "high", text: `Captainadvies gewijzigd: ${prev.captainId ? name(prev.captainId) : "–"} → ${name(next.captainId)}.` });
  const ins = next.idealStarters.filter((id) => !prev.idealStarters.includes(id));
  const outs = prev.idealStarters.filter((id) => !next.idealStarters.includes(id));
  if (ins.length || outs.length)
    out.push({ kind: "advice", importance: "medium", text: `Ideale basis gewijzigd: ${outs.map(name).join(", ") || "–"} eruit, ${ins.map(name).join(", ") || "–"} erin.` });
  return out.sort((a, b) => rank(a) - rank(b));
}

const rank = (c: Change) => (c.importance === "high" ? 0 : c.importance === "medium" ? 1 : 2) + (c.kind === "official" ? -0.5 : 0);
const label = (s: string) => s.replace(/_/g, " ").toLowerCase();

/** Controlemomenten rond de deadline (deadlinemanager). */
export const CHECK_OFFSETS_MIN = [24 * 60, 6 * 60, 120, 60, 30, 10];

export function nextCheck(deadline: string, now: Date): { at: Date; label: string } | undefined {
  const d = new Date(deadline).getTime();
  for (const off of CHECK_OFFSETS_MIN) {
    const t = d - off * 60000;
    if (t > now.getTime()) return { at: new Date(t), label: off >= 60 ? `${off / 60} uur voor de deadline` : `${off} minuten voor de deadline` };
  }
  return undefined;
}
