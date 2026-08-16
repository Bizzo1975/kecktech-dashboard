/**
 * Axe accessibility smoke for primary Marketlist web routes.
 * Usage: BASE_URL=http://localhost:3001 node scripts/a11y.mjs
 */
import { AxeBuilder } from '@axe-core/playwright';
import { chromium } from 'playwright';

const base = (process.env.BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

const routes = [
  '/',
  '/login',
  '/register',
  '/app',
  '/app/lists',
  '/app/pantry',
  '/app/recipes',
  '/app/settings',
  '/app/insights',
  '/app/prices',
  '/app/capture',
];

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const failures = [];

  for (const route of routes) {
    const url = `${base}${route}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      if (serious.length) {
        failures.push({
          route,
          violations: serious.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.length,
          })),
        });
      } else {
        console.log(`ok  ${route} (${results.violations.length} non-blocking)`);
      }
    } catch (err) {
      failures.push({
        route,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await browser.close();

  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(`A11y smoke passed for ${routes.length} routes against ${base}`);
};

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
