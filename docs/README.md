# AL-LIO documentation

This index points to maintained documentation for the system that exists in
the repository and in the supported VPS deployment. Historical plans and
private operational evidence do not belong here.

Documentation is grouped by area. Only `README.md` and `PROJECT_STRUCTURE.md`
stay at the top of `docs/`; every other document lives in one of the four
subfolders below.

## Start here

- [`../README.md`](../README.md): product overview, status and local setup.
- [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md): authoritative repository map and file-placement rules.

## `product/`

- [`product/01_PRODUCT_SPEC.md`](product/01_PRODUCT_SPEC.md): users, outcomes, scope and known limits.
- [`product/demo-and-screenshots.md`](product/demo-and-screenshots.md): safe public demo and visual-evidence protocol.

## `architecture/`

- [`architecture/README.md`](architecture/README.md): system boundaries and diagrams.
- [`architecture/02_ARCHITECTURE_AND_STACK.md`](architecture/02_ARCHITECTURE_AND_STACK.md): concise runtime reference.
- [`architecture/decisions/README.md`](architecture/decisions/README.md): accepted engineering decisions.

## `integrations/`

External-service contracts and the governance rules for imported content.

- [`integrations/README.md`](integrations/README.md): index for this area.
- [`integrations/03_INTEGRATIONS_AND_DEEPLINKS.md`](integrations/03_INTEGRATIONS_AND_DEEPLINKS.md): Google, job-platform and deep-link policy.
- [`integrations/AL_LIO_RADAR_INTEGRATION.md`](integrations/AL_LIO_RADAR_INTEGRATION.md): application-side Radar contract and ownership boundary.
- [`integrations/VERIFIED_NEWS_DETAILS.md`](integrations/VERIFIED_NEWS_DETAILS.md): verified v4 news list/detail contract.
- [`integrations/LEARNING_SOURCE_GOVERNANCE.md`](integrations/LEARNING_SOURCE_GOVERNANCE.md): acceptance and withdrawal rules for learning resources.
- [`integrations/COMPANY_CATALOGUE_GOVERNANCE.md`](integrations/COMPANY_CATALOGUE_GOVERNANCE.md): dataset format, source policy and import steps for the Work tab's company catalogue (DEV/AF/MP/TSAF).
- [`integrations/04_SEED_HACKATHONS.md`](integrations/04_SEED_HACKATHONS.md): reference dataset for initial hackathon imports.

## `operations/`

Everything about releasing and running the production deployment.

- [`operations/README.md`](operations/README.md): monitoring, recovery and release handbook.
- [`operations/GITHUB_PRODUCTION_DEPLOY.md`](operations/GITHUB_PRODUCTION_DEPLOY.md): automatic post-merge production deployment, configuration and failure handling.
- [`operations/AUTONOMOUS_PRODUCTION_DEPLOY.md`](operations/AUTONOMOUS_PRODUCTION_DEPLOY.md): owner-facing one-command routine release guide.
- [`operations/DEPLOY_VPS.md`](operations/DEPLOY_VPS.md): controlled VPS deployment, backup, smoke test and rollback.
- [`operations/PRODUCTION_READINESS.md`](operations/PRODUCTION_READINESS.md): repository capabilities and per-release gates.
- [`operations/FINAL_REVIEW_CHECKLIST.md`](operations/FINAL_REVIEW_CHECKLIST.md): ordered owner review before merge and production.
- [`operations/DELIVERY_STATUS.md`](operations/DELIVERY_STATUS.md): completed repository work and remaining manual gates for the first tagged release.

## Documentation policy

- Engineering documentation is written in English.
- Spanish UI copy and Spanish curricular material remain localized product
  content and are not translated merely to satisfy the engineering-language
  convention.
- Every operational claim must be backed by code, configuration or repeatable
  evidence.
- Secrets, live database contents, personal data, private support material and
  release credentials must stay outside Git.
- A document must be updated in the same change that invalidates it, and it
  must stay in the subfolder that matches its area.
