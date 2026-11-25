import type { Club, Player, PlayerProjection } from "../types";

/** Lijst in natuurlijk Nederlands: "a, b en c". */
export function joinNl(parts: string[]): string {
  const p = parts.filter(Boolean);
  if (p.length <= 1) return p[0] ?? "";
  return `${p.slice(0, -1).join(", ")} en ${p[p.length - 1]}`;
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Sterkte-index van een club: 1.0 = gemiddeld. */
export function clubStrength(c: Club): number {
  return (c.attack + 1 / c.defense) / 2;
}

export function opponentLabel(opp: Club): string {
  const s = clubStrength(opp);
  if (s < 0.82) return "een zwakke tegenstander";
  if (s < 0.97) return "een middelmatige tegenstander";
  if (s < 1.15) return "een sterke tegenstander";
  return "een toptegenstander";
}

export function statusPhrase(p: PlayerProjection): string {
  switch (p.status) {
    case "BASIS":
      return "bevestigde basisplaats";
    case "VERWACHTE_BASIS":
      return `verwachte basisplaats (${pct(p.startProb)}, nog niet bevestigd)`;
    case "MOGELIJKE_BASIS":
      return `mogelijke basisplaats (${pct(p.startProb)})`;
    case "VERWACHTE_RESERVE":
      return `waarschijnlijk reserve (basiskans ${pct(p.startProb)})`;
    case "ONZEKER":
      return "basisplaats onbekend (onvoldoende informatie)";
    case "BANK":
      return "officieel reserve";
    case "AFWEZIG":
      return "niet in de wedstrijdselectie";
  }
}

const ROLE_PHRASE: Partial<Record<string, string>> = {
  penalty_1: "eerste strafschopnemer",
  freekick: "neemt de vrije trappen",
  corner: "neemt de hoekschoppen",
  attacking_fullback: "aanvallende back",
  wingback: "wingback",
};

export function describeFootball(player: Player, opponent: Club, p: PlayerProjection): string {
  const parts: string[] = [statusPhrase(p)];
  parts.push(`${p.isHome ? "thuis" : "uit"} tegen ${opponentLabel(opponent)} (${opponent.name})`);
  const roles = player.roles.map((r) => ROLE_PHRASE[r]).filter(Boolean) as string[];
  parts.push(...roles.slice(0, 2));
  if ((player.position === "FWD" || player.position === "MID") && (p.pGoal ?? 0) >= 0.3)
    parts.push(`hoge doelpuntkans (${pct(p.pGoal!)})`);
  else if ((player.position === "DEF" || player.position === "GK") && (p.pCleanSheet ?? 0) >= 0.38)
    parts.push(`goede kans op de nul (${pct(p.pCleanSheet!)})`);
  if (p.minutes && p.minutes.pStart > 0 && p.minutes.expMinutes < 60 && p.status !== "AFWEZIG") parts.push(`verwacht ${p.minutes.expMinutes} minuten`);
  if (player.availability.status === "doubtful") parts.push(`twijfelgeval: ${player.availability.note ?? "fitheid onzeker"}`);
  if (player.availability.status === "returning") parts.push(`terug van blessure${player.availability.note ? ` (${player.availability.note})` : ""}`);
  if (p.status === "AFWEZIG" && player.availability.reasonKnown === false) parts.push("reden onbekend");
  return `${player.name} – ${joinNl(parts)}.`;
}
