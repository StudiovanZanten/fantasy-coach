# Datamodel

Het volledige schema staat in [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
De TypeScript-tegenhangers staan in `src/engine/types.ts` (domein) en `src/data/adapters/types.ts`.

## Groepen

```
Referentiedata (gedeeld, alleen admins schrijven)
  sports ─┬─ competitions ── seasons
          ├─ fantasy_games ── fantasy_game_rules (JSONB RuleSet, versies)
          │        └── rounds (deadline, captain-override, wedstrijd van de ronde)
          ├─ clubs_or_teams
          └─ players ─┬─ player_positions (per spel: positie, prijs, waardeverandering)
                      ├─ player_roles (strafschop, vrije trap, hoekschop, wingback …)
                      ├─ player_statistics (per wedstrijd/seizoen, voetbal + darts)
                      ├─ predicted_lineups / confirmed_lineups (per fixture)
                      └─ injuries_and_suspensions
  fixtures ── betting_probabilities
  data_sources ── data_import_logs

Gebruikersdata (RLS: user_id = auth.uid())
  users ── user_preferences
     └── user_game_entries (per spel; persoonlijke regel-overrides)
            ├── user_squads (per ronde; varianten chosen/safe/aggressive/final)
            │      ├── user_squad_players
            │      └── captains
            ├── used_players (eenmalig-gebruikregels)
            └── transfers
     ├── recommendations ── recommendation_explanations
     └── notifications
```

## Keuzes

- **Regels als JSONB met versies**: de admin kan regels aanpassen zonder migratie; oude
  aanbevelingen blijven herleidbaar via `engine_version` en de regelversie.
- **`player_positions` per spel**: dezelfde speler kan in Champ Coach MID zijn en bij een andere
  aanbieder FWD, met een eigen prijs.
- **`used_players` met primaire sleutel (entry, speler)**: de database dwingt eenmalig gebruik af.
- **Darts in hetzelfde model**: darters zijn `players` zonder club; partijen zijn `fixtures` met
  `bracket_round` en `bracket_slot`.
- **Geen externe inloggegevens**: er bestaat geen kolom voor; de app vraagt er nooit om.

## Indexen
Op alle veelgebruikte paden: rondes per spel op deadline, fixtures per ronde/aftrap, actieve
blessures, statistieken per speler op datum, ongelezen en te versturen notificaties,
aanbevelingen per gebruiker en ronde.
