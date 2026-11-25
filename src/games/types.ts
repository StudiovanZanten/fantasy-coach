import type { RuleSet } from "@/engine/rules/schema";
import type { SportId } from "@/engine/types";

/**
 * Een fantasyspel als module. Nieuw spel = nieuw bestand met een GameModule + registratie.
 * Spelregels zijn data (RuleSet) en kunnen in de beheeromgeving worden overschreven.
 */
export interface GameModule {
  id: string;
  name: string;
  /** Korte omschrijving voor de spelkeuze. */
  description: string;
  sport: SportId;
  competition: string;
  /** Beschikbaar in de MVP (met demodata) of voorbereid voor later. */
  availability: "active" | "prepared";
  defaultRules: RuleSet;
  /** Accentkleur in de UI (geen merkkleur van een aanbieder). */
  accent: string;
}
