/**
 * Exacte kansberekening voor een knock-outschema (geen Monte Carlo nodig).
 *
 * Het schema is een array met spelers in volgorde van de loting (lengte 2^n). In ronde r
 * speelt een speler tegen iemand uit de "andere helft" van zijn blok van grootte 2^(r+1).
 *
 *   reach[0][i] = 1
 *   win[r][i]   = reach[r][i] · Σ_{j ∈ andere helft} reach[r][j] · P(i verslaat j)
 *   reach[r+1][i] = win[r][i]
 */

export type WinProb = (a: string, b: string) => number;

export interface BracketOdds {
  roundNames: string[];
  /** reach[r][playerId]: kans dat speler ronde r haalt. */
  reach: Record<string, number>[];
  /** win[r][playerId]: kans dat speler zijn partij in ronde r wint. */
  win: Record<string, number>[];
  /** Waarschijnlijkste tegenstander per ronde, met kans dat juist die tegenstander het wordt. */
  likelyOpponent: Record<string, { opponentId: string; prob: number }>[];
}

export function roundNamesFor(size: number): string[] {
  const n = Math.log2(size);
  if (!Number.isInteger(n)) throw new Error("Schema moet een macht van 2 zijn");
  const names: string[] = [];
  for (let r = 0; r < n; r++) {
    const remaining = size / 2 ** r;
    names.push(remaining === 2 ? "F" : remaining === 4 ? "SF" : remaining === 8 ? "QF" : `R${r + 1}`);
  }
  return names;
}

export function simulateBracket(slots: (string | null)[], p: WinProb): BracketOdds {
  const size = slots.length;
  const roundNames = roundNamesFor(size);
  const ids = slots.map((s, i) => s ?? `__bye_${i}`);
  const isBye = (id: string) => id.startsWith("__bye_");
  const prob: WinProb = (a, b) => (isBye(b) ? 1 : isBye(a) ? 0 : p(a, b));

  let reach = Object.fromEntries(ids.map((id) => [id, 1])) as Record<string, number>;
  const reachAll: Record<string, number>[] = [];
  const winAll: Record<string, number>[] = [];
  const likelyAll: Record<string, { opponentId: string; prob: number }>[] = [];

  for (let r = 0; r < roundNames.length; r++) {
    reachAll.push(reach);
    const block = 2 ** (r + 1);
    const half = block / 2;
    const win: Record<string, number> = {};
    const likely: Record<string, { opponentId: string; prob: number }> = {};
    for (let i = 0; i < size; i++) {
      const start = Math.floor(i / block) * block;
      const inFirstHalf = i - start < half;
      const oppStart = inFirstHalf ? start + half : start;
      let w = 0;
      let best = { opponentId: "", prob: -1 };
      let totalOpp = 0;
      for (let j = oppStart; j < oppStart + half; j++) totalOpp += reach[ids[j]];
      for (let j = oppStart; j < oppStart + half; j++) {
        const rj = reach[ids[j]];
        w += rj * prob(ids[i], ids[j]);
        const share = totalOpp > 0 ? rj / totalOpp : 0;
        if (share > best.prob && !isBye(ids[j])) best = { opponentId: ids[j], prob: share };
      }
      win[ids[i]] = reach[ids[i]] * w;
      if (best.opponentId) likely[ids[i]] = best;
    }
    winAll.push(win);
    likelyAll.push(likely);
    reach = win;
  }
  return { roundNames, reach: reachAll, win: winAll, likelyOpponent: likelyAll };
}

/** Logistische (Elo-achtige) winkans op basis van ratings. */
export const eloWinProb = (ratings: Record<string, number>): WinProb => (a, b) =>
  1 / (1 + 10 ** (((ratings[b] ?? 1500) - (ratings[a] ?? 1500)) / 400));
