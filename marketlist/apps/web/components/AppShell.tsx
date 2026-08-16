'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { apiFetch, clearSession, readSession } from '../lib/api';

const PRIMARY = [
  { href: '/app', label: 'Home' },
  { href: '/app/lists', label: 'Lists' },
  { href: '/app/pantry', label: 'Pantry' },
  { href: '/app/recipes', label: 'Recipes' },
  { href: '/app/settings', label: 'Settings' },
] as const;

const MORE = [
  { href: '/app/meals', label: 'Meals' },
  { href: '/app/garden', label: 'Garden' },
  { href: '/app/capture', label: 'Capture' },
  { href: '/app/prices', label: 'Prices' },
  { href: '/app/insights', label: 'Insights' },
  { href: '/app/catalog', label: 'Staples catalog' },
] as const;

const BOTTOM = [
  { href: '/app', label: 'Home' },
  { href: '/app/lists', label: 'Lists' },
  { href: '/app/pantry', label: 'Pantry' },
  { href: '/app/recipes', label: 'Recipes' },
] as const;

const isActive = (pathname: string, href: string) => {
  if (href === '/app') return pathname === '/app';
  return pathname === href || pathname.startsWith(`${href}/`);
};

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const session = typeof window !== 'undefined' ? readSession() : null;
  const moreActive = useMemo(
    () => MORE.some((link) => isActive(pathname, link.href)),
    [pathname],
  );
  const [moreOpen, setMoreOpen] = useState(moreActive);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const handleLogout = async () => {
    const current = readSession();
    if (current) {
      await apiFetch('/auth/logout', {
        method: 'POST',
        token: current.accessToken,
        body: JSON.stringify({}),
      });
    }
    clearSession();
    router.replace('/login');
  };

  const handleToggleMore = () => {
    setMoreOpen((prev) => !prev);
  };

  const handleToggleMobileMore = () => {
    setMobileMoreOpen((prev) => !prev);
  };

  const handleMoreKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggleMore();
    }
  };

  const handleMobileMoreKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggleMobileMore();
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar sidebar-desktop">
        <div className="sidebar-brand-block">
          <p className="brand">Marketlist</p>
          <p className="sidebar-user">{session?.user.name || 'Guest'}</p>
        </div>
        <nav className="nav" aria-label="Primary">
          {PRIMARY.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
          <div className="nav-more">
            <button
              type="button"
              className="nav-more-toggle"
              aria-expanded={moreOpen || moreActive}
              aria-controls="nav-more-links"
              onClick={handleToggleMore}
              onKeyDown={handleMoreKeyDown}
            >
              <span>More</span>
              <span aria-hidden="true">{moreOpen || moreActive ? '−' : '+'}</span>
            </button>
            {moreOpen || moreActive ? (
              <div id="nav-more-links" className="nav-more-links" role="group" aria-label="More links">
                {MORE.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive(pathname, link.href) ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </nav>
        <div className="sidebar-footer stack">
          <Link href="/privacy" className="muted">
            Privacy
          </Link>
          <Link href="/terms" className="muted">
            Terms
          </Link>
          <button type="button" className="btn btn-ghost" onClick={handleLogout} aria-label="Sign out">
            Sign out
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="mobile-topbar" aria-label="Marketlist">
          <p className="brand mobile-brand">Marketlist</p>
          <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
            {session?.user.name || 'Guest'}
          </p>
        </header>
        <main className="content">{children}</main>
        {mobileMoreOpen ? (
          <div className="mobile-more-sheet" role="dialog" aria-label="More destinations">
            <div className="mobile-more-panel card stack">
              {MORE.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="btn btn-ghost"
                  aria-current={isActive(pathname, link.href) ? 'page' : undefined}
                  onClick={() => setMobileMoreOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/app/settings" className="btn btn-ghost" onClick={() => setMobileMoreOpen(false)}>
                Settings
              </Link>
              <button type="button" className="btn btn-secondary" onClick={() => setMobileMoreOpen(false)}>
                Close
              </button>
            </div>
          </div>
        ) : null}
        <nav className="bottom-nav" aria-label="Primary mobile">
          {BOTTOM.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bottom-nav-link"
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            className="bottom-nav-link"
            aria-expanded={mobileMoreOpen || moreActive}
            aria-label="More"
            onClick={handleToggleMobileMore}
            onKeyDown={handleMobileMoreKeyDown}
          >
            More
          </button>
        </nav>
      </div>
    </div>
  );
};
