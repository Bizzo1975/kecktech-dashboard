# Monetization readiness (fill gaps — no new OS)

Trigger: **before first paying client**, not a new product.

## Must-complete (from CUSTOMER-PORTAL-GAP-ANALYSIS)

| Gap | Action | Owner |
|-----|--------|-------|
| Portal Stripe pay link per invoice | Wire Stripe payment links from ERPNext invoices into portal | Cursor when first client imminent |
| Portal RustDesk API 404 | **Already fixed** in `customer-portal/app/api/rustdesk/route.ts` — confirm env `RUSTDESK_*` on host | Ops verify |
| Contract / plan card | ERPNext Subscription → portal | Cursor |
| Invoice history | Paid + outstanding | Cursor |
| MSA checklist | Legal/ops doc before first invoice | Jon |

## Keep as-is until volume hurts

- X/Twitter clipboard path (COST_MODEL)  
- Games monetization cosmetic / store-later — presence first  

## Analytics pivot

Weekly: Umami + ME Calendar outcomes → one pivot note in operator log (which property got engagement).

## Zero-client ramp

ERPNext CRM: enrich 5 prospects / week; personalized outreach; log `outreach_status`. Stripe not required to talk to prospects.

## Portal RustDesk fix reference

Create on portal host (`Dashboard/customer-portal`):

`app/api/rustdesk/route.ts` returning `RUSTDESK_SERVER_HOST` + `RUSTDESK_PUBLIC_KEY` JSON (see gap analysis Fix 1).

Do not invent fake invoice/pay flows in prod while client count is zero.
