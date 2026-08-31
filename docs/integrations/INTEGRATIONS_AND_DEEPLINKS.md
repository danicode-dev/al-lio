# Integrations and deep links

## Integration policy

AL-LIO uses the narrowest reliable integration for each external service:

1. an official API when credentials and terms are clear;
2. an official RSS/Atom feed when public metadata is sufficient;
3. an explicit deep link when the external platform should remain responsible
   for search and authentication;
4. manual entry when a student needs to retain a specific opportunity.

Private-session automation, credential sharing and aggressive scraping are
not allowed.

## Google OAuth and Calendar

Google OAuth is used for verified account identity and optional Calendar
access. OAuth state is validated, tokens are encrypted before being stored in
the protected cookie boundary and Calendar failures must not make the rest of
AL-LIO unavailable.

Production configuration requires exact callback alignment:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_IDENTITY_REDIRECT_URI=https://al-lio.app/api/auth/google/callback
GOOGLE_REDIRECT_URI=https://al-lio.app/api/google/calendar/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=
```

The Calendar connector is exposed only from the Calendar product area. A user
can disconnect it without losing their AL-LIO account data.

## AL-LIO Radar

Radar is an internal service integration, not a browser integration. It sends
only reviewed metadata through `POST /api/radar/v1/ingest` using schema version
2, HMAC authentication, a five-minute timestamp window and stable delivery
identifiers.

See [`AL_LIO_RADAR_INTEGRATION.md`](AL_LIO_RADAR_INTEGRATION.md) and the
sender-side contract in the Radar repository.

## Employment platforms

| Platform | Supported mode | Current responsibility |
|---|---|---|
| LinkedIn | Deep link | Open an explicit user-controlled search. |
| InfoJobs | API and deep link | Use the API when configured; otherwise preserve direct search. |
| Indeed | Deep link | Open an explicit user-controlled search. |
| Tecnoempleo | RSS and deep link | Use public metadata and direct search where available. |
| Adzuna | API | Return normalised results when credentials exist. |
| Jooble | API | Return normalised results when credentials exist. |
| Remotive | Public API | Return remote opportunities. |

Missing optional credentials must produce an empty or degraded integration
result, not an application failure.

## Prohibited behaviour

- No bots against LinkedIn or other authenticated platforms.
- No Playwright or Selenium extraction from third-party private pages.
- No storage of a student's external platform password.
- No hidden redirects or affiliate URLs presented as direct sources.
- No external content may bypass server-side validation and user ownership.

## Normalised opportunity contract

```ts
export type NormalizedOpportunity = {
  source: string;
  source_type: "api" | "rss" | "deeplink" | "manual";
  title: string;
  company?: string;
  description?: string;
  location?: string;
  province?: string;
  remote?: boolean;
  url: string;
  published_at?: string;
  detected_at?: string;
  category?: string;
  tags?: string[];
  level?: string;
  salary_min?: number;
  salary_max?: number;
  status?: string;
  score?: number;
  external_id?: string;
  unique_hash?: string;
};
```

Deep links must be generated as transparent URLs from a keyword and optional
location. AL-LIO must not imply that a deep-linked result was validated by an
API when it was not.
