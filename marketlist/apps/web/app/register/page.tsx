'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, saveSession, setHouseholdId } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
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
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    if (!result.success) {
      setLoading(false);
      setError(result.error.message);
      return;
    }
    saveSession({
      accessToken: result.data.accessToken,
      refreshToken: result.data.refreshToken,
      user: result.data.user,
    });

    if (mode === 'join') {
      const joined = await apiFetch<{ household: { id: string } }>('/households/join', {
        method: 'POST',
        token: result.data.accessToken,
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      });
      setLoading(false);
      if (!joined.success) {
        setError(joined.error.message || 'Could not join with that code. Try again from Settings.');
        return;
      }
      setHouseholdId(joined.data.household.id);
      const lists = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
        `/lists?householdId=${joined.data.household.id}`,
        { token: result.data.accessToken },
      );
      const weekly =
        lists.success &&
        (lists.data.lists.find((l) => l.name === 'Weekly run') || lists.data.lists[0]);
      if (weekly) {
        router.push(`/app/lists/${weekly.id}`);
        return;
      }
      router.push('/app/lists');
      return;
    }

    const created = await apiFetch<{
      household: { id: string };
      list: { id: string };
    }>('/households', {
      method: 'POST',
      token: result.data.accessToken,
      body: JSON.stringify({ name: `${name}'s home` }),
    });
    setLoading(false);
    if (!created.success) {
      setError(created.error.message || 'Account created, but household setup failed. Open Settings to create a home.');
      return;
    }
    setHouseholdId(created.data.household.id);
    router.push(`/app/lists/${created.data.list.id}`);
  };

  return (
    <main className="content" style={{ maxWidth: 440, margin: '4rem auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem' }}>Join Marketlist</h1>
      <div className="row" style={{ gap: '0.5rem', marginTop: '1rem' }} role="tablist" aria-label="Signup mode">
        <button
          type="button"
          className={`btn ${mode === 'create' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setMode('create')}
          aria-selected={mode === 'create'}
        >
          Create home
        </button>
        <button
          type="button"
          className={`btn ${mode === 'join' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setMode('join')}
          aria-selected={mode === 'join'}
        >
          Join with code
        </button>
      </div>
      <form className="stack card" onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {mode === 'join' ? (
          <div className="field">
            <label htmlFor="invite">Invite code</label>
            <input
              id="invite"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              aria-label="Household invite code"
            />
          </div>
        ) : null}
        {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating…' : mode === 'join' ? 'Join household' : 'Create account'}
        </button>
        <Link href="/login" className="btn btn-ghost">
          Sign in instead
        </Link>
      </form>
    </main>
  );
}
