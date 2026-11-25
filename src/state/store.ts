"use client";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_PREFERENCES, type Preferences } from "@/engine/types";
import type { RuleOverrides } from "@/engine/rules/schema";
import type { UserPlayerEntry } from "@/data/identity";
import { TESTCASE_LINEUP, TESTCASE_SQUAD } from "@/data/seed/eredivisie";
import { slug } from "@/data/seed/rng";

/**
 * Gebruikersstatus. In demomodus bewaard in de browser (localStorage); met Supabase wordt
 * dezelfde vorm naar de tabellen uit supabase/migrations geschreven (zie src/data/user-state).
 */

export interface Snapshot {
  at: string;
  roundId: string;
  /** Per speler: status, basiskans, xSP. */
  players: Record<string, { status: string; pStart: number; xsp: number; availability: string }>;
  idealStarters: string[];
  captainId?: string;
  expected: number;
}

export interface NewsItem {
  id: string;
  playerId?: string;
  title: string;
  url: string;
  source: string;
  sourceKind: "official" | "secondary" | "statistics" | "manual";
  publishedAt: string;
  fetchedAt: string;
  type: "injury" | "lineup" | "training" | "suspension" | "transfer" | "other";
  reliability: "high" | "medium" | "low";
  note?: string;
}

export interface TopCoachState {
  entries: UserPlayerEntry[];
  /** Huidige opstelling zoals de gebruiker die bij de aanbieder heeft staan (invoer, sleutels = entry.key). */
  starters: string[];
  bench: string[];
  captainKey?: string;
  goldenSubsUsed: Record<string, number>;
  bank: number;
  snapshots: Snapshot[];
  /** Wat de gebruiker zelf heeft doorgevoerd (versus alleen geadviseerd). */
  appliedLog: { at: string; text: string }[];
}

export interface ChampCoachTeam {
  playerIds: string[];
  captainId?: string;
  finalizedAt?: string;
  variant?: string;
}

export interface ChampCoachState {
  used: { playerId: string; roundId: string }[];
  teams: Record<string, ChampCoachTeam>;
  overrides: RuleOverrides;
}

export interface Profile {
  name: string;
  createdAt: string;
  mode: "demo" | "supabase";
}

export type NotificationKind = "deadline" | "lineup_published" | "player_not_starting" | "captain_not_starting" | "injury" | "new_recommendation" | "final_check";

export interface AppState {
  profile: Profile | null;
  onboarded: boolean;
  activeGameId: string;
  prefs: Preferences;
  demoClock: Record<string, string>;
  topcoach: TopCoachState;
  champcoach: ChampCoachState;
  darts: { team: string[]; captainId?: string };
  ruleOverrides: Record<string, unknown>;
  notifications: Record<string, Partial<Record<NotificationKind, boolean>>>;
  news: NewsItem[];
  theme: "dark" | "light";
  set: (fn: (s: AppState) => Partial<AppState>) => void;
  reset: () => void;
}

export function testcaseTopCoach(): TopCoachState {
  const entries: UserPlayerEntry[] = TESTCASE_SQUAD.map((t) => ({ key: slug(t.input), input: t.input, position: t.position, confirmed: false }));
  const k = (name: string) => slug(name);
  return {
    entries,
    starters: TESTCASE_LINEUP.starters.map(k),
    bench: TESTCASE_LINEUP.bench.map(k),
    captainKey: k(TESTCASE_LINEUP.captain),
    goldenSubsUsed: {},
    bank: 0,
    snapshots: [],
    appliedLog: [],
  };
}

const initial = (): Omit<AppState, "set" | "reset"> => ({
  profile: null,
  onboarded: false,
  activeGameId: "topcoach-eredivisie",
  prefs: DEFAULT_PREFERENCES,
  demoClock: {},
  topcoach: testcaseTopCoach(),
  champcoach: { used: [], teams: {}, overrides: {} },
  darts: { team: [] },
  ruleOverrides: {},
  notifications: {},
  news: [],
  theme: "dark",
});

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      ...initial(),
      set: (fn) => set((s) => fn(s)),
      reset: () => set(() => initial()),
    }),
    {
      name: "fantasy-coach-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const { set: _s, reset: _r, ...rest } = s;
        return rest;
      },
    },
  ),
);

/** Wacht tot de opgeslagen status uit localStorage is geladen (voorkomt flikkeren/hydratiefouten). */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => {
    const unsub = useApp.persist.onFinishHydration(() => setH(true));
    if (useApp.persist.hasHydrated()) setH(true);
    return unsub;
  }, []);
  return h;
}
