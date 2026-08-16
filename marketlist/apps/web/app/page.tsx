'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, readSession, saveSession, setHouseholdId } from '../lib/api';

const FLOW_STEPS = [
  {
    title: 'Acquire',
    body: 'Shared aisle lists, recipes → list, barcode / OCR / speech capture, price memory, and home garden / FarmBot',
  },
  {
    title: 'Inventory',
    body: 'Trip complete → pantry, garden harvest → pantry, expiry and low-stock signals, cook-soon matches',
  },
  {
    title: 'Consume',
    body: 'Meal plan, cook or log a meal, deduct pantry ingredients that matched',
  },
  {
    title: 'Effect',
    body: 'Spend vs budget, day/week macros vs goals, quiet dietary and harvest-timed suggestions — lifestyle only',
  },
] as const;

const FEATURES = [
  {
    title: 'Shared shopping lists',
    body: 'Aisle-sorted lists sync live across the household — check off in store order.',
  },
  {
    title: 'Household invite codes',
    body: 'Create or join a household, switch between houses, and keep one live list together.',
  },
  {
    title: 'Pantry, kept honest',
    body: 'Checked items land in pantry with expiry and editable low-stock thresholds — cook-soon recipes follow.',
  },
  {
    title: 'Garden → pantry',
    body: 'Log outdoor beds and indoor trays, or connect FarmBot. Harvest into pantry; recipes prefer what’s ready soon. Closed hydro brands are manual-only — we don’t fake sync.',
  },
  {
    title: 'Robot controls',
    body: 'Native Marketlist controls for FarmBot — status, e-stop, sequences, peripherals — via your encrypted token. Self-hosted FarmBot at farmbot.kecktech.net is the device backend; harvest still flows into pantry.',
  },
  {
    title: 'Recipes → list',
    body: 'Parse a URL or paste ingredients, save servings, and push only what’s missing to a list.',
  },
  {
    title: 'Meal plan + cook / log',
    body: 'Plan the week, cook a slot, log macros from known profiles, and deduct matched pantry stock.',
  },
  {
    title: 'Capture three ways',
    body: 'Barcode with Open Food Facts nutrition when present, receipt OCR that keeps prices, and speech on web when the browser supports it — or on native custom/dev builds (not Expo Go).',
  },
  {
    title: 'Price memory & deals',
    body: 'Record store prices, household-scoped deals and history, trip snapshots, and basket estimates from real PriceHistory only.',
  },
  {
    title: 'Insights: spend + health',
    body: 'Category spend, monthly budget progress, restock prompts, and a day/week macro strip vs household goals.',
  },
  {
    title: 'Quiet healthy guidance',
    body: 'Dietary prefs (veg / vegan / GF / dairy-free) filter cook suggestions; goals and garden readiness inform quiet hints — not medical advice.',
  },
  {
    title: 'Mobile offline mirror',
    body: 'Native apps mirror list and pantry without signal; other screens show clear offline banners. Web PWA keeps the shop loop online (shell cache only — not offline grocery).',
  },
  {
    title: 'Staples & catalog',
    body: 'Reuse household staples and catalog items so typeahead and common adds stay accurate.',
  },
  {
    title: 'Yours to export or delete',
    body: 'No ad targeting on grocery habits. Export your data or delete your account on web or mobile whenever you choose.',
  },
  {
    title: 'Desktop & native extras',
    body: 'Optional Electron desktop wrap, home-screen Active List widget, and push nudges for expiring pantry — available on native/desktop builds (not App Store ship until credentials are provided).',
  },
] as const;

export default function LandingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (readSession()) router.replace('/app');
  }, [router]);

  const handleTryDemo = async () => {
    setBusy(true);
    setError(null);
    const result = await apiFetch<{
      user: { id: string; email: string; name: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'demo@marketlist.app', password: 'demo12345' }),
    });
    if (!result.success) {
      setBusy(false);
      setError(result.error.message + ' — API may still be starting.');
      return;
    }
    saveSession({
      accessToken: result.data.accessToken,
      refreshToken: result.data.refreshToken,
      user: result.data.user,
    });
    const households = await apiFetch<{ households: Array<{ id: string }> }>('/households', {
      token: result.data.accessToken,
    });
    if (households.success && households.data.households[0]) {
      setHouseholdId(households.data.households[0].id);
      const lists = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
        `/lists?householdId=${households.data.households[0].id}`,
        { token: result.data.accessToken },
      );
      const weekly =
        lists.success &&
        (lists.data.lists.find((l) => l.name === 'Weekly run') || lists.data.lists[0]);
      if (weekly) {
        setBusy(false);
        router.push(`/app/lists/${weekly.id}`);
        return;
      }
    }
    setBusy(false);
    router.push('/app');
  };

  const handleNavKeyDown = (
    event: React.KeyboardEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing">
      <nav className="landing-nav" aria-label="Marketing">
        <div className="landing-wrap landing-nav-inner">
          <Link href="/" className="landing-brand" aria-label="Marketlist home">
            <span className="landing-brand-dot" aria-hidden="true" />
            Marketlist
          </Link>
          <div className="landing-nav-links">
            <a href="#flow" onKeyDown={(e) => handleNavKeyDown(e, '#flow')} tabIndex={0}>
              How it works
            </a>
            <a href="#features" onKeyDown={(e) => handleNavKeyDown(e, '#features')} tabIndex={0}>
              Features
            </a>
            <a href="#access" onKeyDown={(e) => handleNavKeyDown(e, '#access')} tabIndex={0}>
              Try it
            </a>
          </div>
          <button
            type="button"
            className="btn btn-primary landing-nav-cta"
            onClick={handleTryDemo}
            disabled={busy}
            aria-label="Get the live demo"
          >
            {busy ? 'Opening…' : 'Try demo'}
          </button>
        </div>
      </nav>

      <header className="landing-hero" aria-label="Marketlist hero">
        <div className="landing-wrap landing-hero-grid">
          <div className="landing-hero-copy landing-enter">
            <p className="landing-eyebrow">Acquire · Inventory · Consume · Effect</p>
            <h1>
              Marketlist —
              <br />
              your household
              <br />
              <span className="landing-hl">food system</span>
            </h1>
            <p className="landing-lede">
              Lists, pantry, garden harvests, recipes, meal logs, capture, lifestyle macros, price
              memory, and quiet suggestions — one loop for your household. Informational nutrition
              only, never medical advice.
            </p>
            <div className="landing-hero-actions landing-enter-delay">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleTryDemo}
                disabled={busy}
                aria-label="Try the live demo"
              >
                {busy ? 'Opening demo…' : 'Try the demo'}
              </button>
              <a className="btn btn-secondary" href="#flow">
                See a trip
              </a>
              <Link className="btn btn-ghost" href="/login">
                Sign in
              </Link>
            </div>
            <div className="landing-platforms">
              <span>iOS &amp; Android (Expo)</span>
              <span aria-hidden="true">·</span>
              <span>Web</span>
              <span aria-hidden="true">·</span>
              <span>Optional Electron</span>
              <span aria-hidden="true">·</span>
              <Link href="/register">Create account</Link>
            </div>
            {error ? (
              <p className="landing-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <aside className="landing-ticket landing-enter-delay" aria-label="Example shopping list">
            <p className="landing-ticket-note">get this one!</p>
            <div className="landing-ticket-head">
              <div className="landing-ticket-meta">
                <span>Weekly run</span>
                <span>Aisle order</span>
              </div>
              <h2>Household list</h2>
            </div>
            <ul className="landing-ticket-body">
              <li>
                <span className="landing-check on" aria-hidden="true">
                  ✓
                </span>
                <span className="landing-item done">Crushed tomatoes ×2</span>
                <span className="landing-aisle">Aisle 4</span>
              </li>
              <li>
                <span className="landing-check on" aria-hidden="true">
                  ✓
                </span>
                <span className="landing-item done">Parmesan</span>
                <span className="landing-aisle">Dairy</span>
              </li>
              <li>
                <span className="landing-check" aria-hidden="true" />
                <span className="landing-item">Basil, fresh</span>
                <span className="landing-aisle">Produce</span>
              </li>
              <li>
                <span className="landing-check" aria-hidden="true" />
                <span className="landing-item">Ground beef, 1lb</span>
                <span className="landing-aisle">Meat</span>
              </li>
              <li>
                <span className="landing-check" aria-hidden="true" />
                <span className="landing-item">Garlic, 2 heads</span>
                <span className="landing-aisle">Produce</span>
              </li>
            </ul>
            <div className="landing-ticket-foot">
              <span>Logged: Sunday Bolognese · 520 kcal est.</span>
              <span className="landing-ticket-total">2 of 5 done</span>
            </div>
          </aside>
        </div>
      </header>

      <section id="flow" className="landing-section" aria-labelledby="flow-heading">
        <div className="landing-wrap">
          <div className="landing-section-head landing-center">
            <p className="landing-eyebrow">The full loop</p>
            <h2 id="flow-heading">Acquire → Inventory → Consume → Effect</h2>
            <p>
              Every shippable surface sits on this loop: acquire food, keep inventory true, consume
              what you planned, and see the effect on spend and lifestyle nutrition.
            </p>
          </div>
          <ol className="landing-flow">
            {FLOW_STEPS.map((step, index) => (
              <li key={step.title} className="landing-flow-step">
                <div className="landing-flow-circle" aria-hidden="true">
                  {index + 1}
                </div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="features" className="landing-section" aria-labelledby="features-heading">
        <div className="landing-wrap">
          <div className="landing-section-head">
            <p className="landing-eyebrow">Built for households</p>
            <h2 id="features-heading">Everything in the food system, on purpose.</h2>
            <p className="muted" style={{ marginTop: '0.75rem', maxWidth: '42rem' }}>
              No shells — each item below is a usable job in the product today.
            </p>
          </div>
          <div className="landing-features">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="landing-feature">
                <div className="landing-feature-mark" aria-hidden="true" />
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
          <p className="muted" style={{ marginTop: '1.5rem', maxWidth: '40rem' }}>
            Nutrition goals, meal-log totals, and barcode macros are lifestyle estimates from your
            logs, Open Food Facts, and seeded profiles — not diagnosis or clinical advice. See{' '}
            <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy</Link>.
          </p>
        </div>
      </section>

      <section id="access" className="landing-cta" aria-labelledby="access-heading">
        <div className="landing-wrap landing-center">
          <h2 id="access-heading">Run your household food system on Marketlist.</h2>
          <p>
            Demo covers the full loop — lists, pantry, recipes, meals, garden, capture, prices,
            insights, and export.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleTryDemo}
            disabled={busy}
            aria-label="Open Marketlist demo"
          >
            {busy ? 'Opening demo…' : 'Open Marketlist'}
          </button>
          <p className="landing-demo-cred">
            Demo — demo@marketlist.app / demo12345
          </p>
          <div className="landing-cta-links">
            <Link href="/login">Sign in</Link>
            <Link href="/register">Create account</Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-wrap landing-footer-inner">
          <span>Marketlist — Expo · Next.js · Express · Electron</span>
          <div className="landing-footer-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <span>marketlist.kecktech.net</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
