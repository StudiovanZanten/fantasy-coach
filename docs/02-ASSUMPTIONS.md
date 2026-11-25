# Aannames

Deze aannames zijn gemaakt omdat ze de architectuur niet wezenlijk veranderen. Ze zijn allemaal
aanpasbaar.

## Product

| # | Aanname | Waar aan te passen |
| --- | --- | --- |
| A1 | Een Champ Coach-"ronde" is een **deelronde** (bijv. dinsdag 21:00). Een speeldag bestaat uit meerdere deelrondes. | `fantasy_game_rules.round_scope`, admin |
| A2 | Champ Coach-puntentelling is een benadering (goal, assist, clean sheet, minuten, kaarten). De exacte puntentabel van de aanbieder is configureerbaar en niet gekopieerd. | Admin → Spelregels → Puntentelling |
| A3 | Captain telt 200%, sommige rondes 300% (`captain_multiplier_overrides` per ronde). | Admin |
| A4 | TopCoach Eredivisie: 15 spelers (2/5/5/3), 11 opstellen, budget €100 mln, max. 3 per club, 1 gratis transfer per ronde. Dit zijn **demo-instellingen**. | Admin |
| A5 | Darts WK: demo-toernooi met 32 deelnemers (in werkelijkheid 96/128). Selectie van 8 darters, budget 60, captain 2×. | Admin / seed |
| A6 | Verwachte punten voor toekomstige rondes worden afgewaardeerd (onzekerheid: blessures, rotatie, vorm). Standaard 6% per ronde verder weg. | Voorkeuren → Planning |

## Data

| # | Aanname |
| --- | --- |
| D1 | Er zijn nog geen API-sleutels. Alle wedstrijd- en spelerdata komt uit **seeddata** achter de `SeedDataAdapter`. In de UI staat dan een "Demodata"-label. |
| D2 | Clubnamen en spelersnamen zijn realistisch, maar statistieken, prijzen, odds en opstellingen zijn **gegenereerd**. Selecties kunnen verouderd zijn. |
| D3 | De "huidige datum" in demomodus is vast (`DEMO_NOW` in de seed), zodat deadlines en opstellingschecks altijd demonstreerbaar zijn. |

## Techniek

| # | Aanname |
| --- | --- |
| T1 | **Zonder Supabase-configuratie draait de app in demomodus**: account en gebruikersgegevens worden lokaal in de browser bewaard (localStorage). Met `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY` wordt Supabase Auth gebruikt. |
| T2 | De aanbevelingsmotor draait server-side in API-routes (stateless: de client stuurt zijn gebruikersstatus mee). Daardoor werkt hij identiek met of zonder database. |
| T3 | Optimalisatie gebeurt met integer linear programming (`javascript-lp-solver`, pure JS, werkt op Vercel zonder native binaries). |
| T4 | Notificaties, cronjobs, realtime en queues zijn **voorbereid** (interfaces, tabellen, Vercel-cronconfig, route-handlers), maar versturen in de MVP nog geen pushberichten. Dit is in de UI gemarkeerd. |
| T5 | Screenshotimport is een **toekomstige module**: de flow (herkennen → gebruiker controleert → pas dan toevoegen) is gebouwd met een handmatige tekstinvoer als OCR-stand-in. |
