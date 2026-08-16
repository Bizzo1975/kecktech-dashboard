import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="content" style={{ maxWidth: 720, margin: '2rem auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)' }}>Terms of Service</h1>
      <p className="muted">Last updated: July 2026</p>
      <div className="stack" style={{ marginTop: '1.5rem' }}>
        <p>
          By using Marketlist you agree to these terms. Marketlist provides household grocery lists,
          pantry tracking, home garden and FarmBot plant tracking (when you connect a token), recipes,
          meal planning, meal logging, optional lifestyle nutrition tracking, and optional price
          history you enter yourself.
        </p>
        <h2>Not medical advice</h2>
        <p>
          Nutrition goals, macro estimates, recipe nutrition, garden-harvest cooking suggestions, and
          barcode data are for general lifestyle awareness only. Marketlist is not a medical device
          and does not provide diagnosis, treatment, or dietary prescriptions. Consult a qualified
          professional for health decisions.
        </p>
        <h2>Accounts</h2>
        <p>
          You are responsible for your account credentials and for activity under your household. Do
          not share passwords. You must be old enough to form a binding contract in your region.
        </p>
        <h2>Acceptable use</h2>
        <p>
          Use Marketlist for personal or household grocery organization. Do not abuse the service,
          attempt unauthorized access, or upload unlawful content.
        </p>
        <h2>Household data</h2>
        <p>
          Members you invite can see shared lists, pantry, garden yields, meal plans, nutrition goals,
          and meal-log totals on shared Insights views. FarmBot tokens are household secrets —
          connect only devices and FarmBot accounts you control (including a self-hosted FarmBot Web
          App such as farmbot.kecktech.net). Marketlist robot controls use your encrypted FarmBot
          API token server-side; you still authenticate to FarmBot separately when using advanced
          authoring on the FarmBot host. Remove members or leave a household in Settings when access
          should end.
        </p>
        <h2>Service availability</h2>
        <p>
          We aim for reliable sync across devices but do not guarantee uninterrupted access. Feature
          availability may change as the product evolves.
        </p>
        <h2>Privacy</h2>
        <p>
          How we collect and use data is described in our{' '}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <h2>Contact</h2>
        <p>
          Questions about these terms:{' '}
          <a href="mailto:support@marketlist.app">support@marketlist.app</a>
        </p>
        <p>
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
