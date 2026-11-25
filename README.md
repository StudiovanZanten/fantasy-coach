# Fantasy Coach (werktitel)

Onafhankelijke, persoonlijke assistent voor fantasyvoetbal (TopCoach Eredivisie, Champ Coach) en een voorbereide dartsmodule.
Niet verbonden aan Scorito of een andere aanbieder. Geen inloggegevens van aanbieders, geen merkmaterialen.

## Starten

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest (engine)
npm run typecheck
npm run build
```

Zonder extra configuratie draait de app in **demomodus**: duidelijk gemarkeerde demodata achter de seed-adapter, met een demoklok
om situaties rond de deadline na te spelen. Je gegevens (selectie, gebruikte spelers, voorkeuren) blijven in je browser.

### Optioneel

| Variabele | Effect |
|---|---|
| `ANTHROPIC_API_KEY` | De assistent laat antwoorden door Claude formuleren. De feiten komen altijd uit de eigen engine. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Voorbereid voor synchronisatie (schema in `supabase/migrations`). Nog niet nodig voor persoonlijk gebruik. |

## Deployen (Vercel)

Importeer de repository in Vercel, framework Next.js, geen extra build-instellingen. Voeg eventueel `ANTHROPIC_API_KEY` toe als environment variable.

## Structuur

- `src/engine`: spelregels, xSP-model, ILP-optimalisatie, Champ Coach-planner, TopCoach-adviseur, opstellingencheck, evaluatie, monitoring.
- `src/data`: adapters (nu alleen demodata), identiteitskoppeling.
- `src/app`: schermen per spel en de API-routes (stateless: de browser stuurt zijn status mee).
- `docs/`: product, aannames, architectuur, datamodel, plan, databronnen, TODO.
