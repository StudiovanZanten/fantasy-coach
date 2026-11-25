/**
 * Generator voor DEMODATA. Alles is deterministisch (vaste seeds), zodat de demo bij elke
 * build hetzelfde is. Niets hiervan is live of echte statistiek.
 */
import type { Dataset } from "@/engine/recommend/dataset";
import { matchOutcome } from "@/engine/scoring/poisson";
import { pv, type FootballScoring } from "@/engine/rules/schema";
import { LEAGUE_AVG_GOALS } from "@/engine/scoring/football";
import type { Availability, Club, ConfirmedLineup, ConfirmedStatus, Fixture, FootballPosition, Player, PlayerRole, Round } from "@/engine/types";
import type { ClubSpec, PlayerSpec } from "./ucl";
import { poissonSample, rng, slug } from "./rng";

const ROLE_CODES: Record<string, PlayerRole> = {
  P: "penalty_1",
  p: "penalty_2",
  F: "freekick",
  C: "corner",
  B: "attacking_fullback",
  W: "wingback",
  A: "attacking_mid",
  D: "defensive_mid",
  S: "striker",
  X: "winger",
};

export interface FootballSeedConfig {
  gameId: string;
  prefix: string;
  clubs: ClubSpec[];
  /** Vul clubs aan tot deze aantallen met duidelijk herkenbare placeholders. */
  fillSlots?: Partial<Record<FootballPosition, number>>;
  prices: Record<number, number>;
  availability?: Record<string, Availability>;
  rounds: {
    id: string;
    name: string;
    shortName: string;
    matchday: number;
    phase?: string;
    kickoffs: string[];
    captainMultiplier?: number;
    past: boolean;
    /** Deelrondes delen één speeldag-indeling: welke wedstrijden (slice) horen bij deze ronde. */
    pairing?: { group: number; from: number; to: number };
    rotationRiskClubs?: string[];
  }[];
  /** Clubs waarvan de wedstrijd als laatste van de ronde wordt ingepland (demo-scenario). */
  lateClubs?: string[];
  /** Officiële opstelling afwijkend van de trekking (scenario's voor de demo). */
  lineupOverrides?: Record<string, ConfirmedStatus>;
  timeZone: string;
}

export function buildFootballDataset(cfg: FootballSeedConfig): Dataset {
  const clubs: Club[] = cfg.clubs.map((c) => ({ id: c.id, name: c.name, shortName: c.shortName, attack: c.attack, defense: c.defense, color: c.color }));
  const players: Player[] = [];
  const specByPlayer = new Map<string, PlayerSpec>();

  for (const club of cfg.clubs) {
    const specs: PlayerSpec[] = [...club.players];
    if (cfg.fillSlots) {
      for (const [pos, n] of Object.entries(cfg.fillSlots) as [FootballPosition, number][]) {
        const have = specs.filter((s) => s[1] === pos).length;
        for (let i = have; i < n; i++) specs.push([`Demospeler ${club.shortName} ${pos}${i + 1}`, pos, 2, "", i === 0 ? 0.8 : i < 3 ? 0.55 : 0.25]);
      }
    }
    for (const spec of specs) {
      const [name, pos, tier, roleStr, startProb] = spec;
      const id = `${cfg.prefix}-${club.id}-${slug(name)}`;
      const r = rng(id);
      const roles = [...roleStr].map((ch) => ROLE_CODES[ch]).filter(Boolean);
      const attackRole = roles.includes("attacking_mid") || roles.includes("winger") || roles.includes("striker");
      const backRole = roles.includes("attacking_fullback") || roles.includes("wingback");
      const jitter = () => 0.85 + r() * 0.3;
      let xg = 0;
      let xa = 0;
      if (pos === "FWD") {
        xg = (0.12 + 0.11 * tier + (roles.includes("striker") ? 0.08 : 0)) * jitter();
        xa = (0.06 + 0.035 * tier + (roles.includes("winger") ? 0.05 : 0)) * jitter();
      } else if (pos === "MID") {
        xg = (0.03 + 0.045 * tier + (attackRole ? 0.07 : 0)) * jitter();
        xa = (0.05 + 0.04 * tier + (attackRole ? 0.05 : 0)) * jitter();
      } else if (pos === "DEF") {
        xg = (0.02 + 0.012 * tier + (backRole ? 0.02 : 0)) * jitter();
        xa = (0.02 + 0.02 * tier + (backRole ? 0.07 : 0)) * jitter();
      } else xa = 0.01;
      const placeholder = name.startsWith("Demospeler");
      const form = Math.min(10, 2.5 + tier + r() * 2.5);
      const basePrice = cfg.prices[tier] ?? 1.5;
      const price = Math.max(0.5, Math.round((basePrice + (pos === "GK" ? -0.5 : 0) + (r() - 0.5)) * 2) / 2);
      const availability = cfg.availability?.[name] ?? { status: "fit" as const };
      players.push({
        id,
        name,
        clubId: club.id,
        position: pos,
        price,
        priceChange: Math.round((r() - 0.45) * 4) / 10,
        roles,
        availability,
        identityVerified: !placeholder,
        placeholder,
        stats: {
          kind: "football",
          minutesAvg: Math.round(45 + 45 * startProb * (0.85 + r() * 0.15)),
          startsLast5: Math.round(5 * startProb),
          goals: Math.round(xg * 12 * startProb + r()),
          assists: Math.round(xa * 12 * startProb + r()),
          xgPer90: round2(xg),
          xaPer90: round2(xa),
          shotsPer90: round2(xg * 7 + 0.3),
          keyPassesPer90: round2(xa * 8 + 0.3),
          form: round2(form),
          rotationRisk: round2(Math.max(0, 1 - startProb) * 0.8),
        },
      });
      specByPlayer.set(id, spec);
    }
  }

  // ── Speelschema (circle-methode, zodat niemand dubbel tegen elkaar speelt) ──
  const ids = clubs.map((c) => c.id);
  const n = ids.length % 2 === 0 ? ids.length : ids.length + 1;
  const list = [...ids];
  if (list.length < n) list.push("__bye");
  const rounds: Round[] = [];
  const fixtures: Fixture[] = [];
  const clubMap = new Map(clubs.map((c) => [c.id, c]));

  cfg.rounds.forEach((rc, ri) => {
    let pairs: [string, string][] = [];
    const group = rc.pairing?.group ?? ri;
    const rot = [list[0], ...rotate(list.slice(1), group)];
    for (let i = 0; i < n / 2; i++) {
      const a = rot[i];
      const b = rot[n - 1 - i];
      if (a === "__bye" || b === "__bye") continue;
      pairs.push((group + i) % 2 === 0 ? [a, b] : [b, a]);
    }
    if (cfg.lateClubs?.length) {
      const late = (p: [string, string]) => p.some((c) => cfg.lateClubs!.includes(c));
      pairs = [...pairs.filter((p) => !late(p)), ...pairs.filter(late)];
    }
    if (rc.pairing) pairs = pairs.slice(rc.pairing.from, rc.pairing.to);
    const fixtureIds: string[] = [];
    pairs.forEach(([home, away], i) => {
      if (i >= rc.kickoffs.length) return;
      const id = `${rc.id}-${home}-${away}`;
      const h = clubMap.get(home)!;
      const a = clubMap.get(away)!;
      const xgHome = LEAGUE_AVG_GOALS * h.attack * a.defense * 1.1;
      const xgAway = LEAGUE_AVG_GOALS * a.attack * h.defense * 0.9;
      const o = matchOutcome(xgHome, xgAway);
      const f: Fixture = {
        id,
        roundId: rc.id,
        homeId: home,
        awayId: away,
        kickoff: rc.kickoffs[i],
        odds: { pHome: round3(o.pHome), pDraw: round3(o.pDraw), pAway: round3(o.pAway), xgHome: round2(xgHome), xgAway: round2(xgAway) },
        status: rc.past ? "finished" : "scheduled",
      };
      if (rc.past) {
        const r = rng(`score-${id}`);
        f.score = { home: poissonSample(xgHome, r), away: poissonSample(xgAway, r) };
      }
      fixtures.push(f);
      fixtureIds.push(id);
    });
    const deadline = [...rc.kickoffs].sort()[0];
    rounds.push({
      id: rc.id,
      gameId: cfg.gameId,
      name: rc.name,
      shortName: rc.shortName,
      matchday: rc.matchday,
      phase: rc.phase,
      deadline,
      fixtureIds,
      captainMultiplier: rc.captainMultiplier,
      rotationRiskClubs: rc.rotationRiskClubs,
      status: rc.past ? "past" : "upcoming",
    });
  });
  const firstOpen = rounds.find((r) => r.status !== "past");
  if (firstOpen) firstOpen.status = "current";

  // ── Verwachte en officiële opstellingen ──
  const predicted: Dataset["predicted"] = {};
  const confirmed: ConfirmedLineup[] = [];
  const playersByClub = new Map<string, Player[]>();
  for (const p of players) (playersByClub.get(p.clubId!) ?? playersByClub.set(p.clubId!, []).get(p.clubId!)!).push(p);

  for (const f of fixtures) {
    predicted[f.id] = {};
    const lineup: Record<string, ConfirmedStatus> = {};
    for (const clubId of [f.homeId, f.awayId]) {
      for (const p of playersByClub.get(clubId) ?? []) {
        const spec = specByPlayer.get(p.id)!;
        const tier = spec[2];
        let sp = spec[4];
        if (p.availability.status === "doubtful") sp *= 0.7;
        if (p.availability.status === "returning") sp *= 0.8;
        const out = ["injured", "suspended", "ill", "not_in_squad"].includes(p.availability.status);
        const r = rng(`lineup-${f.id}-${p.id}`);
        predicted[f.id][p.id] = { startProb: out ? 0 : round2(Math.min(sp, 0.95)), expMinutes: Math.min(90, 72 + tier * 3) };
        lineup[p.id] = out ? "absent" : r() < sp ? "starting" : r() < 0.85 ? "bench" : "absent";
      }
    }
    for (const [name, status] of Object.entries(cfg.lineupOverrides ?? {})) {
      const pl = players.find((p) => p.name === name && (p.clubId === f.homeId || p.clubId === f.awayId));
      if (pl) lineup[pl.id] = status;
    }
    confirmed.push({ fixtureId: f.id, publishedAt: new Date(new Date(f.kickoff).getTime() - 60 * 60 * 1000).toISOString(), players: lineup });
  }

  // ── Uitslagen gespeelde rondes (fantasypunten in een neutrale schaal; omgerekend per spel) ──
  const results: Dataset["results"] = {};
  return { clubs, players, rounds, fixtures, predicted, confirmed, results, timeZone: cfg.timeZone };
}

function rotate<T>(arr: T[], k: number): T[] {
  const n = arr.length;
  const s = ((k % n) + n) % n;
  return [...arr.slice(n - s), ...arr.slice(0, n - s)];
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const round3 = (x: number) => Math.round(x * 1000) / 1000;

/** CET-tijd (winter, UTC+1) naar ISO-UTC. */
export function cet(date: string, time: string): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCHours(h - 1, m);
  return d.toISOString();
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Gesimuleerde fantasypunten voor gespeelde rondes, consistent met de (gegenereerde) uitslag:
 * doelpunten worden verdeeld over de spelers die op het veld stonden naar rato van hun xG.
 */
export function simulateResults(ds: Dataset, scoring: FootballScoring): Dataset["results"] {
  const results: Dataset["results"] = {};
  const byClub = new Map<string, Player[]>();
  for (const p of ds.players) if (p.clubId) (byClub.get(p.clubId) ?? byClub.set(p.clubId, []).get(p.clubId)!).push(p);
  for (const round of ds.rounds.filter((r) => r.status === "past")) {
    const res: Record<string, number> = {};
    for (const fid of round.fixtureIds) {
      const f = ds.fixtures.find((x) => x.id === fid)!;
      const lineup = ds.confirmed.find((l) => l.fixtureId === fid);
      if (!f.score || !lineup) continue;
      for (const [clubId, gf, ga] of [
        [f.homeId, f.score.home, f.score.away],
        [f.awayId, f.score.away, f.score.home],
      ] as [string, number, number][]) {
        const r = rng(`result-${fid}-${clubId}`);
        const squad = byClub.get(clubId) ?? [];
        const minutes = new Map<string, number>();
        for (const p of squad) {
          const st = lineup.players[p.id];
          minutes.set(p.id, st === "starting" ? (r() < 0.75 ? 90 : 60 + Math.round(r() * 25)) : st === "bench" && r() < 0.5 ? 10 + Math.round(r() * 25) : 0);
        }
        const onPitch = squad.filter((p) => (minutes.get(p.id) ?? 0) > 0);
        const pick = (w: (p: Player) => number) => {
          const total = onPitch.reduce((s, p) => s + w(p), 0);
          let x = r() * total;
          for (const p of onPitch) {
            x -= w(p);
            if (x <= 0) return p;
          }
          return onPitch[0];
        };
        const goals = new Map<string, number>();
        const assists = new Map<string, number>();
        const stats = (p: Player) => p.stats as import("@/engine/types").FootballStats;
        for (let g = 0; g < gf && onPitch.length; g++) {
          const s = pick((p) => (stats(p).xgPer90 + 0.01) * (minutes.get(p.id)! / 90));
          goals.set(s.id, (goals.get(s.id) ?? 0) + 1);
          if (r() < 0.75) {
            const a = pick((p) => (p.id === s.id ? 0 : (stats(p).xaPer90 + 0.01) * (minutes.get(p.id)! / 90)));
            if (a && a.id !== s.id) assists.set(a.id, (assists.get(a.id) ?? 0) + 1);
          }
        }
        for (const p of squad) {
          const pos = p.position as FootballPosition;
          const min = minutes.get(p.id) ?? 0;
          if (!min) {
            res[p.id] = 0;
            continue;
          }
          let pts = pv(scoring.appearance, pos);
          if (min >= scoring.minutesThreshold) pts += pv(scoring.minutesPoints, pos);
          const gl = goals.get(p.id) ?? 0;
          pts += gl * scoring.goal[pos] + (assists.get(p.id) ?? 0) * pv(scoring.assist, pos);
          if (gl >= 3) pts += scoring.hattrickBonus;
          if (ga === 0 && min >= scoring.minutesThreshold) pts += scoring.cleanSheet[pos];
          if (scoring.goalConceded) pts -= ga * scoring.goalConceded[pos] * (min / 90);
          if (gf > ga) pts += pv(scoring.win, pos);
          else if (gf === ga) pts += pv(scoring.draw, pos);
          if (r() < 0.12) pts += scoring.yellow;
          res[p.id] = Math.round(pts);
        }
      }
    }
    results[round.id] = res;
  }
  return results;
}
