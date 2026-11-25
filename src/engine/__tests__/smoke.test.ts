import { test, expect } from "vitest";
import { getSeedBundleSync } from "@/data/adapters/seed";
import { indexDataset } from "@/engine/recommend/dataset";
import { recommend, projectRound } from "@/engine/recommend/football";
import { adviseTopCoach } from "@/engine/recommend/topcoach";
import { champCoach } from "@/games/champ-coach";
import { topcoachEredivisie } from "@/games/topcoach-eredivisie";
import { DEFAULT_PREFERENCES } from "@/engine/types";
import { optimizeSquad } from "@/engine/optimizer/budgetSquad";

test("champ coach smoke", () => {
  const b = getSeedBundleSync("champ-coach")!;
  const idx = indexDataset(b.dataset);
  const t = Date.now();
  const rec = recommend({ idx, rules: champCoach.defaultRules, prefs: DEFAULT_PREFERENCES, usedPlayerIds: [], now: new Date("2026-12-08T15:00:00Z") }, { roundId: "cc-2b" });
  console.log("cc ms", Date.now() - t, rec.feasible, rec.headline);
  console.log(rec.picks.map((p) => p.reason + " | " + p.lostFuture?.text).join("\n"));
  console.log(rec.saved.slice(0, 3).map((s) => s.reason).join("\n"), rec.captain?.reason, rec.conflict?.summary);
  expect(rec.playerIds.length).toBe(7);
});

test("topcoach smoke", () => {
  const b = getSeedBundleSync("topcoach-eredivisie")!;
  const idx = indexDataset(b.dataset);
  const ctx = { idx, rules: topcoachEredivisie.defaultRules, prefs: DEFAULT_PREFERENCES, usedPlayerIds: [], now: new Date("2026-11-25T20:00:00Z") };
  const proj = projectRound(ctx, "ere-r14");
  const t = Date.now();
  const cands = b.dataset.players.map((p) => ({ playerId: p.id, position: p.position, clubId: p.clubId, price: p.price, scores: [proj.get(p.id)?.available ? proj.get(p.id)!.score : undefined], evs: [proj.get(p.id)?.ev] }));
  const sq = optimizeSquad({ rules: topcoachEredivisie.defaultRules, candidates: cands, roundIds: ["ere-r14"], weights: [1], captainMultipliers: [2], poolFactor: 2 });
  console.log("squad ms", Date.now() - t, sq.feasible, sq.cost, sq.timedOut, sq.squadIds.length);
  const t2 = Date.now();
  const adv = adviseTopCoach(ctx, { roundId: "ere-r14", squad: { playerIds: sq.squadIds, goldenSubsUsed: {} }, includeGoldenSubs: true });
  console.log("advice ms", Date.now() - t2, adv.headline);
  console.log(adv.formations.map((f) => `${f.formation}:${f.expectedPoints}`).join(" "));
  console.log(adv.captainCandidates.map((c) => `${idx.players.get(c.playerId)!.name} ${c.captainPoints} ${c.label}`).join(" | "));
  console.log(adv.goldenSubs?.advice);
  const top = [...proj.values()].sort((a, b) => b.ev - a.ev).slice(0, 5).map((p) => `${idx.players.get(p.playerId)!.name} ${p.ev} [${p.floor}-${p.ceiling}] ${p.minutes?.expMinutes}min`);
  console.log(top.join("\n"));
  expect(sq.squadIds.length).toBe(18);
});
