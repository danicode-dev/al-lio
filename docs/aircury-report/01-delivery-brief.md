# Technical report delivery brief

This brief records decisions confirmed by the project owner for the Aircury
Summer of Code 2026 technical report and the immutable delivery candidate
selected after pull request #312. It separates the reporting snapshot from
later product maintenance and from the remaining owner-approval gates.

## Confirmed decisions

| Decision | Confirmed value |
|---|---|
| Delivery date | 31 August 2026 |
| Final format | PDF using an owner-supplied template |
| Length | No prescribed or recommended page count; explain the project completely without filler |
| Technical appendix | Not part of the current delivery |
| Video or presentation | Not required |
| Legal annexes | Previously delivered; excluded from this repository and report workflow |
| Delivery channel | Gmail to the designated Aircury programme contact |
| Canonical repository | <https://github.com/danielgarciaortega-dev/al-lio> |
| Canonical production application | <https://al-lio.app> |
| Public project contact | `hola@al-lio.app` |
| Screenshots | Captured later by the owner in one dedicated session; not captured during the report-preparation issues |
| Author display | `Daniel García Ortega` proposed from the public project metadata; final owner approval required |

The Gmail recipient and any private delivery-thread details stay outside the
public repository.

## Reporting snapshot and continuing support

The owner selected the merge of pull request #312 as the application candidate
for the report. That merge closes the reviewed Google Calendar credential
ownership boundary and is the exact commit deployed by the guarded production
workflow.

The report will describe the following aligned snapshot:

- the public GitHub tag and commit SHA;
- the deployed AL-LIO web image;
- the deployed AL-LIO Radar reference;
- the production state at `https://al-lio.app`;
- the release verification record;
- the report evidence cut-off.

This freeze is a reporting and evidentiary boundary, not the end of AL-LIO's
development. Fixes, security updates, content maintenance and later releases
may continue after the cut-off. Those later changes do not retroactively alter
the version described by the report. The operating and support commitment
continues through at least 31 August 2027.

The existing `v0.1.0` release is historical and must not be cited as the final
report version. The dedicated tag and GitHub release proposed below will point
to the already deployed #312 merge commit after the owner approves this
baseline and completes the authenticated production smoke test.

## Programme commitments

The supplied Aircury programme rules require the delivered project to:

- be published as open source on GitHub under the MIT License;
- keep produced code in English;
- include visible acknowledgement of Aircury SL;
- remain operational through at least 31 August 2027;
- remain eligible under the rule that prohibits prior submission of the same
  project to another contest or grant programme.

The report must explain the operating and support plan through the required
date. A working endpoint on the delivery date is evidence of current operation,
not evidence that the future maintenance commitment has already been met.

## Delivery candidate and verification record

Times below use both UTC and Europe/Madrid (CEST, UTC+02:00). Public endpoint
observations were made after the automated production deployment completed.

| Field | Reviewed value |
|---|---|
| Proposed GitHub release and tag | `aircury-2026-delivery`; create only after owner approval |
| AL-LIO commit SHA | `1e516ead8f69d60a263718c20d59b97c9618c97a` |
| Source change closing the candidate | PR #312, merged 31 August 2026 at 16:42:41 CEST |
| Deployed web image | `al-lio-web:1e516ead8f69d60a263718c20d59b97c9618c97a` |
| Deployed Radar image | `al-lio-radar:6111ad0` |
| Radar source commit | `6111ad04ea4de13c55690c8efc1fec9832bedec2` |
| Automated deployment | GitHub Actions run `33404461730`; successful at 31 August 2026 16:48:18 CEST |
| Evidence cut-off | 31 August 2026 16:49:37 CEST (`2026-08-31T14:49:37Z`) |
| Health observation | HTTP 200; `{"ok":true,"app":"al-lio"}` |
| Readiness observation | HTTP 200; `{"ok":true,"app":"al-lio","database":"ready"}` |
| Unauthenticated Radar boundary | `/api/job-radar` returned HTTP 401 |
| Final automated-check run | CI run `33404234578` passed for the exact AL-LIO SHA; CodeQL run `33404234583` passed |
| Final owner-approved smoke test | Pending owner review; no browser or screenshot substitute was performed |
| Author display name | `Daniel García Ortega`; pending owner approval |

The Radar image reference comes from the last public production release record.
The #312 deployment was web-only and its successful deployment record confirms
that the existing Radar container was preserved and remained running. The
owner should compare `al-lio-radar:6111ad0` with the private production image
inventory before publishing the final tag. Radar's newer `main` commits are not
claimed as deployed merely because they exist in its repository.

## Approval gates

The snapshot becomes the final report release when the owner:

1. confirms the author display name;
2. confirms the Radar image against the private production inventory;
3. completes and approves the authenticated production smoke test;
4. approves creation of `aircury-2026-delivery` at the exact AL-LIO SHA above.

Every downstream report document must use these final values once they are
approved. Historical release values may appear only when explicitly labelled
as historical evidence. The tag must never be moved after publication.

## Report boundary

The current deliverable is the technical report itself. It should cover the
problem, users, delivered product, architecture, data governance, quality,
operations, impact, inclusion, sustainability, limitations and future work.

There is no separate technical-evidence appendix in the current scope. The
evidence register remains an internal public engineering record that supports
accurate writing; it is not automatically attached to the PDF.

