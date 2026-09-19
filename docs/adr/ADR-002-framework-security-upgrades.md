# ADR-002: Framework security upgrades and Next.js build compatibility

Date: 2026-08-18  
Status: Accepted for local implementation; not deployed

## Context

A current npm registry audit reported three high-severity findings in the Dashboard dependency graph and eight high-severity findings in the public website graph. Next.js `15.5.23` removed the direct framework advisories reported against `15.5.12`, but current PostCSS and Sharp advisories still required Next.js `16.3.1`. The Next.js 16 default Turbopack build could not resolve the existing `tw-animate-css` package's style-only export, although the package was installed and valid.

## Decision

- Upgrade the local Dashboard to exact Next.js `16.3.1`, React/React DOM `19.2.8`, and compatible exact React type packages.
- Use the officially supported `next build --webpack` compatibility mode for production builds until the existing Tailwind/shadcn CSS stack is proven with Turbopack.
- Keep the public website's Astro major migration separate. Do not use `npm audit fix --force`; inspect and test the Astro 7 migration explicitly.
- Block release while any unaccepted high-severity audit finding remains.

## Consequences

The Dashboard remains on a supported Next.js 16 build path but does not yet use the default Turbopack production builder. The public website remains vulnerable until its separately tested framework migration is complete. Local build success and a zero-result npm audit do not constitute development or production acceptance.

## Rollback

The captured live VM230 artifact remains the production rollback baseline. If local Next.js 16 acceptance fails, revert this unshipped dependency change as a reviewed change; do not deploy the vulnerable local Next.js 15 dependency graph.
