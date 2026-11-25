import { describe, expect, test } from "vitest";
import { getSeedBundleSync } from "@/data/adapters/seed";
import { indexDataset } from "@/engine/recommend/dataset";
import { parseRuleSet } from "@/engine/rules/schema";
import { validateTeam } from "@/engine/rules/validate";
import { checkLineup } from "@/engine/lineup/check";
import { recommend } from "@/engine/recommend/football";
import { simulateBracket, eloWinProb } from "@/engine/bracket/simulate";
import { diffSnapshots } from "@/engine/monitoring/diff";
import { matchCandidates, matchState } from "@/data/identity";
import { champCoach } from "@/games/champ-coach";
import { topcoachEredivisie } from "@/games/topcoach-eredivisie";
import { DEFAULT_PREFERENCES } from "@/engine/types";

const ucl = getSeedBundleSync("champ-coach")!;
const uclIdx = indexDataset(ucl.dataset);
const ctx = (now: string, used: string[] = []) => ({ idx: uclIdx, rules: champCoach.defaultRules, prefs: DEFAULT_PREFERENCES, usedPlayerIds: used, now: new Date(now) });

describe("spelregels", () => {
  test("standaardregels zijn geldig", () => {
    expect(parseRuleSet(champCoach.defaultRules).ok).toBe(true);
    expect(parseRuleSet(topcoachEredivisie.defaultRules).ok).toBe(true);
  });
  test("ongeldige regels worden geweigerd", () => {
    const bad = { ...champCoach.defaultRules, maxPerClub: 0 };
    const r = parseRuleSet(bad);
    expect(r.ok).toBe(false);
  });
});

describe("Champ Coach", () => {
  test("advies is een geldige 1-2-2-2 zonder gebruikte spelers", () => {
    const used = ["ucl-rma-kylian-mbappe", "ucl-bay-harry-kane"].filter((id) => uclIdx.players.has(id));
    const rec = recommend(ctx("2026-12-08T15:00:00Z", used), { roundId: "cc-2b" });
    expect(rec.feasible).toBe(true);
    expect(rec.playerIds).toHaveLength(7);
    for (const id of used) expect(rec.playerIds).not.toContain(id);
    const v = validateTeam({ rules: champCoach.defaultRules, players: uclIdx.players, playerIds: rec.playerIds, captainId: rec.captainId, usedPlayerIds: new Set(used) });
    expect(v).toEqual([]);
  });
  test("tijdfilter: alleen spelers uit 21:00-wedstrijden", () => {
    const rec = recommend({ ...ctx("2026-12-08T15:00:00Z"), overrides: { timeSlots: ["21:00"] } }, { roundId: "cc-2b" });
    for (const p of rec.picks) {
      const f = uclIdx.fixtures.get(p.projection.fixtureId!)!;
      expect(new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" }).format(new Date(f.kickoff))).toBe("21:00");
    }
  });
  test("opstellingencheck: bankspeler krijgt vervanger op dezelfde positie", () => {
    const ueda = uclIdx.ds.players.find((p) => p.name === "Ayase Ueda")!;
    const rec = recommend(ctx("2026-12-08T15:00:00Z"), { roundId: "cc-2b", lockedIds: [ueda.id] });
    const c = checkLineup(ctx("2026-12-08T19:05:00Z"), "cc-2b", rec.playerIds, rec.captainId);
    const row = c.players.find((p) => p.playerId === ueda.id)!;
    if (row.status === "BANK" && !row.locked) {
      expect(row.replacement).toBeDefined();
      expect(uclIdx.players.get(row.replacement!.playerId)!.position).toBe("FWD");
    }
  });
  test("opstellingencheck negeert onbekende spelers", () => {
    expect(() => checkLineup(ctx("2026-12-08T19:05:00Z"), "cc-2b", ["bestaat-niet"])).not.toThrow();
  });
});

describe("identiteit", () => {
  test("Van Bergen is dubbelzinnig, nooit automatisch gekoppeld", () => {
    const ere = getSeedBundleSync("topcoach-eredivisie")!;
    const s = matchState(ere.dataset.players, { key: "van-bergen", input: "Van Bergen", position: "FWD", confirmed: false });
    expect(s.state).toBe("ambiguous");
    expect(matchCandidates(ere.dataset.players, "Van Bergen", "FWD").length).toBeGreaterThan(1);
  });
});

describe("darts", () => {
  test("kansen per ronde tellen op tot het aantal winnaars", () => {
    const slots = ["a", "b", "c", "d"];
    const odds = simulateBracket(slots, eloWinProb({ a: 1600, b: 1500, c: 1500, d: 1400 }));
    const final = Object.values(odds.win[odds.win.length - 1]).reduce((s, x) => s + x, 0);
    expect(final).toBeCloseTo(1, 6);
  });
});

describe("monitoring", () => {
  test("vervolgcheck toont alleen wijzigingen, officieel eerst", () => {
    const base = { at: "t1", roundId: "r", idealStarters: ["a"], expected: 10, players: { a: { status: "VERWACHTE_BASIS", pStart: 0.8, xsp: 5, availability: "fit" }, b: { status: "ONZEKER", pStart: 0.5, xsp: 3, availability: "fit" } } };
    expect(diffSnapshots(base, { ...base, at: "t2" }, (x) => x)).toEqual([]);
    const next = { ...base, at: "t2", players: { ...base.players, a: { ...base.players.a, status: "BANK" }, b: { ...base.players.b, pStart: 0.8 } } };
    const d = diffSnapshots(base, next, (x) => x);
    expect(d[0].kind).toBe("official");
    expect(d).toHaveLength(2);
  });
});
