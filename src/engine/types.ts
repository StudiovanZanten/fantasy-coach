/**
 * Domeintypes van de engine. De engine kent geen UI, database of specifiek spel:
 * alles komt binnen via deze types.
 */

export type SportId = "football" | "darts";
export type FootballPosition = "GK" | "DEF" | "MID" | "FWD";
export type Position = FootballPosition | "DARTER";

export const FOOTBALL_POSITIONS: FootballPosition[] = ["GK", "DEF", "MID", "FWD"];

export type PlayerRole =
  | "penalty_1"
  | "penalty_2"
  | "freekick"
  | "corner"
  | "attacking_fullback"
  | "wingback"
  | "attacking_mid"
  | "defensive_mid"
  | "striker"
  | "winger";

/** Beschikbaarheid staat los van basisplaats en speelminuten (drie aparte variabelen). */
export type AvailabilityStatus =
  | "fit"
  | "doubtful"
  | "returning"
  | "injured"
  | "suspended"
  | "ill"
  | "not_in_squad"
  | "withdrawn"
  | "unknown";

/** Herstelfase bij blessures: een hoopvolle trainersuitspraak is nog geen wedstrijdfitheid. */
export type RecoveryStage = "diagnosed" | "rehab" | "individual_training" | "team_training" | "available" | "match_fit";

export interface Availability {
  status: AvailabilityStatus;
  note?: string;
  recovery?: RecoveryStage;
  /** Als de reden van afwezigheid niet vaststaat: false → UI toont "reden onbekend". */
  reasonKnown?: boolean;
  expectedReturn?: string;
}

export const AVAILABILITY_LABEL: Record<AvailabilityStatus, string> = {
  fit: "Fit",
  doubtful: "Twijfelgeval",
  returning: "Terug van blessure",
  injured: "Geblesseerd",
  suspended: "Geschorst",
  ill: "Ziek",
  not_in_squad: "Niet bij wedstrijdselectie",
  withdrawn: "Afgemeld",
  unknown: "Onbekend",
};

export const RECOVERY_LABEL: Record<RecoveryStage, string> = {
  diagnosed: "Blessure vastgesteld",
  rehab: "Revalidatie",
  individual_training: "Individuele training",
  team_training: "Volledige groepstraining",
  available: "Beschikbaar voor de wedstrijd",
  match_fit: "Volledig wedstrijdfit",
};

export interface Club {
  id: string;
  name: string;
  shortName: string;
  /** Aanvalskracht, 1.0 = competitiegemiddelde. */
  attack: number;
  /** Verdedigingsfactor: verwachte tegengoals t.o.v. gemiddelde (lager = beter). */
  defense: number;
  color: string;
}

export interface FootballStats {
  kind: "football";
  /** Gemiddelde minuten in de laatste 5 wedstrijden. */
  minutesAvg: number;
  startsLast5: number;
  goals: number;
  assists: number;
  /** Non-penalty xG per 90. */
  xgPer90: number;
  xaPer90: number;
  shotsPer90: number;
  keyPassesPer90: number;
  /** Vorm 0–10 (fantasypunten-gemiddelde laatste 5, genormaliseerd). */
  form: number;
  /** Risico op rotatie 0–1 (bijv. drukke week, jonge speler). */
  rotationRisk: number;
}

export interface DartsStats {
  kind: "darts";
  avg3: number;
  checkoutPct: number;
  first9: number;
  /** 180's per leg. */
  oneEightiesPerLeg: number;
  /** Vorm 0–10. */
  form: number;
  /** Bookmakerskans op toernooiwinst (0–1). */
  outrightProb: number;
}

export interface Player {
  id: string;
  name: string;
  clubId?: string;
  position: Position;
  price: number;
  priceChange?: number;
  roles: PlayerRole[];
  stats: FootballStats | DartsStats;
  availability: Availability;
  /** Darts: plaatsing in de loting. */
  seed?: number;
  /**
   * Identiteitscontrole: nieuws en data mogen alleen aan een speler worden gekoppeld als
   * volledige naam + club + competitie + seizoen + positie kloppen. false = nog verifiëren.
   */
  identityVerified?: boolean;
  /** Demodata/placeholder: niet gebaseerd op een echte speler. */
  placeholder?: boolean;
}

export interface FixtureOdds {
  pHome: number;
  pDraw: number;
  pAway: number;
  xgHome: number;
  xgAway: number;
}

export interface Fixture {
  id: string;
  roundId: string;
  homeId: string;
  awayId: string;
  /** ISO-tijd (UTC). */
  kickoff: string;
  odds?: FixtureOdds;
  status: "scheduled" | "live" | "finished";
  score?: { home: number; away: number };
}

export interface Round {
  id: string;
  gameId: string;
  name: string;
  shortName: string;
  matchday?: number;
  phase?: string;
  deadline: string;
  fixtureIds: string[];
  captainMultiplier?: number;
  matchOfTheRoundFixtureId?: string;
  /** Clubs met verhoogd rotatierisico in deze ronde (bijv. al geplaatst). */
  rotationRiskClubs?: string[];
  status: "past" | "current" | "upcoming";
}

export type ConfirmedStatus = "starting" | "bench" | "absent";

export interface PredictedLineupEntry {
  startProb: number;
  expMinutes: number;
}

export interface ConfirmedLineup {
  fixtureId: string;
  publishedAt: string;
  players: Record<string, ConfirmedStatus>;
}

/** Statussen zoals de gebruiker ze ziet. */
/**
 * Opstellingsstatus. Alleen BASIS/BANK/AFWEZIG komen uit een officiële bron;
 * de andere statussen zijn voorspellingen en worden nooit als officieel getoond.
 */
export type LineupStatus = "BASIS" | "BANK" | "AFWEZIG" | "VERWACHTE_BASIS" | "MOGELIJKE_BASIS" | "VERWACHTE_RESERVE" | "ONZEKER";

export const LINEUP_STATUS_LABEL: Record<LineupStatus, string> = {
  BASIS: "BASIS",
  BANK: "BANK",
  AFWEZIG: "AFWEZIG",
  VERWACHTE_BASIS: "VERWACHTE BASIS",
  MOGELIJKE_BASIS: "MOGELIJKE BASIS",
  VERWACHTE_RESERVE: "VERWACHTE RESERVE",
  ONZEKER: "ONZEKER",
};

export const OFFICIAL_STATUSES: LineupStatus[] = ["BASIS", "BANK", "AFWEZIG"];

export interface MinutesProjection {
  pAvailable: number;
  pStart: number;
  pSub: number;
  pNone: number;
  expMinutes: number;
  /** Kans op minimaal de minutengrens van de puntentelling (bijv. 45). */
  pThreshold: number;
  pFull: number;
}

export type RiskProfile = "safe" | "balanced" | "aggressive";

export interface Preferences {
  riskProfile: RiskProfile;
  /** Gewichten 0–2 (1 = neutraal). */
  attackingFullbacks: number;
  scoringMidfielders: number;
  trueStrikers: number;
  penaltyBonus: number;
  setPieceBonus: number;
  nailedBonus: number;
  onlyConfirmedStarters: boolean;
  /** Afwaardering per ronde verder in de toekomst (0–0.3). */
  futureDiscount: number;
  planningHorizon: number;
  blockedPlayerIds: string[];
  favoritePlayerIds: string[];
  /** Bewust bewaren voor later: niet nu inzetten. */
  savedPlayerIds: string[];
  savedClubIds: string[];
}

export const DEFAULT_PREFERENCES: Preferences = {
  riskProfile: "balanced",
  attackingFullbacks: 1.3,
  scoringMidfielders: 1.3,
  trueStrikers: 1.2,
  penaltyBonus: 1.2,
  setPieceBonus: 1.1,
  nailedBonus: 1.2,
  onlyConfirmedStarters: false,
  futureDiscount: 0.06,
  planningHorizon: 8,
  blockedPlayerIds: [],
  favoritePlayerIds: [],
  savedPlayerIds: [],
  savedClubIds: [],
};

/** Eén factor in de opbouw van een score, gebruikt voor de uitleg. */
export interface ScoreFactor {
  key: string;
  label: string;
  /** Bijdrage in fantasypunten (kan negatief zijn) of multiplicatief (`kind = "multiplier"`). */
  value: number;
  kind: "points" | "multiplier" | "info";
}

export interface PlayerProjection {
  playerId: string;
  roundId: string;
  fixtureId?: string;
  opponentId?: string;
  isHome?: boolean;
  /** Ruwe verwachte fantasypunten. */
  ev: number;
  /** Standaarddeviatie (spreiding) van de punten. */
  sd: number;
  /** Aanbevelingsscore incl. voorkeuren en risicoprofiel. */
  score: number;
  startProb: number;
  status: LineupStatus;
  pGoal?: number;
  pAssist?: number;
  pCleanSheet?: number;
  pWin?: number;
  /** Verwachte doelpunten/assists in deze wedstrijd. */
  xGoals?: number;
  xAssists?: number;
  minutes?: MinutesProjection;
  /** Veilige ondergrens (P10) en potentiële topscore (P90) uit de simulatie. */
  floor?: number;
  ceiling?: number;
  /** Betrouwbaarheid van de voorspelling 0–1 (lager zonder officiële opstelling of bij twijfel). */
  confidence?: number;
  factors: ScoreFactor[];
  /** Korte Nederlandse uitleg. */
  summary: string;
  available: boolean;
  unavailableReason?: string;
}

export interface Squad {
  playerIds: string[];
  captainId?: string;
}
