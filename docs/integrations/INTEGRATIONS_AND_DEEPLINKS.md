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

Employment platforms are exposed as explicit, user-controlled deep links. The
student chooses the search terms and location, and the external platform remains
responsible for its search results and authentication. AL-LIO does not run its
retired InfoJobs, Adzuna, Jooble, Remotive or Tecnoempleo collectors.

Reviewed vacancies are a separate capability. AL-LIO Radar sends accepted job
metadata through its authenticated contract, and the product exposes that data
as the verified-job catalogue. A deep-linked search result must never be
presented as a Radar-verified vacancy.

`GET /api/collect` remains only as a `410 Gone` compatibility response. It has
no provider credentials and cannot initiate external work.

## Prohibited behaviour

- No bots against LinkedIn or other authenticated platforms.
- No Playwright or Selenium extraction from third-party private pages.
- No storage of a student's external platform password.
- No hidden redirects or affiliate URLs presented as direct sources.
- No external content may bypass server-side validation and user ownership.

Deep links must be generated as transparent URLs from a keyword and optional
location. AL-LIO must not imply that a deep-linked result was validated by an
API when it was not.
