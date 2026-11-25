import type { ClubSpec, PlayerSpec } from "./ucl";

/**
 * DEMODATA – Eredivisie 2026/27.
 * Clubs en bekende spelers zijn realistisch maar NIET geverifieerd voor dit seizoen;
 * selecties kunnen verouderd zijn. Waar we een naam niet zeker weten gebruiken we een
 * duidelijk herkenbare placeholder ("Demospeler …") in plaats van een verzonnen naam.
 * Statistieken, prijzen, odds, opstellingen en uitslagen zijn gegenereerd.
 */
const c = (id: string, name: string, shortName: string, attack: number, defense: number, color: string, players: PlayerSpec[]): ClubSpec => ({
  id,
  name,
  shortName,
  attack,
  defense,
  color,
  players,
});

export const ERE_CLUBS: ClubSpec[] = [
  c("psv", "PSV", "PSV", 1.4, 0.75, "#ed1c24", [
    ["Matěj Kovář", "GK", 4, "", 0.95], ["Sergiño Dest", "DEF", 4, "B", 0.75], ["Ryan Flamingo", "DEF", 3, "", 0.9], ["Armando Obispo", "DEF", 3, "", 0.75], ["Mauro Júnior", "DEF", 3, "B", 0.7],
    ["Guus Til", "MID", 4, "AP", 0.9], ["Joey Veerman", "MID", 4, "FC", 0.9], ["Ismael Saibari", "MID", 4, "A", 0.85], ["Jerdy Schouten", "MID", 3, "D", 0.85],
    ["Ricardo Pepi", "FWD", 4, "S", 0.55], ["Ivan Perišić", "FWD", 4, "X", 0.8], ["Dennis Man", "FWD", 3, "X", 0.6] ]),
  c("aja", "Ajax", "Ajax", 1.2, 0.9, "#d2122e", [
    ["Vítězslav Jaroš", "GK", 3, "", 0.95], ["Youri Baas", "DEF", 3, "", 0.9], ["Josip Šutalo", "DEF", 3, "", 0.85], ["Anton Gaaei", "DEF", 3, "B", 0.8], ["Lucas Rosa", "DEF", 3, "B", 0.7],
    ["Davy Klaassen", "MID", 3, "A", 0.75], ["Kenneth Taylor", "MID", 4, "AFC", 0.9], ["Jorthy Mokio", "MID", 3, "", 0.8], ["Branco van den Boomen", "MID", 3, "FC", 0.5],
    ["Wout Weghorst", "FWD", 4, "SP", 0.85], ["Mika Godts", "FWD", 4, "X", 0.85], ["Oliver Edvardsen", "FWD", 3, "X", 0.6] ]),
  c("fey", "Feyenoord", "Feyenoord", 1.25, 0.85, "#e2001a", [
    ["Timon Wellenreuther", "GK", 3, "", 0.95], ["Tsuyoshi Watanabe", "DEF", 3, "", 0.9], ["Gernot Trauner", "DEF", 3, "", 0.75], ["Gijs Smal", "DEF", 3, "B", 0.85], ["Jordan Bos", "DEF", 3, "B", 0.65],
    ["Hwang In-beom", "MID", 3, "", 0.85], ["Quinten Timber", "MID", 3, "FC", 0.9], ["Sem Steijn", "MID", 4, "A", 0.85], ["Luciano Valente", "MID", 3, "A", 0.6],
    ["Ayase Ueda", "FWD", 4, "SP", 0.85], ["Anis Hadj Moussa", "FWD", 4, "X", 0.85], ["Gonçalo Borges", "FWD", 3, "X", 0.5] ]),
  c("az", "AZ", "AZ", 1.15, 0.95, "#c8102e", [
    ["Rome-Jayden Owusu-Oduro", "GK", 3, "", 0.95], ["Alexandre Penetra", "DEF", 3, "", 0.9], ["Wouter Goes", "DEF", 3, "", 0.85], ["Seiya Maikuma", "DEF", 3, "B", 0.85], ["Mees de Wit", "DEF", 3, "B", 0.7],
    ["Jordy Clasie", "MID", 3, "FC", 0.85], ["Peer Koopmeiners", "MID", 3, "", 0.85], ["Sven Mijnans", "MID", 4, "AP", 0.9], ["Kees Smit", "MID", 3, "A", 0.7],
    ["Troy Parrott", "FWD", 4, "S", 0.85], ["Ruben van Bommel", "FWD", 3, "X", 0.75], ["Ibrahim Sadiq", "FWD", 3, "X", 0.6] ]),
  c("twe", "FC Twente", "Twente", 1.1, 0.95, "#e30613", [
    ["Lars Unnerstall", "GK", 3, "", 0.95], ["Mees Hilgers", "DEF", 3, "", 0.85], ["Max Bruns", "DEF", 3, "", 0.85], ["Bart van Rooij", "DEF", 3, "B", 0.85],
    ["Michel Vlap", "MID", 3, "AFC", 0.85], ["Youri Regeer", "MID", 3, "", 0.85], ["Sayfallah Ltaief", "MID", 3, "A", 0.7],
    ["Ricky van Wolfswinkel", "FWD", 3, "SP", 0.75], ["Daan Rots", "FWD", 3, "X", 0.85] ]),
  c("utr", "FC Utrecht", "Utrecht", 1.1, 0.95, "#e4002b", [
    ["Vasilios Barkas", "GK", 3, "", 0.95], ["Mike van der Hoorn", "DEF", 3, "", 0.85], ["Nick Viergever", "DEF", 3, "", 0.75], ["Souffian El Karouani", "DEF", 3, "BFC", 0.85], ["Siebe Horemans", "DEF", 3, "B", 0.75],
    ["Can Bozdogan", "MID", 3, "D", 0.8], ["Gjivai Zechiël", "MID", 3, "", 0.75], ["Paxten Aaronson", "MID", 3, "A", 0.7],
    ["Sébastien Haller", "FWD", 3, "SP", 0.7], ["Yoann Cathline", "FWD", 3, "X", 0.8] ]),
  c("nec", "NEC", "NEC", 1.0, 1.05, "#00a650", [
    ["Philippe Sandler", "DEF", 3, "", 0.85], ["Bram Nuytinck", "DEF", 3, "", 0.8], ["Brayann Pereira", "DEF", 3, "B", 0.8],
    ["Dirk Proper", "MID", 3, "A", 0.85], ["Kodai Sano", "MID", 3, "D", 0.9],
    ["Koki Ogawa", "FWD", 3, "SP", 0.8], ["Basar Önal", "FWD", 3, "X", 0.75], ["Sami Ouaissa", "FWD", 3, "X", 0.7] ]),
  c("gae", "Go Ahead Eagles", "Go Ahead", 0.95, 1.05, "#f6c600", [
    ["Mats Deijl", "DEF", 3, "B", 0.9], ["Joris Kramer", "DEF", 3, "", 0.85], ["Gerrit Nauber", "DEF", 3, "", 0.8],
    ["Evert Linthorst", "MID", 3, "A", 0.85], ["Jakob Breum", "MID", 3, "AFC", 0.8], ["Calvin Twigt", "MID", 2, "D", 0.8],
    ["Milan Smit", "FWD", 3, "SP", 0.8], ["Victor Edvardsen", "FWD", 3, "S", 0.65] ]),
  c("hee", "sc Heerenveen", "Heerenveen", 0.95, 1.1, "#0055a4", [
    ["Andries Noppert", "GK", 3, "", 0.95], ["Hristiyan Petrov", "DEF", 3, "", 0.85], ["Oliver Braude", "DEF", 3, "B", 0.8],
    ["Levi Smans", "MID", 3, "A", 0.85], ["Luuk Brouwers", "MID", 3, "FC", 0.85],
    ["Jacob Trenskow", "FWD", 3, "XP", 0.85], ["Dylan Vente", "FWD", 3, "S", 0.65] ]),
  c("spa", "Sparta Rotterdam", "Sparta", 0.85, 1.1, "#e30613", [
    ["Nick Olij", "GK", 3, "", 0.95], ["Mike Eerdhuijzen", "DEF", 3, "", 0.85], ["Shurandy Sambo", "DEF", 3, "B", 0.8],
    ["Joshua Kitolano", "MID", 3, "A", 0.85], ["Pelle Clement", "MID", 3, "FC", 0.8],
    ["Tobias Lauritsen", "FWD", 3, "SP", 0.85], ["Mitchell van Bergen", "FWD", 3, "X", 0.7] ]),
  c("for", "Fortuna Sittard", "Fortuna", 0.85, 1.15, "#ffd700", [
    ["Mattijs Branderhorst", "GK", 3, "", 0.95], ["Ivo Pinto", "DEF", 3, "B", 0.85], ["Shawn Adewoye", "DEF", 3, "", 0.8],
    ["Justin Lonwijk", "MID", 3, "AFC", 0.8], ["Edouard Michut", "MID", 3, "", 0.75],
    ["Kaj Sierhuis", "FWD", 3, "SP", 0.8], ["Kristoffer Peterson", "FWD", 3, "X", 0.75] ]),
  c("gro", "FC Groningen", "Groningen", 0.9, 1.05, "#00843d", [
    ["Etienne Vaessen", "GK", 3, "", 0.95], ["Marco Rente", "DEF", 3, "", 0.85], ["Thijmen Blokzijl", "DEF", 3, "", 0.85], ["Marvin Peersman", "DEF", 3, "B", 0.8],
    ["Stije Resink", "MID", 3, "A", 0.85], ["Tygo Land", "MID", 3, "", 0.75], ["Leandro Bacuna", "MID", 3, "FC", 0.75],
    ["Thom van Bergen", "FWD", 3, "X", 0.8], ["Brynjólfur Willumsson", "FWD", 3, "SP", 0.75] ]),
  c("pec", "PEC Zwolle", "PEC", 0.85, 1.2, "#005ca9", [["Sherel Floranus", "DEF", 3, "B", 0.85], ["Ryan Thomas", "MID", 3, "AFCP", 0.85]]),
  c("her", "Heracles Almelo", "Heracles", 0.85, 1.25, "#000000", [["Thomas Bruns", "MID", 3, "A", 0.8], ["Jizz Hornkamp", "FWD", 3, "SP", 0.75]]),
  c("nac", "NAC Breda", "NAC", 0.8, 1.2, "#ffd200", [["Boy Kemper", "DEF", 2, "B", 0.8], ["Clint Leemans", "MID", 3, "FC", 0.8], ["Sydney van Hooijdonk", "FWD", 3, "SP", 0.7]]),
  c("exc", "Excelsior", "Excelsior", 0.8, 1.25, "#e30613", [["Stijn van Gassel", "GK", 2, "", 0.95], ["Noah Naujoks", "MID", 2, "A", 0.75], ["Gyan de Regt", "FWD", 2, "X", 0.75]]),
  c("tel", "Telstar", "Telstar", 0.75, 1.3, "#ffffff", []),
  c("vol", "FC Volendam", "Volendam", 0.75, 1.3, "#f39200", [["Robert Mühren", "FWD", 3, "SP", 0.8]]),
];

/** Doelaantal per club; ontbrekende plekken worden gevuld met placeholders. */
export const ERE_SLOTS = { GK: 2, DEF: 5, MID: 5, FWD: 4 } as const;

/** Speelrondes: [nummer, vrijdag (YYYY-MM-DD), captain-multiplier-override?]. Ronde 13 is gespeeld. */
export const ERE_ROUNDS: [number, string, number?][] = [
  [13, "2026-11-20"],
  [14, "2026-11-27"],
  [15, "2026-12-04"],
  [16, "2026-12-11", 3],
  [17, "2026-12-18"],
];

/** Blessures en bijzonderheden (demo). */
export const ERE_AVAILABILITY: Record<string, import("@/engine/types").Availability> = {
  "Ricardo Pepi": { status: "returning", recovery: "team_training", note: "hervat groepstraining, wordt opgebouwd" },
  "Mika Godts": { status: "injured", recovery: "rehab", note: "enkelblessure", expectedReturn: "2027-01-15" },
  "Ayase Ueda": { status: "doubtful", recovery: "individual_training", note: "spierklachten, traint individueel" },
  "Kees Smit": { status: "not_in_squad", reasonKnown: false },
  "Sébastien Haller": { status: "suspended", note: "geschorst (5 gele kaarten)", expectedReturn: "2026-12-04" },
};

/**
 * Testcase: de laatst bekende selectie van de gebruiker (historische invoer, geen advies).
 * Alleen namen zoals de gebruiker ze gaf. Spelers die we niet eenduidig aan een seedspeler
 * kunnen koppelen blijven "niet gekoppeld" tot de gebruiker club en identiteit bevestigt.
 */
export const TESTCASE_SQUAD: { input: string; position: "GK" | "DEF" | "MID" | "FWD" }[] = [
  { input: "De Busser", position: "GK" },
  { input: "Koeman jr.", position: "GK" },
  { input: "Dest", position: "DEF" },
  { input: "Kuipers", position: "DEF" },
  { input: "Widell", position: "DEF" },
  { input: "Caschili", position: "DEF" },
  { input: "Ivo Pinto", position: "DEF" },
  { input: "Til", position: "MID" },
  { input: "Brandt", position: "MID" },
  { input: "Suray", position: "MID" },
  { input: "Van der Werff", position: "MID" },
  { input: "Yegoian", position: "MID" },
  { input: "Weidmann", position: "MID" },
  { input: "Ferri", position: "FWD" },
  { input: "Trenskow", position: "FWD" },
  { input: "Van Bergen", position: "FWD" },
  { input: "Stepanov", position: "FWD" },
  { input: "Pepi", position: "FWD" },
];

/** Laatst gedeelde opstelling (3-3-4, captain Til). */
export const TESTCASE_LINEUP = {
  starters: ["De Busser", "Dest", "Ivo Pinto", "Widell", "Til", "Suray", "Yegoian", "Ferri", "Pepi", "Trenskow", "Van Bergen"],
  bench: ["Koeman jr.", "Weidmann", "Van der Werff", "Stepanov"],
  captain: "Til",
};
