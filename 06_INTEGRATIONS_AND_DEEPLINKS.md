# Integrations and Deep Links

## Principio

La app debe combinar:

1. APIs reales cuando existan.
2. RSS cuando sea suficiente.
3. Deep links cuando no se pueda integrar legalmente.
4. Entrada manual cuando haga falta.

## Prohibido

No hacer:

- scraping
- Selenium
- Playwright para extraer datos
- bots sobre LinkedIn
- automatizar sesiones privadas

## Plataformas de empleo iniciales

| Plataforma | Tipo | Uso inicial |
|---|---|---|
| LinkedIn | deeplink | Abrir búsqueda precargada |
| InfoJobs | api + deeplink | API preparada + búsqueda directa |
| Indeed | deeplink | Abrir búsqueda precargada |
| Tecnoempleo | rss + deeplink | RSS preparado + búsqueda directa |
| Adzuna | api | API preparada |
| Jooble | api | API preparada |
| Remotive | api | API preparada para remoto |
| JobToday | deeplink | Abrir búsqueda precargada |
| Talent.com | deeplink / futuro partner | Búsqueda directa |
| Welcome to the Jungle | deeplink / futuro partner | Búsqueda directa |

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

INFOJOBS_CLIENT_ID=
INFOJOBS_CLIENT_SECRET=

ADZUNA_APP_ID=
ADZUNA_APP_KEY=

JOOBLE_API_KEY=
```

## Modelo normalizado

```ts
export type NormalizedOpportunity = {
  source: string
  source_type: 'api' | 'rss' | 'deeplink' | 'manual'
  title: string
  company?: string
  description?: string
  location?: string
  province?: string
  remote?: boolean
  url: string
  published_at?: string
  detected_at?: string
  category?: string
  tags?: string[]
  level?: string
  salary_min?: number
  salary_max?: number
  status?: string
  score?: number
  external_id?: string
  unique_hash?: string
}
```

## Función de deep links

Crear:

```ts
buildJobSearchUrl(platform: string, keyword: string, location?: string): string
```

## Búsquedas rápidas iniciales

- Desarrollador Web Junior en Granada
- Java Junior en Granada
- Backend Junior en Granada
- React Junior en Málaga
- Prácticas DAW en Granada
- Desarrollador Full Stack Junior remoto
- Spring Boot Junior remoto
- Programador Junior Andalucía
- Frontend Junior remoto
- SQL Junior Granada

## Ejemplos conceptuales

### LinkedIn

```txt
https://www.linkedin.com/jobs/search/?keywords=desarrollador%20web%20junior&location=Granada
```

### Indeed

```txt
https://es.indeed.com/jobs?q=desarrollador+web+junior&l=Granada
```

## Collectors

Crear:

```txt
lib/integrations/infojobs.ts
lib/integrations/adzuna.ts
lib/integrations/jooble.ts
lib/integrations/remotive.ts
lib/integrations/tecnoempleo-rss.ts
```

Cada collector debe:

- exportar `collect()`
- devolver `NormalizedOpportunity[]`
- capturar errores
- si falta API key, devolver array vacío
- no romper la app

## Scoring básico futuro

| Coincidencia | Puntos |
|---|---:|
| Java | +10 |
| Spring Boot | +8 |
| SQL | +6 |
| React | +6 |
| Junior | +10 |
| Granada | +8 |
| Málaga | +5 |
| Remoto | +5 |
| Prácticas | +7 |
| DAW | +8 |
| Más de 5 años | -15 |
