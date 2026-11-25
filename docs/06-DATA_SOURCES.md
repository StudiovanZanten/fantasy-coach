# Databronnen

De app gebruikt nu uitsluitend **seeddata** (`SeedDataAdapter`, `isMock = true`). Hieronder staan
bronnen die later per datatype gekoppeld kunnen worden. Controleer altijd de actuele
gebruiksvoorwaarden en licentie voordat je een bron koppelt; scrape niet zonder toestemming en
respecteer robots.txt.

| Datatype | Mogelijke bronnen (licentie vereist) | Opmerkingen |
| --- | --- | --- |
| Wedstrijdschema's, uitslagen | API-Football, Sportmonks, football-data.org, Opta/Stats Perform | football-data.org heeft een gratis tier voor grote competities |
| Officiële opstellingen | API-Football, Sportmonks, Opta | Komen ±60 min voor aftrap; adapter pollt via cron |
| Verwachte opstellingen | Handmatig/redactioneel, Sportmonks predictions | Altijd als "VERWACHTE BASIS" tonen |
| Spelerstatistieken, xG/xA | Opta/Stats Perform, Sportmonks, StatsBomb (commercieel) | |
| Blessures en schorsingen | API-Football, Sportmonks, clubberichten | |
| Bookmakerskansen | The Odds API, Betfair Exchange API, Pinnacle (licentie) | Kansen normaliseren (marge eruit) |
| Fantasyposities en prijzen | Handmatige invoer of CSV/JSON-import door de gebruiker | Geen ongeautoriseerde API's van fantasyaanbieders |
| Darts: uitslagen, gemiddelden | DartsDatabase (toestemming vragen), PDC-publicaties, Sportradar | |
| Darts: loting | PDC-publicaties, handmatige invoer/JSON-import | |

## Adaptercontract
`src/data/adapters/types.ts` beschrijft `DataSourceAdapter`. Een nieuwe bron implementeert
alleen de methodes die hij levert; een `CompositeAdapter` kan bronnen per datatype combineren.
Iedere adapter meldt `meta.isMock` en `meta.updatedAt`, zodat de UI herkomst en actualiteit toont.
