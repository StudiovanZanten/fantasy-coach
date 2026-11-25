# Implementatieplan

## Mappenstructuur

```
src/
  config/app.ts                 Appnaam, tagline, disclaimer (één plek)
  engine/                       Pure domeinlogica, geen UI
    types.ts                    Domeintypes (Player, Fixture, RuleSet, Preferences …)
    rules/                      Zod-schema, validatie van teams, presets
    scoring/                    football.ts, darts.ts, explain.ts
    optimizer/                  ilp.ts (wrapper), round.ts, multiRound.ts, budgetSquad.ts
    lineup/                     statussen + vervangers
    bracket/                    toernooisimulatie darts
    evaluation/                 evaluatie na afloop
  games/                        GameModules + register
  data/
    adapters/                   DataSourceAdapter-interface, SeedDataAdapter
    seed/                       Gegenereerde demodata (gemarkeerd)
    import/                     CSV/JSON-parser + validatie, OCR-stub
    user-state/                 UserStateRepository (local / supabase)
  lib/                          supabase-clients, notificaties, utils
  components/                   ui/ (design system), football/, darts/, layout/
  app/                          Routes (App Router) + api/
supabase/migrations             SQL-schema met RLS
docs/                           Deze documentatie
public/                         PWA-manifest, service worker, iconen
```

## Fases

### Fase 1 – Analyse ✅
Productsamenvatting, aannames, architectuur, datamodel, dit plan.

### Fase 2 – Fundament
1. Next.js + TypeScript + Tailwind v4, design tokens (donker, sportief, frisse accenten).
2. UI-componenten: Button, Card, Badge (statussen), Tabs, Input, Select, Switch, Sheet, Toast.
3. App-shell: mobiele bottom-nav + desktop-zijbalk, spelwisselaar.
4. Auth: Supabase als geconfigureerd, anders demo-account (lokaal).
5. Seeddata: CL-league-phase (18 clubs, 4 resterende speeldagen in deelrondes), Eredivisie
   (18 clubs, 4 speelrondes), WK Darts (32 darters).
6. PWA: manifest, iconen, service worker (offline shell).

### Fase 3 – Voetbal-MVP
1. RuleSet-schema + presets Champ Coach en TopCoach Eredivisie, admin-editor.
2. Scoringsengine met factoren en Nederlandse uitleg.
3. ILP-optimizer: ronde, multi-ronde (bewaaradvies), budgetselectie met transfers.
4. Rondeplanner, Scouting, Team Builder (veld + drag-and-drop), captainadvies.
5. Opstellingencheck + vervangers, Definitief team, Evaluatie.
6. Gebruikte spelers invoeren, CSV/JSON-import.

### Fase 4 – Darts
1. Darters + demo-toernooi, bracket-component.
2. Simulatie van winkansen en routes.
3. Dartsadvies (selectie + captain) met route-uitleg.

### Fase 5 – Kwaliteit
1. Vitest voor engine en import; Playwright-smoketest van de hoofdflow.
2. Loading-, empty- en error-states per route.
3. Toegankelijkheid: focusstijlen, labels, contrast, toetsenbordbediening naast drag-and-drop.
4. README + deploymentinstructies (Vercel + Supabase).

## Definitie van klaar (MVP)
Zie de lijst in het oorspronkelijke verzoek; de status per punt staat in `TODO.md`.
