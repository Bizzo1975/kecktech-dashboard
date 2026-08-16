'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DayNutritionStrip,
  LifestyleDisclaimer,
  WeekNutritionStrip,
  type MacroSet,
  type NutritionGoals,
} from '../../../components/NutritionUi';
import { apiFetch, readSession } from '../../../lib/api';
import { writeCoach } from '../../../lib/coach';

type Restock = {
  itemName: string;
  reason: string;
  urgency: string;
  pantryId?: string;
};

export default function InsightsPage() {
  const [spending, setSpending] = useState<{
    byCategory: Record<string, number>;
    total: number;
    monthTotal?: number;
    monthlyBudgetGoal?: number | null;
  } | null>(null);
  const [restock, setRestock] = useState<Restock[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [listId, setListId] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayTotals, setDayTotals] = useState<MacroSet>({ kcal: 0, proteinG: 0, carbG: 0, fatG: 0 });
  const [dayGoals, setDayGoals] = useState<NutritionGoals>({
    dailyCalorieGoal: null,
    proteinGoalG: null,
    carbGoalG: null,
    fatGoalG: null,
  });
  const [dayLogCount, setDayLogCount] = useState(0);
  const [weekNutrition, setWeekNutrition] = useState<{
    from: string;
    to: string;
    days: Array<{ date: string; totals: MacroSet }>;
    weekTotals: MacroSet;
    goals: NutritionGoals;
  } | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async () => {
    const session = readSession();
    if (!session) return;
    setLoading(true);
    const s = await apiFetch<{
      byCategory: Record<string, number>;
      total: number;
      monthTotal?: number;
      monthlyBudgetGoal?: number | null;
    }>(
      `/insights/spending${session.householdId ? `?householdId=${session.householdId}` : ''}`,
      { token: session.accessToken },
    );
    if (s.success) setSpending(s.data);
    const r = await apiFetch<{ suggestions: Restock[] }>('/insights/restock', {
      token: session.accessToken,
    });
    if (r.success) setRestock(r.data.suggestions);
    if (session.householdId) {
      const today = new Date().toISOString().slice(0, 10);
      const weekStart = new Date();
      const day = weekStart.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      weekStart.setDate(weekStart.getDate() + diff);
      const from = weekStart.toISOString().slice(0, 10);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const to = weekEnd.toISOString().slice(0, 10);

      const dayNut = await apiFetch<{
        totals: MacroSet;
        goals: NutritionGoals;
        logs: unknown[];
      }>(`/nutrition/day?householdId=${session.householdId}&date=${today}`, {
        token: session.accessToken,
      });
      if (dayNut.success) {
        setDayTotals(dayNut.data.totals);
        setDayGoals(dayNut.data.goals);
        setDayLogCount(dayNut.data.logs?.length ?? 0);
      }

      const weekNut = await apiFetch<{
        from: string;
        to: string;
        days: Array<{ date: string; totals: MacroSet }>;
        weekTotals: MacroSet;
        goals: NutritionGoals;
      }>(`/nutrition/week?householdId=${session.householdId}&from=${from}&to=${to}`, {
        token: session.accessToken,
      });
      if (weekNut.success) setWeekNutrition(weekNut.data);

      const listRes = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
        `/lists?householdId=${session.householdId}`,
        { token: session.accessToken },
      );
      if (listRes.success) {
        setLists(listRes.data.lists);
        setListId((prev) => prev || listRes.data.lists[0]?.id || '');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    writeCoach({ visitedInsights: true });
    load();
  }, [load]);

  const orderedWeekDays = useMemo(() => {
    if (!weekNutrition) return [];
    const start = new Date(`${weekNutrition.from}T12:00:00`);
    const slots: Array<{ iso: string; label: string }> = [];
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const iso = day.toISOString().slice(0, 10);
      slots.push({
        iso,
        label: day.toLocaleDateString(undefined, { weekday: 'short' }),
      });
    }
    return slots;
  }, [weekNutrition]);

  const bars = useMemo(() => {
    if (!spending) return [];
    const entries = Object.entries(spending.byCategory);
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => ({
        cat,
        amount,
        pct: Math.round((amount / max) * 100),
      }));
  }, [spending]);

  const handleAddRestock = async (item: Restock) => {
    const session = readSession();
    if (!session) return;
    if (!listId) {
      showToast('Select a list first');
      return;
    }
    if (item.pantryId) {
      await apiFetch(`/pantry/${item.pantryId}/add-to-list`, {
        method: 'POST',
        token: session.accessToken,
        body: JSON.stringify({ listId }),
      });
    } else {
      await apiFetch(`/lists/${listId}/items`, {
        method: 'POST',
        token: session.accessToken,
        body: JSON.stringify({ name: item.itemName }),
      });
    }
    const listName = lists.find((l) => l.id === listId)?.name || 'list';
    showToast(`Added ${item.itemName} to ${listName}`);
  };

  return (
    <div className="stack">
      <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Insights</h1>
      <p className="muted">Health tracking from your meal logs. Spend and restock stay factual.</p>

      {loading ? <div className="skeleton" /> : null}

      {!loading ? (
        <>
          <DayNutritionStrip
            date={new Date().toISOString().slice(0, 10)}
            totals={dayTotals}
            goals={dayGoals}
            logCount={dayLogCount}
          />
          {weekNutrition ? (
            <WeekNutritionStrip
              from={weekNutrition.from}
              to={weekNutrition.to}
              days={weekNutrition.days}
              weekTotals={weekNutrition.weekTotals}
              goals={weekNutrition.goals}
              orderedWeekDays={orderedWeekDays}
            />
          ) : null}
          <LifestyleDisclaimer />
        </>
      ) : null}

      {!loading && (!spending || spending.total === 0) ? (
        <div className="empty card">
          <h2>No spending data yet</h2>
          <p>
            Insights totals come from prices you record yourself. Open Prices, pick a store, and
            save a few items so category bars have real numbers — Marketlist does not invent spend.
          </p>
          <Link className="btn btn-primary" href="/app/prices" aria-label="Go to Prices to record data">
            Record prices
          </Link>
        </div>
      ) : null}

      {!loading && spending && spending.total > 0 ? (
        <div className="card stack">
          <strong>Total ${spending.total.toFixed(2)}</strong>
          {typeof spending.monthlyBudgetGoal === 'number' && spending.monthlyBudgetGoal > 0 ? (
            <div className="stack" style={{ gap: '0.35rem' }} aria-label="Monthly budget progress">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>This month</span>
                <span className="muted">
                  ${(spending.monthTotal ?? 0).toFixed(2)} / ${spending.monthlyBudgetGoal.toFixed(2)}
                </span>
              </div>
              <div className="bar-track" aria-hidden="true">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(((spending.monthTotal ?? 0) / spending.monthlyBudgetGoal) * 100),
                    )}%`,
                  }}
                />
              </div>
              <p className="muted" style={{ margin: 0 }}>
                {Math.round(((spending.monthTotal ?? 0) / spending.monthlyBudgetGoal) * 100)}% of
                monthly budget goal
              </p>
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Set a monthly budget goal in Settings to track progress here.
            </p>
          )}
          {bars.map((bar) => (
            <div key={bar.cat} className="stack" style={{ gap: '0.25rem' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>{bar.cat}</span>
                <span className="muted">${bar.amount.toFixed(2)}</span>
              </div>
              <div className="bar-track" aria-hidden="true">
                <div className="bar-fill" style={{ width: `${bar.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <section className="stack" aria-label="Restock suggestions">
        <h2 style={{ margin: 0 }}>Restock (opt-in)</h2>
        <div className="field">
          <label htmlFor="insights-list">List for Add</label>
          <select
            id="insights-list"
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            aria-label="Select list for restock adds"
          >
            <option value="">Select a list…</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>
        {restock.length === 0 ? <p className="muted">No restock suggestions right now.</p> : null}
        {restock.map((s) => (
          <div key={`${s.itemName}-${s.urgency}`} className={`list-row urgency-${s.urgency}`}>
            <div style={{ flex: 1 }}>
              <strong>{s.itemName}</strong>
              <div className="muted">
                {s.reason}
                {s.urgency ? ` · ${s.urgency}` : ''}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              aria-label={`Add ${s.itemName} to list`}
              onClick={() => handleAddRestock(s)}
            >
              Add
            </button>
          </div>
        ))}
      </section>

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
