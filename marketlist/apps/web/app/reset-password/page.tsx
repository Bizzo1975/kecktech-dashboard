'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '../../lib/api';

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get('token');
    if (fromQuery) setToken(fromQuery);
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await apiFetch<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: token.trim(), password }),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    router.push('/login');
  };

  return (
    <form className="stack card" onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
      <div className="field">
        <label htmlFor="token">Reset token</label>
        <input
          id="token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          aria-label="Password reset token"
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label htmlFor="password">New password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          aria-label="New password"
        />
      </div>
      {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={loading || !token.trim()}>
        {loading ? 'Updating…' : 'Update password'}
      </button>
      <Link href="/login" className="muted">
        Back to sign in
      </Link>
    </form>
  );
};

export default function ResetPasswordPage() {
  return (
    <main className="content" style={{ maxWidth: 440, margin: '4rem auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem' }}>Reset password</h1>
      <p className="muted">Paste the token from your email or open the reset link.</p>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
