import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="content" style={{ maxWidth: 720, margin: '2rem auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)' }}>Privacy Policy</h1>
      <p className="muted">Last updated: July 2026</p>
      <div className="stack" style={{ marginTop: '1.5rem' }}>
        <p>
          Marketlist helps households manage grocery lists, pantry, recipes, meal plans, and optional
          price history you enter. This page summarizes how we collect, use, retain, and delete
          personal data.
        </p>

        <h2>What we collect</h2>
        <p>
          Account email and name; password hash; household membership; shopping lists, pantry,
          garden beds / FarmBot plant records you connect, recipes, meal plans, and meal logs you
          create; optional nutrition goals per household; optional barcode lookups via Open Food
          Facts; and prices or stores you record yourself. FarmBot API tokens are encrypted at rest
          and never returned on read APIs. When FarmBot Web App is self-hosted by the operator,
          that host is the device/API/MQTT backend; Marketlist provides native robot controls
          in-app and keeps encrypted tokens plus synced harvest rows. We do not sell personal data
          and do not run third-party ads.
        </p>

        <h2>Nutrition &amp; meal data</h2>
        <p>
          Meal logs, macro estimates, and nutrition goals are <strong>lifestyle tracking only</strong>{' '}
          — not medical advice or clinical records. Macro values may come from Open Food Facts (OFF),
          a USDA-based seed catalog, household-entered profiles, or recipe ingredient matching. Values
          can be incomplete when a product or ingredient has no known profile.
        </p>
        <p>
          Nutrition goals (calories, protein, carbs, fat) are stored on the household and visible to
          members you invite. Meal logs you create are associated with your account and household for
          Insights and Meals views.
        </p>

        <h2>Open Food Facts</h2>
        <p>
          When you scan a barcode, we may query{' '}
          <a href="https://world.openfoodfacts.org/" rel="noopener noreferrer" target="_blank">
            Open Food Facts
          </a>{' '}
          with the barcode only to resolve a product name. Account email and household contents are
          not sent for that lookup.
        </p>

        <h2>Retention</h2>
        <p>
          Account and household content remain until you delete them. Refresh sessions expire on
          logout or TTL. Password-reset tokens are short-lived and removed after use or expiry.
          Operator backups may retain residual copies until those backups rotate — see the ops
          runbook.
        </p>

        <h2>Error monitoring (Sentry) — optional</h2>
        <p>
          If the operator configures a Sentry DSN, application errors may be reported to Sentry. When
          no DSN is set, Sentry is inactive and no crash events are sent.
        </p>

        <h2>Your choices</h2>
        <p>
          Export via Settings → Export my data (<code>GET /api/me/export</code>). Delete your account
          in Settings or email{' '}
          <a href="mailto:support@marketlist.app">support@marketlist.app</a>. We aim to complete
          verified deletion requests within <strong>30 days</strong> (sooner for in-app delete).
        </p>

        <h2>Terms</h2>
        <p>
          See our <Link href="/terms">Terms of Service</Link>.
        </p>

        <h2>Contact</h2>
        <p>
          Privacy and deletion: <a href="mailto:support@marketlist.app">support@marketlist.app</a>
        </p>

        <p>
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
