'use client';

import { useEffect } from 'react';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleRetry = () => {
    reset();
  };

  const handleRetryKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRetry();
    }
  };

  return (
    <main className="content" style={{ maxWidth: 520, margin: '4rem auto' }}>
      <div className="empty card stack" role="alert">
        <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Something went wrong</h1>
        <p className="muted" style={{ margin: 0 }}>
          Marketlist hit an unexpected error. You can retry this screen or go home.
        </p>
        {error.digest ? (
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRetry}
            onKeyDown={handleRetryKeyDown}
            aria-label="Retry this page"
          >
            Try again
          </button>
          <a className="btn btn-secondary" href="/app" aria-label="Go to home">
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
