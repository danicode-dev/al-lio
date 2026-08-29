# Integrations and content governance

This folder holds two related things:

- the contracts AL-LIO keeps with external services and with the separate
  AL-LIO Radar process, and
- the acceptance and withdrawal rules for every dataset that is imported into
  the product (learning resources, companies, hackathons).

The executable contract always wins over prose: HMAC verification, host
allowlists, deterministic routing and the import scripts under `scripts/` are
authoritative. A document here explains *why* a boundary or rule exists.

## Documents

- [`INTEGRATIONS_AND_DEEPLINKS.md`](INTEGRATIONS_AND_DEEPLINKS.md): the
  narrowest-reliable-integration policy for Google, job platforms and outbound
  deep links.
- [`AL_LIO_RADAR_INTEGRATION.md`](AL_LIO_RADAR_INTEGRATION.md): the
  application side of the Radar webhook contract and the ownership boundary
  between the two repositories.
- [`VERIFIED_NEWS_DETAILS.md`](VERIFIED_NEWS_DETAILS.md): the verified v4 news
  list/detail fields, shared authorisation and next-item behaviour.
- [`LEARNING_SOURCE_GOVERNANCE.md`](LEARNING_SOURCE_GOVERNANCE.md): when a
  learning resource becomes visible and when it is withdrawn.
- [`COMPANY_CATALOGUE_GOVERNANCE.md`](COMPANY_CATALOGUE_GOVERNANCE.md): dataset
  format, source policy and import steps for the Work tab company catalogue.
- [`SEED_HACKATHONS.md`](SEED_HACKATHONS.md): the reviewed starter
  dataset for the Hackathons area. Editorial reference, not a live feed.
