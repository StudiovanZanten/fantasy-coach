/** Kleine kansrekenhulpjes voor wedstrijdmodellen. */

export function poissonPmf(k: number, lambda: number): number {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

/** Winst/gelijk/verlies-kansen uit twee onafhankelijke Poisson-verdelingen. */
export function matchOutcome(lambdaHome: number, lambdaAway: number, maxGoals = 8) {
  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  for (let h = 0; h <= maxGoals; h++) {
    const ph = poissonPmf(h, lambdaHome);
    for (let a = 0; a <= maxGoals; a++) {
      const p = ph * poissonPmf(a, lambdaAway);
      if (h > a) pHome += p;
      else if (h === a) pDraw += p;
      else pAway += p;
    }
  }
  const total = pHome + pDraw + pAway;
  return { pHome: pHome / total, pDraw: pDraw / total, pAway: pAway / total };
}

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Kans op minstens één gebeurtenis bij verwachting `lambda`. */
export const pAtLeastOne = (lambda: number) => 1 - Math.exp(-Math.max(0, lambda));
