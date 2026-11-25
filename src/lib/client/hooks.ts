"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseRuleSet, type RuleSet } from "@/engine/rules/schema";
import { getGame } from "@/games/registry";
import { useApp } from "@/state/store";
import { useBundle, useNow } from "@/components/providers/game-data";

/** Actieve spelregels: aanpassing uit de beheeromgeving als die geldig is, anders de standaard. */
export function useRules(gameId?: string): { rules: RuleSet; overridden: boolean } {
  const bundle = useBundle();
  const id = gameId ?? bundle.gameId;
  const override = useApp((s) => s.ruleOverrides[id]);
  return useMemo(() => {
    const def = getGame(id)!.defaultRules;
    if (!override) return { rules: def, overridden: false };
    const p = parseRuleSet(override);
    return p.ok ? { rules: p.rules, overridden: true } : { rules: def, overridden: false };
  }, [id, override]);
}

/** Basisvelden voor iedere engine-aanroep. */
export function useEngineBase() {
  const bundle = useBundle();
  const now = useNow();
  const { rules, overridden } = useRules();
  const prefs = useApp((s) => s.prefs);
  const entries = useApp((s) => s.topcoach.entries);
  return useMemo(
    () => ({ gameId: bundle.gameId, now: now.toISOString(), prefs, rules: overridden ? rules : undefined, entries: bundle.gameId === "topcoach-eredivisie" ? entries : undefined }),
    [bundle.gameId, now, prefs, rules, overridden, entries],
  );
}

export interface EngineState<T> {
  data?: T;
  error?: string;
  loading: boolean;
  reload: () => void;
}

/** POST naar een engine-API met loading/error-state. Herberekent als de body verandert. */
export function useEngine<T>(url: string, body: unknown, enabled = true): EngineState<T> {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: enabled });
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(body);
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!enabled) {
      setState({ loading: false });
      return;
    }
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: key, signal: c.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Onbekende fout");
        setState({ data: j as T, loading: false });
      })
      .catch((e) => {
        if (e.name !== "AbortError") setState({ loading: false, error: e.message });
      });
    return () => c.abort();
  }, [url, key, enabled, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}
