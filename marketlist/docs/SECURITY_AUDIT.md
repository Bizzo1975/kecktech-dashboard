# Security audit — Marketlist

**Date:** 2026-07-16  
**Scope:** npm workspaces (`apps/api`, `apps/web`, `apps/mobile`, `packages/shared`)  
**Owner:** ops / maintainers  
**Next review:** 2026-08-16

## Policy

Production-ready advertising requires:

- No **Critical** or unmitigated **High** on the **public API runtime** path.
- Household **AuthZ** on every money/nutrition/pantry/list-write route (membership required; no global dumps).
- Remaining Highs in **mobile/Expo build toolchain** documented with owner + expiry.

## Actions taken

- `trust proxy` enabled for Traefik/`X-Forwarded-For` (rate-limit no longer fails first requests).
- Household membership required for: stores, prices, deals, price history, spending insights, meal-plan generate-list, expiring recipe suggestions, recipe get (owner or household), meal logs / nutrition routes, **garden sources / yields / harvest / FarmBot sync**.
- FarmBot tokens encrypted at rest (`TOKEN_ENCRYPTION_KEY`); never returned on GET.
- `npm audit` API-path Critical/High cleaned; Expo toolchain Highs waived below.

## Accepted remaining risk

| Issue | Where | Severity | Mitigation | Re-review |
|-------|--------|----------|------------|-----------|
| Expo / `@expo/*` transitive Highs (`tar`, `@xmldom/xmldom`, etc.) | Mobile build CLI | High | Not on API request path | 2026-08-16 |
| Sequelize JSON cast advisory | Sequelize 6 | High (advisory) | App does not accept untrusted cast types | 2026-08-16 |

## AuthZ coverage (food-system)

Enforced membership (or owner) on:

- Lists / pantry / trip complete / list basket estimate
- Prices stores/deals/history/upsert (householdId **required**)
- Spending insights (householdId **required**)
- Meal logs, nutrition day/week, recipe nutrition
- Garden sources / yields / harvest / FarmBot sync
- Capture review when list/household present
- Meal-plan generate-list (list household membership)
- Expiring recipe suggestions (householdId **required**)
- Household PATCH (goals/budget)

Integration proof: `apps/api/src/__tests__/api.integration.test.ts` (RUN_INTEGRATION=1).

## Sign-off

Re-run `npm audit --omit=dev` and AuthZ integration tests before each public advertise claim.
