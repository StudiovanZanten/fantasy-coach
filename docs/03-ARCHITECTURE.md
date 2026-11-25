# Architectuur

## Overzicht

```
┌──────────────────────────── Next.js (App Router, TypeScript) ────────────────────────────┐
│                                                                                          │
│  UI (src/app, src/components)          API-routes (src/app/api)                          │
│  ─ React Server + Client Components    ─ POST /api/recommend      (teamadvies)           │
│  ─ Tailwind, eigen toegankelijke UI    ─ POST /api/lineup-check   (opstellingencheck)    │
│  ─ Zustand-store voor gebruikersstatus ─ POST /api/evaluate       (evaluatie)            │
│         │                              ─ POST /api/darts/route    (bracket-analyse)      │
│         │                              ─ GET  /api/cron/*         (deadlines, line-ups)  │
│         ▼                                         │                                      │
│  UserStateRepository ◄────────────────┐           ▼                                      │
│   ├─ LocalUserStateRepository (demo)  │   Game modules (src/games)                       │
│   └─ SupabaseUserStateRepository      │    ├─ champ-coach                                │
│                                       │    ├─ topcoach-eredivisie                        │
│                                       │    └─ wk-darts                                   │
│                                       │           │                                      │
│                                       │           ▼                                      │
│                                       │   Engine (src/engine) – puur TypeScript, geen UI │
│                                       │    ├─ rules      (schema + validatie)            │
│                                       │    ├─ scoring    (voetbal, darts, uitleg)        │
│                                       │    ├─ optimizer  (ILP: ronde, multi-ronde, budget)│
│                                       │    ├─ lineup     (statussen + vervangers)        │
│                                       │    ├─ bracket    (toernooisimulatie)             │
│                                       │    └─ evaluation                                 │
│                                       │           ▲                                      │
│                                       │           │                                      │
│                                       └── Data-adapters (src/data)                       │
│                                            ├─ DataSourceAdapter-interface                │
│                                            ├─ SeedDataAdapter (demo, gemarkeerd)         │
│                                            ├─ ImportAdapter (CSV / JSON)                 │
│                                            └─ (later) live adapters per bron             │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                     │                                       │
                     ▼                                       ▼
             Supabase Auth + Postgres (RLS)          Vercel Cron → /api/cron/*
```

## Lagen en verantwoordelijkheden

### 1. Engine (`src/engine`)
Pure functies, deterministisch, volledig getest. Kent geen React, geen database en geen
specifiek spel. Krijgt `RuleSet`, spelers, wedstrijden en voorkeuren binnen en geeft
scores, teams en uitleg terug.

### 2. Game modules (`src/games`)
Een spel is een `GameModule`: metadata + standaard `RuleSet` + welke engine-onderdelen het
gebruikt (bijv. `planner: "once-per-phase"` of `"budget-squad"` of `"bracket"`). Een nieuw spel
(Formule 1, wielrennen) = een nieuwe module + eventueel een nieuwe scoringsfunctie. De UI leest
alles via het register (`src/games/registry.ts`).

### 3. Rule engine
Spelregels zijn **data** (`RuleSet`, gevalideerd met Zod), geen code. Ze staan in
`fantasy_game_rules` (JSONB) en kunnen in de beheeromgeving (`/admin/rules`) zonder code worden
aangepast. Gebruikers kunnen daarnaast persoonlijke overrides hebben (bijv. alleen 21:00-wedstrijden).

Regels die de engine kent: formatie per positie, selectiegrootte, opstellingsgrootte, budget,
max. per club, eenmalig gebruik (per fase), captain + multiplier + overrides per ronde,
transfers per ronde, wisselmogelijkheden, ronde-scope (deelronde / speelronde / toernooi),
tijdslotfilter, wedstrijd van de ronde, puntentabel.

### 4. Data-adapterlaag (`src/data`)
`DataSourceAdapter` definieert wat de app nodig heeft (wedstrijden, spelers, statistieken,
opstellingen, blessures, odds, fantasyprijzen). Vandaag levert `SeedDataAdapter` alles uit
gegenereerde demodata. Elke adapter meldt `isMock`, zodat de UI een "Demodata"-label toont.
Live bronnen worden later per datatype gekoppeld (zie `05-DATA_SOURCES.md`).

### 5. Gebruikersstatus (`src/data/user-state`)
Alles wat van de gebruiker is (voorkeuren, gebruikte spelers, teams, captains, evaluaties,
notificatie-instellingen) loopt via `UserStateRepository`. In demomodus is dat localStorage,
met Supabase de tabellen uit `supabase/migrations`.

## Aanbevelingsmotor

### Verwachtingsscore (voetbal)
`EV = P(start) × verwachte minutenfactor × (aanvalswaarde + verdedigingswaarde + spelhervattingen) × wedstrijdcontext × voorkeuren`

- **Aanvalswaarde**: xG/xA per 90 (vorm-gewogen), gecorrigeerd voor tegenstander (verdedigingssterkte),
  thuis/uit en bookmakers-verwachte doelpunten van het team.
- **Verdedigingswaarde**: P(clean sheet) uit odds/teamsterkte × punten voor clean sheet per positie.
- **Win-bonus**: P(winst) × winstpunten.
- **Spelhervattingen**: strafschop-, vrijetrap-, hoekschopnemers krijgen extra xG/xA.
- **Voorkeuren**: multiplicatoren voor aanvallende backs, scorende middenvelders, echte spitsen,
  basiszekerheid; risicoprofiel stuurt de straf op variantie/onzekerheid.

Elke factor wordt als `ScoreFactor` met label en bijdrage bewaard en vormt de uitleg.

### Optimalisatie
Integer linear programming (`src/engine/optimizer`):

- **Eén ronde**: binaire `x_p` (speelt) en `c_p` (captain). Maximaliseer `Σ EV_p·x_p + (m−1)·Σ EV_p·c_p`
  onder formatie-, club-, budget- en beschikbaarheidsconstraints, `c_p ≤ x_p`, `Σ c_p = 1`.
- **Meerdere rondes (eenmalig gebruik)**: `x_{p,r}` per speler per ronde, met `Σ_r x_{p,r} ≤ 1`.
  Toekomstige rondes worden afgewaardeerd met een onzekerheidsfactor. Zo ontstaat een
  advies "bewaar speler X voor ronde Y" wanneer `EV_{p,Y}·korting > EV_{p,nu}` en dat in het
  globale optimum beter uitvalt. Kandidaten worden per positie per ronde voorgeselecteerd
  (top-K) om het model klein en snel te houden.
- **Budgetselectie (TopCoach)**: binaire `s_p` (in selectie) en `x_p` (opgesteld), `x_p ≤ s_p`,
  budget, selectiegrootte, positiequota, clubmax, transferlimiet t.o.v. huidige selectie,
  waarde over een horizon van N rondes.
- **Varianten**: *veilig* (risicoaversie λ>0: EV − λ·σ, hogere weging op basiszekerheid) en
  *aanvallend* (λ<0, extra gewicht op plafond).

### Darts
Bracket-simulatie met winkansen per partij (afgeleid van gemiddelde, checkout%, vorm en
bookmakerskansen via een Elo-achtige logistieke functie). Per darter: kans om elke ronde te
bereiken, verwachte fantasypunten, en de moeilijkste tegenstander op de route. Selectie via
dezelfde ILP (budget + aantal + captain).

## Opstellingencheck
Vanaf 60 minuten voor aftrap: vergelijk het gekozen team met `confirmed_lineups`. Status per
speler: BASIS / BANK / AFWEZIG / ONZEKER / VERWACHTE BASIS. Voor elke niet-starter wordt het
model opnieuw opgelost met de andere spelers vastgezet, zodat de vervanger op dezelfde
fantasypositie komt en alle regels (club, budget, eenmalig gebruik, captain) opnieuw kloppen.

## Achtergrondtaken
- `vercel.json` cron → `/api/cron/deadlines` (elke 15 min) en `/api/cron/lineups` (elke 5 min).
- In de MVP loggen deze routes wat ze zouden versturen. De notificatielaag
  (`src/lib/notifications`) heeft een `NotificationChannel`-interface (web push, e-mail).
- Realtime: Supabase Realtime op `confirmed_lineups` is voorbereid in het datamodel.
- Import-queue: `data_import_logs` met status `queued/running/done/failed`.

## Beveiliging en privacy
- Geen opslag van externe wachtwoorden; er is geen veld voor.
- Row-level security op alle gebruikerstabellen (`user_id = auth.uid()`).
- Referentiedata (spelers, wedstrijden) is leesbaar voor ingelogde gebruikers, schrijfbaar
  alleen voor `service_role` / admins.
- Privacyscherm met export (JSON) en "verwijder al mijn gegevens".

## Uitbreidbaarheid
Nieuwe sport = `SportModule` (posities, scoringsfunctie) + `GameModule`(s). Nieuwe aanbieder =
nieuwe `GameModule` met eigen `RuleSet`. Nieuwe databron = nieuwe adapter die het interface
implementeert.
