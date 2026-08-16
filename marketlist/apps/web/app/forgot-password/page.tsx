'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { apiFetch } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await apiFetch<{ message: string; resetUrl?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setDone(true);
    setResetUrl(result.data.resetUrl || null);
  };

  return (
    <main className="content" style={{ maxWidth: 440, margin: '4rem auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem' }}>Forgot password</h1>
      <p className="muted">We will email a reset link if that address is registered.</p>
      {done ? (
        <div className="card stack" style={{ marginTop: '1.5rem' }}>
          <p role="status">
            If that email is registered, a reset link has been sent. Check your inbox (and console in
            local non-production setups).
          </p>
          {resetUrl ? (
            <p className="muted" style={{ wordBreak: 'break-all' }}>
              Dev reset URL:{' '}
              <a href={resetUrl}>{resetUrl}</a>
            </p>
          ) : null}
          <Link className="btn btn-primary" href="/login">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="stack card" onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Account email"
            />
          </div>
          {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
          <Link href="/login" className="muted">
            Back to sign in
          </Link>
        </form>
      )}
    </main>
  );
}
