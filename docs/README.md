# AL-LIO documentation

This index points to maintained documentation for the system that exists in
the repository and in the supported VPS deployment. Historical plans and
private operational evidence do not belong here.

## Start here

- [`../README.md`](../README.md): product overview, status and local setup.
- [`01_PRODUCT_SPEC.md`](01_PRODUCT_SPEC.md): users, outcomes, scope and known limits.
- [`architecture/README.md`](architecture/README.md): system boundaries and diagrams.
- [`architecture/decisions/README.md`](architecture/decisions/README.md): accepted engineering decisions.
- [`02_ARCHITECTURE_AND_STACK.md`](02_ARCHITECTURE_AND_STACK.md): concise runtime reference.

## Integrations and content

- [`03_INTEGRATIONS_AND_DEEPLINKS.md`](03_INTEGRATIONS_AND_DEEPLINKS.md): Google, job-platform and deep-link policy.
- [`AL_LIO_RADAR_INTEGRATION.md`](AL_LIO_RADAR_INTEGRATION.md): application-side Radar contract and ownership boundary.
- [`LEARNING_SOURCE_GOVERNANCE.md`](LEARNING_SOURCE_GOVERNANCE.md): acceptance and withdrawal rules for learning resources.
- [`COMPANY_CATALOGUE_GOVERNANCE.md`](COMPANY_CATALOGUE_GOVERNANCE.md): dataset format, source policy and import steps for the Work tab's company catalogue (DEV/AF/MP/TSAF).
- [`04_SEED_HACKATHONS.md`](04_SEED_HACKATHONS.md): reference dataset for initial hackathon imports.
- [`product/demo-and-screenshots.md`](product/demo-and-screenshots.md): safe public demo and visual-evidence protocol.

## Operations

- [`AUTONOMOUS_PRODUCTION_DEPLOY.md`](AUTONOMOUS_PRODUCTION_DEPLOY.md): owner-facing one-command routine release guide.
- [`DEPLOY_VPS.md`](DEPLOY_VPS.md): controlled VPS deployment, backup, smoke test and rollback.
- [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md): repository capabilities and per-release gates.
- [`operations/README.md`](operations/README.md): monitoring, recovery and release handbook.
- [`FINAL_REVIEW_CHECKLIST.md`](FINAL_REVIEW_CHECKLIST.md): ordered owner review before merge and production.
- [`DELIVERY_STATUS.md`](DELIVERY_STATUS.md): completed repository work and remaining manual gates.
- [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md): authoritative repository map and file-placement rules.

## Documentation policy

- Engineering documentation is written in English.
- Spanish UI copy and Spanish curricular material remain localized product
  content and are not translated merely to satisfy the engineering-language
  convention.
- Every operational claim must be backed by code, configuration or repeatable
  evidence.
- Secrets, live database contents, personal data, private support material and
  release credentials must stay outside Git.
- A document must be updated in the same change that invalidates it.
