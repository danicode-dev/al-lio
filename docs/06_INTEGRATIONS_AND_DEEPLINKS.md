# Integrations and Deep Links

## Principio

AL-LÍO combina:

1. APIs reales cuando hay clave y condiciones de uso claras.
2. RSS cuando basta para obtener información pública.
3. Deep links cuando no conviene integrar una plataforma.
4. Entrada manual cuando el usuario necesita guardar una oportunidad concreta.

## Prohibido

No automatizar sesiones privadas ni hacer scraping agresivo. En particular:

- no bots sobre LinkedIn;
- no scraping de portales cerrados;
- no Playwright/Selenium para extraer datos de terceros;
- no almacenamiento de credenciales externas del usuario.

## Plataformas Iniciales

| Plataforma | Tipo | Uso actual |
|---|---|---|
| LinkedIn | deeplink | Abrir búsqueda precargada |
| InfoJobs | API + deeplink | API preparada + búsqueda directa |
| Indeed | deeplink | Abrir búsqueda precargada |
| Tecnoempleo | RSS + deeplink | RSS preparado + búsqueda directa |
| Adzuna | API | API preparada |
| Jooble | API | API preparada |
| Remotive | API | API pública para remoto |

## Variables de Entorno

```env
INFOJOBS_CLIENT_ID=
INFOJOBS_CLIENT_SECRET=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
JOOBLE_API_KEY=
```

Las integraciones deben devolver resultados vacíos y no romper la app cuando faltan claves.

## Modelo Normalizado

```ts
export type NormalizedOpportunity = {
  source: string
  source_type: "api" | "rss" | "deeplink" | "manual"
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

## Búsquedas Rápidas

Las búsquedas rápidas deben construirse como URLs explícitas, sin ocultar redirecciones ni scraping:

```ts
buildJobSearchUrl(platform: string, keyword: string, location?: string): string
```

Ejemplos:

- Desarrollador Web Junior en Granada.
- Java Junior en Granada.
- Prácticas DAW en Granada.
- Desarrollador Full Stack Junior remoto.
- Programador Junior Andalucía.
