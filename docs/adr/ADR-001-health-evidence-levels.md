# ADR-001: Health evidence levels

Date: 2026-08-18  
Status: Accepted for local implementation; not deployed

## Context

The dashboard previously treated every successful HTTP response as application readiness. Many catalog entries probe a public root page, which proves only that an HTTP route responded. Authentication pages, reverse proxies, static sites, and shallow application endpoints do not prove that mandatory dependencies or critical user journeys work.

## Decision

Every monitored service declares what a successful 2xx response proves:

- `ready`: an explicit readiness endpoint responded successfully.
- `application_available`: an application-specific endpoint responded, but complete dependency readiness is not established.
- `reachable`: an HTTP route responded, but application readiness is unverified.

Redirects, authentication responses, unexpected HTTP responses, timeouts, TLS failures, and network failures remain explicit non-ready states. Services without an automated probe remain `not_monitored`.

The `/api/health` response exposes each evidence level separately and never aggregates `application_available` or `reachable` into `ready`. The response identifies contract version `2.0.0`, uses `evidenceAt` for the observation timestamp, and is described by `docs/contracts/dashboard-health-v2.schema.json`.

## Consequences

The dashboard may show fewer services as Ready. This is intentional and reflects the strength of current evidence. A service can move to `ready` only after a correct readiness contract and dependency behavior are implemented and tested. Existing API consumers must accept the additional `application_available` and `reachable` status values before deployment.

## Rollback

Rollback the dashboard artifact to the previously captured live artifact if an unrecognized status breaks a consumer. Do not restore the former behavior that labeled shallow 2xx responses as readiness; use an approved compatibility translation at the consumer boundary if required.
