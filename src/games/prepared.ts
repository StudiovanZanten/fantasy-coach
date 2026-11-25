import { champCoach } from "./champ-coach";
import { topcoachEredivisie } from "./topcoach-eredivisie";
import { wkDarts } from "./wk-darts";
import type { GameModule } from "./types";

/**
 * Voorbereide spellen: regels staan klaar, data volgt via een adapter of import.
 * Ze verschijnen in de spelkeuze als "binnenkort".
 */
export const preparedGames: GameModule[] = [
  { ...topcoachEredivisie, id: "topcoach-kkd", name: "TopCoach Keuken Kampioen Divisie", competition: "Keuken Kampioen Divisie", description: "Eerste divisie · budgetselectie", availability: "prepared", accent: "#fb7185" },
  { ...topcoachEredivisie, id: "topcoach-premier-league", name: "TopCoach Premier League", competition: "Premier League", description: "Premier League · budgetselectie", availability: "prepared", accent: "#c084fc" },
  { ...wkDarts, id: "premier-league-darts", name: "Premier League Darts", competition: "Premier League Darts", description: "Wekelijkse speelavonden · darters per avond", availability: "prepared", accent: "#facc15" },
  { ...champCoach, id: "champ-coach-knockout", name: "Champ Coach – knock-outfase", description: "Champions League knock-outfase", availability: "prepared" },
];
