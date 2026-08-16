'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, saveSession, setHouseholdId } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await apiFetch<{
      user: { id: string; email: string; name: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error.message);
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
    }
    router.push('/app');
  };

  return (
    <main className="content" style={{ maxWidth: 440, margin: '4rem auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem' }}>Sign in</h1>
      <p className="muted">Welcome back to Marketlist.</p>
      <form className="stack card" onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={loading}
          aria-label="Try demo account"
          onClick={async () => {
            setLoading(true);
            setError(null);
            const result = await apiFetch<{
              user: { id: string; email: string; name: string };
              accessToken: string;
              refreshToken: string;
            }>('/auth/login', {
              method: 'POST',
              body: JSON.stringify({ email: 'demo@marketlist.app', password: 'demo12345' }),
            });
            setLoading(false);
            if (!result.success) {
              setError(result.error.message);
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
                router.push(`/app/lists/${weekly.id}`);
                return;
              }
            }
            router.push('/app');
          }}
        >
          Try demo
        </button>
        <Link href="/forgot-password" className="muted">
          Forgot password?
        </Link>
        <Link href="/register" className="btn btn-ghost">
          Create account
        </Link>
        <Link href="/" className="muted">
          Back to home
        </Link>
      </form>
    </main>
  );
}
