'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, readSession } from '../../lib/api';
import { readActivation } from '../../lib/activation';

type ListItem = {
  id: string;
  name: string;
  checked: boolean;
  aisleSection: string | null;
};

type List = {
  id: string;
  name: string;
  items?: ListItem[];
};

type Pantry = { id: string; name: string; expiryDate: string | null };
type Member = { id: string; name: string; email: string; role: string };

export default function AppHomePage() {
  const [lists, setLists] = useState<List[]>([]);
  const [expiring, setExpiring] = useState<Pantry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultListId, setDefaultListId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const session = readSession();
    if (!session) return;
    setLoading(true);
    setError(null);
    setDefaultListId(readActivation().defaultListId);
    if (!session.householdId) {
      setLists([]);
      setExpiring([]);
      setMembers([]);
      setLoading(false);
      return;
    }
    const listRes = await apiFetch<{ lists: List[] }>(`/lists?householdId=${session.householdId}`, {
      token: session.accessToken,
    });
    if (listRes.success) {
      setLists(listRes.data.lists);
    } else {
      setError(listRes.error.message);
    }
    const pantry = await apiFetch<{ items: Pantry[] }>(
      `/pantry?householdId=${session.householdId}&expiringWithinDays=5`,
      { token: session.accessToken },
    );
    if (pantry.success) setExpiring(pantry.data.items);
    const membersRes = await apiFetch<{ members: Member[] }>(
      `/households/${session.householdId}/members`,
      { token: session.accessToken },
    );
    if (membersRes.success) setMembers(membersRes.data.members);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const session = typeof window !== 'undefined' ? readSession() : null;
  const hasHousehold = Boolean(session?.householdId);
  const tripList =
    lists.find((l) => l.id === defaultListId) ||
    lists.find((l) => l.name === 'Weekly run') ||
    lists[0] ||
    null;
  const unchecked = (tripList?.items || []).filter((i) => !i.checked);
  const preview = unchecked.slice(0, 5);
  const firstName = session?.user.name.split(' ')[0] || 'there';

  return (
    <div className="stack home-command">
      <header className="home-hero-block">
        <h1 className="home-greeting">Hi, {firstName}</h1>
        <p className="muted home-jobline">
          {loading
            ? 'Loading your trip…'
            : tripList
              ? unchecked.length > 0
                ? `${unchecked.length} left on ${tripList.name}`
                : `${tripList.name} is clear — add what you need`
              : hasHousehold
                ? 'Start this week’s shop with a list'
                : 'Create a household to start shopping together'}
        </p>
      </header>

      {!hasHousehold ? (
        <div className="empty card">
          <h2>Start with your household</h2>
          <p>Create a home, or join with an invite code.</p>
          <Link className="btn btn-primary" href="/app/settings">
            Create or join household
          </Link>
        </div>
      ) : null}

      {error ? (
        <p className="muted" style={{ color: 'var(--danger)' }} role="alert">
          {error}
        </p>
      ) : null}

      <section className="stack" aria-label="Today's trip">
        <h2 className="section-title">Today&apos;s trip</h2>
        {loading ? <div className="skeleton trip-skeleton" /> : null}
        {!loading && hasHousehold && !tripList ? (
          <div className="empty card">
            <h2>No list yet</h2>
            <p>Create Weekly run, then add what you need.</p>
            <Link className="btn btn-primary" href="/app/lists">
              Create a list
            </Link>
          </div>
        ) : null}
        {!loading && tripList ? (
          <Link
            href={`/app/lists/${tripList.id}`}
            className="card trip-command"
            style={{ display: 'block' }}
            aria-label={`Continue shopping ${tripList.name}, ${unchecked.length} remaining`}
          >
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong className="trip-command-name">{tripList.name}</strong>
              <span className="trip-count">{unchecked.length} left</span>
            </div>
            {preview.length > 0 ? (
              <ul className="trip-preview" aria-label="Upcoming items">
                {preview.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    <span className="muted">{item.aisleSection || 'Other'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: '0.75rem 0 0' }}>
                List is clear — open to add items for the next run.
              </p>
            )}
            <span className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Continue shopping
            </span>
          </Link>
        ) : null}
      </section>

      {hasHousehold ? (
        <section className="card household-row" aria-label="Household">
          <div>
            <strong>{members.length || 1} household member{members.length === 1 ? '' : 's'}</strong>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              {members.length > 0
                ? members.map((m) => m.name.split(' ')[0]).join(', ')
                : 'Invite a partner when you are ready'}
            </p>
          </div>
          <Link className="btn btn-ghost" href="/app/settings">
            Invite / join
          </Link>
        </section>
      ) : null}

      <section className="stack" aria-label="Expiring soon">
        <h2 className="section-title">Expiring soon</h2>
        {loading ? <div className="skeleton" /> : null}
        {!loading && expiring.length === 0 ? (
          <p className="muted">Nothing urgent. Complete a trip — pantry items show up here.</p>
        ) : null}
        {!loading && expiring.length > 0 ? (
          <>
            <div className="expiring-strip" role="list">
              {expiring.map((item) => (
                <div key={item.id} className="expiring-chip" role="listitem">
                  <strong>{item.name}</strong>
                  <span className="muted">Expires {item.expiryDate}</span>
                </div>
              ))}
            </div>
            <div className="row">
              <Link className="btn btn-secondary" href="/app/pantry">
                Pantry
              </Link>
              <Link className="btn btn-primary" href="/app/recipes">
                Cook tonight
              </Link>
            </div>
          </>
        ) : null}
      </section>

      <nav className="home-secondary" aria-label="More tools">
        <Link href="/app/recipes">Recipes</Link>
        <Link href="/app/garden">Garden</Link>
        <Link href="/app/capture">Capture</Link>
        <Link href="/app/prices">Prices</Link>
      </nav>
    </div>
  );
}
