# Technical report delivery brief

This brief records decisions confirmed by the project owner for the Aircury
Summer of Code 2026 technical report. It separates stable delivery decisions
from identifiers that can only be completed after the final release is
approved.

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
| Screenshots | Captured later by the owner in one dedicated session; never captured by Codex during the report issues |
| Author display | Deferred until the final PDF is assembled |

The Gmail recipient and any private delivery-thread details stay outside the
public repository.

## Versioning decision

The report will describe one final release aligned across:

- the public GitHub tag and commit SHA;
- the deployed AL-LIO web image;
- the deployed AL-LIO Radar reference;
- the production state at `https://al-lio.app`;
- the release verification record;
- the report evidence cut-off.

The current `main` branch and the existing `v0.1.0` release are useful working
references, but neither is automatically the final report baseline. Product
work continued after `v0.1.0`; therefore the final identifiers remain deferred
until the owner approves the delivery release.

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

## Deferred final-release fields

Complete these fields only after the final release and production verification:

| Field | Final value |
|---|---|
| GitHub release and tag | Pending |
| Tag commit SHA | Pending |
| Deployed web image SHA | Pending |
| Deployed Radar image or immutable reference | Pending |
| Release timestamp and evidence cut-off | Pending |
| Final health and readiness observation | Pending |
| Final automated-check run | Pending |
| Final owner-approved smoke test | Pending |
| Author display name | Pending |

Every downstream report document must use these final values once they are
available. Historical release values may appear only when explicitly labelled
as historical evidence.

## Report boundary

The current deliverable is the technical report itself. It should cover the
problem, users, delivered product, architecture, data governance, quality,
operations, impact, inclusion, sustainability, limitations and future work.

There is no separate technical-evidence appendix in the current scope. The
evidence register remains an internal public engineering record that supports
accurate writing; it is not automatically attached to the PDF.

