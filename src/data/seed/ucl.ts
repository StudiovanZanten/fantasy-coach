/**
 * DEMODATA – Champions League league phase.
 * Clubs en spelersnamen zijn realistisch, maar selecties kunnen verouderd zijn.
 * Statistieken, odds, opstellingen en uitslagen worden gegenereerd (zie generate.ts).
 *
 * Tuple: [naam, positie, niveau 1–5, rollen, basiskans]
 * Rollen: P=eerste penaltynemer, p=tweede, F=vrije trappen, C=hoekschoppen,
 *         B=aanvallende back, W=wingback, A=aanvallende middenvelder, D=controleur, S=spits, X=vleugelspeler
 */
export type PlayerSpec = [string, "GK" | "DEF" | "MID" | "FWD", number, string, number];
export interface ClubSpec {
  id: string;
  name: string;
  shortName: string;
  attack: number;
  defense: number;
  color: string;
  players: PlayerSpec[];
}

export const UCL_CLUBS: ClubSpec[] = [
  { id: "rma", name: "Real Madrid", shortName: "Real", attack: 1.35, defense: 0.8, color: "#e5e7eb", players: [
    ["Thibaut Courtois", "GK", 5, "", 0.95], ["Dani Carvajal", "DEF", 3, "B", 0.6], ["Antonio Rüdiger", "DEF", 3, "", 0.8], ["Dean Huijsen", "DEF", 3, "", 0.85], ["Trent Alexander-Arnold", "DEF", 4, "BFC", 0.75],
    ["Jude Bellingham", "MID", 5, "A", 0.9], ["Federico Valverde", "MID", 4, "", 0.92], ["Aurélien Tchouaméni", "MID", 3, "D", 0.85], ["Arda Güler", "MID", 4, "AFC", 0.6],
    ["Kylian Mbappé", "FWD", 5, "SP", 0.95], ["Vinícius Júnior", "FWD", 5, "X", 0.9], ["Rodrygo", "FWD", 3, "X", 0.5] ] },
  { id: "bar", name: "FC Barcelona", shortName: "Barça", attack: 1.4, defense: 0.88, color: "#a50044", players: [
    ["Joan García", "GK", 4, "", 0.9], ["Jules Koundé", "DEF", 4, "B", 0.9], ["Pau Cubarsí", "DEF", 3, "", 0.9], ["Alejandro Balde", "DEF", 3, "B", 0.75], ["Eric García", "DEF", 3, "", 0.7],
    ["Pedri", "MID", 5, "A", 0.92], ["Frenkie de Jong", "MID", 4, "", 0.85], ["Dani Olmo", "MID", 4, "A", 0.6], ["Fermín López", "MID", 3, "A", 0.55],
    ["Robert Lewandowski", "FWD", 4, "SP", 0.7], ["Raphinha", "FWD", 5, "XFC", 0.85], ["Lamine Yamal", "FWD", 5, "X", 0.92] ] },
  { id: "atm", name: "Atlético Madrid", shortName: "Atlético", attack: 1.18, defense: 0.75, color: "#cb3524", players: [
    ["Jan Oblak", "GK", 4, "", 0.95], ["Marcos Llorente", "DEF", 3, "B", 0.85], ["Robin Le Normand", "DEF", 3, "", 0.85], ["Dávid Hancko", "DEF", 3, "", 0.85], ["Matteo Ruggeri", "DEF", 3, "W", 0.6],
    ["Koke", "MID", 3, "D", 0.6], ["Pablo Barrios", "MID", 3, "", 0.85], ["Álex Baena", "MID", 4, "AFC", 0.85], ["Giuliano Simeone", "MID", 3, "A", 0.75],
    ["Julián Álvarez", "FWD", 5, "SPF", 0.93], ["Antoine Griezmann", "FWD", 4, "", 0.6], ["Alexander Sørloth", "FWD", 3, "S", 0.5] ] },
  { id: "bay", name: "Bayern München", shortName: "Bayern", attack: 1.48, defense: 0.8, color: "#dc052d", players: [
    ["Manuel Neuer", "GK", 4, "", 0.95], ["Dayot Upamecano", "DEF", 3, "", 0.9], ["Jonathan Tah", "DEF", 3, "", 0.9], ["Alphonso Davies", "DEF", 3, "B", 0.55], ["Konrad Laimer", "DEF", 3, "B", 0.8],
    ["Joshua Kimmich", "MID", 4, "CF", 0.95], ["Jamal Musiala", "MID", 5, "A", 0.5], ["Michael Olise", "MID", 5, "AFC", 0.9], ["Leon Goretzka", "MID", 3, "", 0.6],
    ["Harry Kane", "FWD", 5, "SP", 0.95], ["Luis Díaz", "FWD", 4, "X", 0.85], ["Serge Gnabry", "FWD", 3, "X", 0.6] ] },
  { id: "bvb", name: "Borussia Dortmund", shortName: "Dortmund", attack: 1.1, defense: 1.0, color: "#fde100", players: [
    ["Gregor Kobel", "GK", 3, "", 0.95], ["Nico Schlotterbeck", "DEF", 3, "", 0.85], ["Niklas Süle", "DEF", 2, "", 0.5], ["Julian Ryerson", "DEF", 3, "W", 0.85], ["Daniel Svensson", "DEF", 2, "W", 0.7],
    ["Julian Brandt", "MID", 3, "AF", 0.75], ["Felix Nmecha", "MID", 3, "", 0.8], ["Pascal Groß", "MID", 3, "CF", 0.8], ["Marcel Sabitzer", "MID", 3, "", 0.6],
    ["Serhou Guirassy", "FWD", 4, "SP", 0.9], ["Karim Adeyemi", "FWD", 3, "X", 0.7], ["Maximilian Beier", "FWD", 3, "", 0.6] ] },
  { id: "lev", name: "Bayer Leverkusen", shortName: "Leverkusen", attack: 1.15, defense: 0.92, color: "#e32221", players: [
    ["Mark Flekken", "GK", 3, "", 0.95], ["Edmond Tapsoba", "DEF", 3, "", 0.9], ["Jarell Quansah", "DEF", 3, "", 0.85], ["Álex Grimaldo", "DEF", 4, "WFC", 0.9], ["Arthur", "DEF", 2, "W", 0.6],
    ["Aleix García", "MID", 3, "D", 0.85], ["Robert Andrich", "MID", 3, "", 0.6], ["Malik Tillman", "MID", 3, "A", 0.8], ["Ibrahim Maza", "MID", 3, "A", 0.6],
    ["Patrik Schick", "FWD", 4, "SP", 0.8], ["Christian Kofane", "FWD", 2, "S", 0.5], ["Claudio Echeverri", "FWD", 3, "X", 0.5] ] },
  { id: "mci", name: "Manchester City", shortName: "City", attack: 1.38, defense: 0.8, color: "#6cabdd", players: [
    ["Gianluigi Donnarumma", "GK", 4, "", 0.95], ["Joško Gvardiol", "DEF", 3, "B", 0.9], ["Rúben Dias", "DEF", 3, "", 0.85], ["Abdukodir Khusanov", "DEF", 2, "", 0.7], ["Matheus Nunes", "DEF", 3, "B", 0.7],
    ["Rodri", "MID", 4, "D", 0.6], ["Tijjani Reijnders", "MID", 4, "A", 0.85], ["Phil Foden", "MID", 4, "A", 0.7], ["Rayan Cherki", "MID", 4, "AFC", 0.6],
    ["Erling Haaland", "FWD", 5, "SP", 0.95], ["Jérémy Doku", "FWD", 4, "X", 0.75], ["Omar Marmoush", "FWD", 3, "", 0.4] ] },
  { id: "ars", name: "Arsenal", shortName: "Arsenal", attack: 1.3, defense: 0.68, color: "#ef0107", players: [
    ["David Raya", "GK", 4, "", 0.95], ["William Saliba", "DEF", 4, "", 0.9], ["Gabriel Magalhães", "DEF", 4, "", 0.9], ["Jurriën Timber", "DEF", 3, "B", 0.85], ["Riccardo Calafiori", "DEF", 3, "B", 0.6],
    ["Declan Rice", "MID", 4, "FC", 0.95], ["Martin Ødegaard", "MID", 4, "AC", 0.7], ["Martín Zubimendi", "MID", 3, "D", 0.9], ["Eberechi Eze", "MID", 4, "AF", 0.7],
    ["Viktor Gyökeres", "FWD", 4, "SP", 0.85], ["Bukayo Saka", "FWD", 5, "Xp", 0.9], ["Gabriel Martinelli", "FWD", 3, "X", 0.5] ] },
  { id: "liv", name: "Liverpool", shortName: "Liverpool", attack: 1.32, defense: 0.88, color: "#c8102e", players: [
    ["Alisson Becker", "GK", 4, "", 0.95], ["Virgil van Dijk", "DEF", 4, "", 0.95], ["Ibrahima Konaté", "DEF", 3, "", 0.85], ["Jeremie Frimpong", "DEF", 3, "B", 0.6], ["Milos Kerkez", "DEF", 3, "B", 0.75],
    ["Dominik Szoboszlai", "MID", 4, "AF", 0.9], ["Alexis Mac Allister", "MID", 3, "", 0.75], ["Ryan Gravenberch", "MID", 3, "", 0.9], ["Florian Wirtz", "MID", 4, "AC", 0.85],
    ["Mohamed Salah", "FWD", 5, "XP", 0.85], ["Alexander Isak", "FWD", 4, "S", 0.6], ["Hugo Ekitiké", "FWD", 4, "S", 0.65] ] },
  { id: "che", name: "Chelsea", shortName: "Chelsea", attack: 1.18, defense: 0.9, color: "#034694", players: [
    ["Robert Sánchez", "GK", 3, "", 0.9], ["Reece James", "DEF", 4, "BF", 0.6], ["Marc Cucurella", "DEF", 3, "B", 0.85], ["Levi Colwill", "DEF", 3, "", 0.5], ["Trevoh Chalobah", "DEF", 3, "", 0.8],
    ["Enzo Fernández", "MID", 4, "AC", 0.9], ["Moisés Caicedo", "MID", 3, "D", 0.92], ["Cole Palmer", "MID", 5, "APF", 0.6], ["Andrey Santos", "MID", 2, "", 0.5],
    ["João Pedro", "FWD", 4, "S", 0.85], ["Pedro Neto", "FWD", 3, "X", 0.75], ["Alejandro Garnacho", "FWD", 3, "X", 0.55] ] },
  { id: "psg", name: "Paris Saint-Germain", shortName: "PSG", attack: 1.42, defense: 0.8, color: "#004170", players: [
    ["Lucas Chevalier", "GK", 3, "", 0.9], ["Achraf Hakimi", "DEF", 4, "B", 0.9], ["Marquinhos", "DEF", 3, "", 0.85], ["Willian Pacho", "DEF", 3, "", 0.9], ["Nuno Mendes", "DEF", 4, "B", 0.9],
    ["Vitinha", "MID", 4, "FC", 0.92], ["João Neves", "MID", 4, "", 0.9], ["Fabián Ruiz", "MID", 3, "", 0.7], ["Warren Zaïre-Emery", "MID", 2, "", 0.4],
    ["Ousmane Dembélé", "FWD", 5, "SP", 0.7], ["Khvicha Kvaratskhelia", "FWD", 5, "X", 0.9], ["Désiré Doué", "FWD", 4, "X", 0.65] ] },
  { id: "int", name: "Inter", shortName: "Inter", attack: 1.18, defense: 0.75, color: "#0068a8", players: [
    ["Yann Sommer", "GK", 3, "", 0.95], ["Alessandro Bastoni", "DEF", 3, "", 0.9], ["Francesco Acerbi", "DEF", 2, "", 0.6], ["Denzel Dumfries", "DEF", 4, "W", 0.85], ["Federico Dimarco", "DEF", 4, "WFC", 0.8],
    ["Nicolò Barella", "MID", 4, "", 0.9], ["Hakan Çalhanoğlu", "MID", 4, "DPFC", 0.85], ["Henrikh Mkhitaryan", "MID", 3, "", 0.6], ["Piotr Zieliński", "MID", 2, "", 0.4],
    ["Lautaro Martínez", "FWD", 5, "Sp", 0.92], ["Marcus Thuram", "FWD", 4, "S", 0.75], ["Ange-Yoan Bonny", "FWD", 3, "", 0.4] ] },
  { id: "juv", name: "Juventus", shortName: "Juventus", attack: 1.0, defense: 0.85, color: "#9ca3af", players: [
    ["Michele Di Gregorio", "GK", 3, "", 0.95], ["Gleison Bremer", "DEF", 3, "", 0.85], ["Pierre Kalulu", "DEF", 3, "", 0.85], ["Andrea Cambiaso", "DEF", 3, "W", 0.85], ["Lloyd Kelly", "DEF", 2, "", 0.7],
    ["Manuel Locatelli", "MID", 3, "D", 0.9], ["Teun Koopmeiners", "MID", 3, "AF", 0.6], ["Khéphren Thuram", "MID", 3, "", 0.8], ["Francisco Conceição", "MID", 3, "AC", 0.7],
    ["Dušan Vlahović", "FWD", 4, "SP", 0.6], ["Kenan Yıldız", "FWD", 4, "XF", 0.9], ["Jonathan David", "FWD", 3, "S", 0.5] ] },
  { id: "psv", name: "PSV", shortName: "PSV", attack: 1.0, defense: 1.1, color: "#ed1c24", players: [
    ["Matěj Kovář", "GK", 3, "", 0.95], ["Ryan Flamingo", "DEF", 3, "", 0.9], ["Armando Obispo", "DEF", 2, "", 0.75], ["Sergiño Dest", "DEF", 3, "B", 0.6], ["Mauro Júnior", "DEF", 3, "B", 0.75],
    ["Joey Veerman", "MID", 4, "AFC", 0.9], ["Guus Til", "MID", 3, "AP", 0.85], ["Ismael Saibari", "MID", 3, "A", 0.85], ["Jerdy Schouten", "MID", 2, "D", 0.8],
    ["Ivan Perišić", "FWD", 3, "X", 0.8], ["Ricardo Pepi", "FWD", 3, "S", 0.7], ["Dennis Man", "FWD", 3, "X", 0.6] ] },
  { id: "fey", name: "Feyenoord", shortName: "Feyenoord", attack: 0.92, defense: 1.15, color: "#e2001a", players: [
    ["Timon Wellenreuther", "GK", 3, "", 0.95], ["Tsuyoshi Watanabe", "DEF", 3, "", 0.9], ["Gernot Trauner", "DEF", 3, "", 0.75], ["Gijs Smal", "DEF", 3, "B", 0.85], ["Jordan Bos", "DEF", 2, "B", 0.6],
    ["Hwang In-beom", "MID", 3, "", 0.85], ["Quinten Timber", "MID", 3, "FC", 0.9], ["Sem Steijn", "MID", 3, "A", 0.75], ["Luciano Valente", "MID", 3, "A", 0.6],
    ["Ayase Ueda", "FWD", 4, "SP", 0.9], ["Anis Hadj Moussa", "FWD", 3, "X", 0.8], ["Gonçalo Borges", "FWD", 3, "X", 0.5] ] },
  { id: "ben", name: "Benfica", shortName: "Benfica", attack: 1.0, defense: 1.0, color: "#e83030", players: [
    ["Anatoliy Trubin", "GK", 3, "", 0.95], ["Nicolás Otamendi", "DEF", 3, "", 0.9], ["António Silva", "DEF", 3, "", 0.85], ["Samuel Dahl", "DEF", 2, "B", 0.7], ["Amar Dedić", "DEF", 3, "B", 0.8],
    ["Fredrik Aursnes", "MID", 3, "", 0.85], ["Richard Ríos", "MID", 3, "", 0.8], ["Heorhiy Sudakov", "MID", 3, "AFC", 0.8], ["Leandro Barreiro", "MID", 2, "", 0.5],
    ["Vangelis Pavlidis", "FWD", 4, "SP", 0.9], ["Dodi Lukebakio", "FWD", 3, "X", 0.75], ["Franjo Ivanović", "FWD", 2, "", 0.4] ] },
  { id: "bru", name: "Club Brugge", shortName: "Brugge", attack: 0.86, defense: 1.15, color: "#0066b3", players: [
    ["Simon Mignolet", "GK", 3, "", 0.95], ["Joel Ordóñez", "DEF", 3, "", 0.9], ["Brandon Mechele", "DEF", 2, "", 0.85], ["Joaquin Seys", "DEF", 2, "B", 0.75], ["Kyriani Sabbe", "DEF", 2, "B", 0.6],
    ["Raphael Onyedika", "MID", 2, "D", 0.85], ["Hans Vanaken", "MID", 3, "APFC", 0.9], ["Aleksandar Stanković", "MID", 2, "", 0.6], ["Hugo Vetlesen", "MID", 2, "A", 0.5],
    ["Christos Tzolis", "FWD", 3, "X", 0.85], ["Carlos Forbs", "FWD", 3, "X", 0.8], ["Nicolò Tresoldi", "FWD", 3, "S", 0.7] ] },
  { id: "cel", name: "Celtic", shortName: "Celtic", attack: 0.8, defense: 1.25, color: "#018749", players: [
    ["Kasper Schmeichel", "GK", 3, "", 0.95], ["Cameron Carter-Vickers", "DEF", 3, "", 0.85], ["Auston Trusty", "DEF", 2, "", 0.8], ["Alistair Johnston", "DEF", 2, "B", 0.85], ["Kieran Tierney", "DEF", 2, "B", 0.6],
    ["Callum McGregor", "MID", 3, "FC", 0.92], ["Reo Hatate", "MID", 3, "A", 0.7], ["Arne Engels", "MID", 3, "AP", 0.75], ["Benjamin Nygren", "MID", 2, "A", 0.6],
    ["Daizen Maeda", "FWD", 3, "X", 0.85], ["Adam Idah", "FWD", 2, "S", 0.5], ["Johnny Kenny", "FWD", 2, "S", 0.5] ] },
];

/**
 * Champ Coach-rondes (Scorito-indeling 1A … 4A). Elke ronde = één CL-speeldag over dinsdag en
 * woensdag; de gebruiker kan filteren op dag en aftrapuur. Datums zijn DEMO.
 * [label, speeldag, dinsdag, woensdag]
 */
export const UCL_ROUNDS: [string, number, string, string][] = [
  ["1A", 1, "2026-09-15", "2026-09-16"],
  ["1B", 2, "2026-09-29", "2026-09-30"],
  ["1C", 3, "2026-10-20", "2026-10-21"],
  ["2A", 4, "2026-11-03", "2026-11-04"],
  ["2B", 5, "2026-12-08", "2026-12-09"],
  ["3A", 6, "2026-12-15", "2026-12-16"],
  ["3B", 7, "2027-01-19", "2027-01-20"],
  ["4A", 8, "2027-01-26", "2027-01-27"],
];

/** Demo: superronde (captain 300%) en clubs die in de laatste ronde al geplaatst zijn. */
export const UCL_SUPER_ROUND = "4A";
export const UCL_QUALIFIED_BEFORE_LAST = ["bay", "ars", "liv"];

/** Spelers die de demogebruiker in ronde 1A–1C al heeft gebruikt (namen). Ronde 2A volgt uit zijn team. */
export const UCL_DEMO_USED_MD1_3 = [
  "Kylian Mbappé", "Harry Kane", "Erling Haaland", "Lautaro Martínez", "Ousmane Dembélé", "Mohamed Salah",
  "Viktor Gyökeres", "Serhou Guirassy", "Vangelis Pavlidis", "Lamine Yamal",
  "Michael Olise", "Jude Bellingham", "Declan Rice", "Pedri", "Joey Veerman", "Hans Vanaken", "Vitinha", "Nicolò Barella",
  "Achraf Hakimi", "William Saliba", "Virgil van Dijk", "Jules Koundé", "Federico Dimarco", "Nuno Mendes", "Gabriel Magalhães", "Joško Gvardiol",
  "David Raya", "Thibaut Courtois", "Yann Sommer",
];
