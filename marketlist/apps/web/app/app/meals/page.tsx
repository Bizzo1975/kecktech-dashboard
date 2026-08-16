'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  DayNutritionStrip,
  LifestyleDisclaimer,
  WeekNutritionStrip,
  type MacroSet,
  type NutritionGoals,
} from '../../../components/NutritionUi';
import { apiFetch, readSession } from '../../../lib/api';
import { writeCoach } from '../../../lib/coach';

type Recipe = { id: string; name: string };
type Plan = {
  id: string;
  plannedDate: string;
  mealType: string;
  notes: string | null;
  recipeId: string | null;
  Recipe?: { id: string; name: string } | null;
};

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

const emptyMacros = (): MacroSet => ({ kcal: 0, proteinG: 0, carbG: 0, fatG: 0 });

const startOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

const weekdayLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

export default function MealsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => toIsoDate(new Date()));
  const [recipeId, setRecipeId] = useState('');
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>('dinner');
  const [listId, setListId] = useState('');
  const [missingOnly, setMissingOnly] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayTotals, setDayTotals] = useState<MacroSet>(emptyMacros);
  const [dayGoals, setDayGoals] = useState<NutritionGoals>({
    dailyCalorieGoal: null,
    proteinGoalG: null,
    carbGoalG: null,
    fatGoalG: null,
  });
  const [dayLogCount, setDayLogCount] = useState(0);
  const [weekNutrition, setWeekNutrition] = useState<{
    days: Array<{ date: string; totals: MacroSet }>;
    weekTotals: MacroSet;
    goals: NutritionGoals;
  } | null>(null);
  const [loggingPlanId, setLoggingPlanId] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return toIsoDate(d);
    });
  }, [weekStart]);

  const orderedWeekDays = useMemo(
    () => weekDays.map((iso) => ({ iso, label: weekdayLabel(iso).split(',')[0] })),
    [weekDays],
  );

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const loadNutrition = useCallback(async () => {
    const session = readSession();
    if (!session?.householdId) {
      setDayTotals(emptyMacros());
      setWeekNutrition(null);
      return;
    }
    const dayRes = await apiFetch<{
      totals: MacroSet;
      goals: NutritionGoals;
      logs: unknown[];
    }>(`/nutrition/day?householdId=${session.householdId}&date=${selectedDay}`, {
      token: session.accessToken,
    });
    if (dayRes.success) {
      setDayTotals(dayRes.data.totals);
      setDayGoals(dayRes.data.goals);
      setDayLogCount(dayRes.data.logs?.length ?? 0);
    }
    const from = weekDays[0];
    const to = weekDays[6];
    const weekRes = await apiFetch<{
      days: Array<{ date: string; totals: MacroSet }>;
      weekTotals: MacroSet;
      goals: NutritionGoals;
    }>(`/nutrition/week?householdId=${session.householdId}&from=${from}&to=${to}`, {
      token: session.accessToken,
    });
    if (weekRes.success) setWeekNutrition(weekRes.data);
  }, [selectedDay, weekDays]);

  const load = useCallback(async () => {
    const session = readSession();
    if (!session) return;
    setLoading(true);
    const result = await apiFetch<{ plans: Plan[] }>('/meal-plans', { token: session.accessToken });
    if (result.success) setPlans(result.data.plans);
    const recipeRes = await apiFetch<{ recipes: Recipe[] }>('/recipes', { token: session.accessToken });
    if (recipeRes.success) {
      setRecipes(recipeRes.data.recipes);
      setRecipeId((prev) => prev || recipeRes.data.recipes[0]?.id || '');
    }
    if (session.householdId) {
      const listRes = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
        `/lists?householdId=${session.householdId}`,
        { token: session.accessToken },
      );
      if (listRes.success) {
        setLists(listRes.data.lists);
        setListId((prev) => prev || listRes.data.lists[0]?.id || '');
      }
    }
    await loadNutrition();
    setLoading(false);
  }, [loadNutrition]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void loadNutrition();
  }, [loadNutrition]);

  const dayPlans = plans.filter((p) => p.plannedDate === selectedDay);

  const handlePrevWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() - 7);
    setWeekStart(next);
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session) return;
    const result = await apiFetch('/meal-plans', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        plannedDate: selectedDay,
        mealType,
        recipeId: recipeId || null,
        householdId: session.householdId || null,
        notes: null,
      }),
    });
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    writeCoach({ plannedMeal: true });
    showToast('Meal planned');
    await load();
  };

  const handleDelete = async (planId: string) => {
    const session = readSession();
    if (!session) return;
    await apiFetch(`/meal-plans/${planId}`, {
      method: 'DELETE',
      token: session.accessToken,
    });
    showToast('Removed');
    await load();
  };

  const handleCookLog = async (plan: Plan) => {
    const session = readSession();
    if (!session?.householdId) {
      showToast('Select a household first');
      return;
    }
    if (!plan.recipeId) {
      showToast('Add a recipe to this meal before logging');
      return;
    }
    setLoggingPlanId(plan.id);
    const result = await apiFetch<{ pantryDeducted?: unknown[] }>('/meal-logs', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        householdId: session.householdId,
        recipeId: plan.recipeId,
        mealPlanId: plan.id,
        mealType: plan.mealType,
        name: plan.Recipe?.name,
        consumedAt: plan.plannedDate,
        servingsEaten: 1,
        deductPantry: true,
      }),
    });
    setLoggingPlanId(null);
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    const pantryN = result.data.pantryDeducted?.length ?? 0;
    showToast(
      pantryN > 0
        ? `Logged meal · ${pantryN} pantry item${pantryN === 1 ? '' : 's'} deducted`
        : 'Meal logged',
    );
    await loadNutrition();
  };

  const handleGenerate = async () => {
    const session = readSession();
    if (!session) return;
    if (!listId) {
      showToast('Select a shopping list');
      return;
    }
    const from = weekDays[0];
    const to = weekDays[6];
    const result = await apiFetch<{ created: unknown[] }>('/meal-plans/generate-list', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({ listId, from, to, missingOnly }),
    });
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    const listName = lists.find((l) => l.id === listId)?.name || 'list';
    writeCoach({ plannedMeal: true });
    showToast(`Added missing ingredients to ${listName}`);
  };

  return (
    <div className="stack">
      <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Meal plan</h1>
      <p className="muted">Plan the week, log what you cook, and generate only what you&apos;re missing.</p>

      {!loading ? (
        <DayNutritionStrip
          date={selectedDay}
          totals={dayTotals}
          goals={dayGoals}
          logCount={dayLogCount}
        />
      ) : null}

      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="btn btn-ghost" onClick={handlePrevWeek} aria-label="Previous week">
            ← Prev
          </button>
          <strong>
            {weekdayLabel(weekDays[0])} – {weekdayLabel(weekDays[6])}
          </strong>
          <button type="button" className="btn btn-ghost" onClick={handleNextWeek} aria-label="Next week">
            Next →
          </button>
        </div>
        <div className="week-strip" role="tablist" aria-label="Week days">
          {weekDays.map((day) => {
            const count = plans.filter((p) => p.plannedDate === day).length;
            const selected = day === selectedDay;
            const dayKcal = weekNutrition?.days.find((d) => d.date === day)?.totals.kcal;
            return (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`week-day${selected ? ' on' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <span>{weekdayLabel(day).split(',')[0]}</span>
                <span className="muted">{count || '·'}</span>
                {typeof dayKcal === 'number' && dayKcal > 0 ? (
                  <span style={{ fontSize: '0.65rem' }}>{Math.round(dayKcal)} kcal</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {!loading && weekNutrition ? (
        <WeekNutritionStrip
          from={weekDays[0]}
          to={weekDays[6]}
          days={weekNutrition.days}
          weekTotals={weekNutrition.weekTotals}
          goals={weekNutrition.goals}
          orderedWeekDays={orderedWeekDays}
        />
      ) : null}

      <form className="card stack" onSubmit={handleAdd}>
        <div className="field">
          <label htmlFor="meal-recipe">Recipe</label>
          <select
            id="meal-recipe"
            value={recipeId}
            onChange={(e) => setRecipeId(e.target.value)}
            aria-label="Select recipe for meal"
          >
            <option value="">No recipe</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="meal-type">Meal</label>
          <select
            id="meal-type"
            value={mealType}
            onChange={(e) => setMealType(e.target.value as (typeof MEAL_TYPES)[number])}
          >
            {MEAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit">
          Add to {weekdayLabel(selectedDay)}
        </button>
      </form>

      <div className="card stack">
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Generate shopping list</h2>
        <div className="field">
          <label htmlFor="meal-list">List</label>
          <select id="meal-list" value={listId} onChange={(e) => setListId(e.target.value)}>
            <option value="">Select a list…</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>
        <label className="row" style={{ gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(e) => setMissingOnly(e.target.checked)}
          />
          Missing only (skip pantry matches)
        </label>
        <button type="button" className="btn btn-secondary" onClick={handleGenerate}>
          Generate for this week
        </button>
      </div>

      {loading ? <div className="skeleton" /> : null}

      {!loading && dayPlans.length === 0 ? (
        <div className="empty">
          <h2>No meals on this day</h2>
          <p>Pick a recipe and add a slot for {weekdayLabel(selectedDay)}.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => document.getElementById('meal-recipe')?.focus()}
          >
            Add a meal
          </button>
        </div>
      ) : null}

      {dayPlans.map((plan) => (
        <div key={plan.id} className="list-row">
          <div style={{ flex: 1 }}>
            <strong>
              {plan.mealType}
              {plan.Recipe?.name ? ` · ${plan.Recipe.name}` : ''}
            </strong>
            <div className="muted">{plan.plannedDate}</div>
          </div>
          {plan.recipeId ? (
            <button
              type="button"
              className="btn btn-primary"
              aria-label={`Cook and log ${plan.Recipe?.name || plan.mealType}`}
              disabled={loggingPlanId === plan.id}
              onClick={() => handleCookLog(plan)}
            >
              {loggingPlanId === plan.id ? 'Logging…' : 'Cook / log'}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Remove meal plan"
            onClick={() => handleDelete(plan.id)}
          >
            Remove
          </button>
        </div>
      ))}

      <LifestyleDisclaimer />

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
