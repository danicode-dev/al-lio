# Monitoring and incident triage

## Required signals

Monitor these signals from outside the VPS failure boundary:

| Signal | Healthy evidence | Initial response |
|---|---|---|
| Public liveness | `GET /api/health` returns success over HTTPS | Check proxy and web container state |
| Database readiness | `GET /api/ready` returns success over HTTPS | Check PostgreSQL health and application connectivity |
| Web container | Docker reports healthy and restart count is stable | Inspect bounded container logs |
| PostgreSQL | Docker healthcheck succeeds and storage has free capacity | Stop release activity and inspect database logs |
| Radar scheduler | Radar healthcheck reports a recent heartbeat | Inspect scheduler logs and source failures |
| Editorial queue | `npm run review:status` remains within documented thresholds | Assign an editor before accepting more sources |
| Delivery outbox | Pending batch count and oldest retry remain bounded | Verify webhook reachability and shared-secret alignment |
| Host capacity | CPU, memory, disk, and inode usage remain below alert thresholds | Identify the responsible service before restarting anything |

## External configuration still required

The repository cannot choose the organisation's monitoring provider or
notification channel. Before inviting real users, configure:

- HTTPS probes for `/api/health` and `/api/ready` from outside OVH;
- host CPU, memory, disk, inode, and container-restart alerts;
- a Radar heartbeat/outbox alert;
- one primary and one fallback human recipient;
- an escalation rule for repeated readiness or backup failures;
- retention that avoids storing secrets, payloads, or student data in alerts.

## Triage order

1. Record the alert, affected endpoint, and first observed time outside Git.
2. Check the public endpoint without changing any service.
3. Capture `docker compose ... ps` and recent redacted logs.
4. Decide whether the fault is proxy, web, database, Radar, or host capacity.
5. Freeze deployment and migration activity until the boundary is known.
6. Roll back only the affected release unit when the previous image is known-good.
7. Restore data only when integrity is affected and a tested backup exists.
8. Record resolution, impact, and follow-up controls in the private incident log.

Never paste `.env`, cookies, OAuth tokens, webhook signatures, request bodies,
database rows, or personal data into issues or public logs.
