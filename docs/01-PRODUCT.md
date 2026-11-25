# Fantasy Coach – productsamenvatting

> Werktitel. De naam staat op één plek (`src/config/app.ts`) en kan daar worden aangepast.

Fantasy Coach is een **onafhankelijke fantasy-sportassistent**. De app is geen onderdeel van
Scorito of een andere aanbieder, gebruikt geen merkmaterialen van derden en slaat nooit
inloggegevens van externe platforms op.

## Probleem

Fantasyspelers kiezen per speelronde een team onder strikte spelregels (formatie, clubmaxima,
budget, eenmalig gebruik van spelers, captainmultiplier). De beste keuze hangt niet af van "wie is
de beste speler", maar van **wie in déze wedstrijd, in déze ronde, de meeste verwachte punten
oplevert, rekening houdend met wat je die speler later nog zou kunnen opleveren**.

## Oplossing

Een assistent die het hele proces van een speelronde begeleidt:

| Stap | Scherm | Wat de gebruiker krijgt |
| --- | --- | --- |
| 1 | Onboarding | Spel kiezen, voorkeuren, gebruikte spelers invoeren |
| 2 | Dashboard | Eerstvolgende deadline, openstaande acties, meldingen |
| 3 | Rondeplanner | Wedstrijden van de deelronde, krachtverschil, bewaaradvies |
| 4 | Scouting | Ranglijst met transparante verwachtingsscore en uitleg |
| 5 | Team Builder | Veld, drag-and-drop, automatisch beste team, live regelcontrole |
| 6 | Opstellingencheck | BASIS / BANK / AFWEZIG / ONZEKER + directe vervangers |
| 7 | Definitief team | Volledig team, captain, risico's, "Team gereed", kopiëren |
| 8 | Evaluatie | Punten, captaineffect, gemiste kansen, leerpunten |

## Kernprincipes

1. **Wedstrijdcontext boven naam.** Score = speler × wedstrijd × ronde.
2. **Opportunity cost.** Bij eenmalig gebruik plant de engine meerdere rondes vooruit en adviseert
   expliciet om een speler te *bewaren* als hij later meer oplevert.
3. **Transparantie.** Elke aanbeveling heeft een uitleg in gewone Nederlandse taal en een
   opbouw van de score per factor.
4. **Eerlijk over onzekerheid.** Nooit "100% zeker" zolang de officiële opstelling er niet is.
   Mock- en seeddata zijn altijd zichtbaar gemarkeerd.
5. **De gebruiker beslist.** Externe acties (team invullen bij een aanbieder) doet de gebruiker
   altijd zelf.

## MVP-scope

- Champ Coach (Champions League, eenmalig gebruik, 7 spelers, deelrondes)
- TopCoach Eredivisie (budget, selectie, transfers, captain)
- Darts als module met een demo-toernooi (WK Darts, bracket en route-analyse)

Zie `04-IMPLEMENTATION_PLAN.md` voor de bouwvolgorde en `TODO.md` voor de status.
