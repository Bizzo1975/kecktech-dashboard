'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  apiFetch,
  clearSession,
  readSession,
  setHouseholdId,
  updateStoredUser,
  type SessionUser,
} from '../../../lib/api';

const PREF_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten_free', label: 'Gluten-free' },
  { id: 'dairy_free', label: 'Dairy-free' },
] as const;

type HouseholdRow = {
  id: string;
  name: string;
  inviteCode: string;
  monthlyBudgetGoal?: number | string | null;
  dailyCalorieGoal?: number | string | null;
  proteinGoalG?: number | string | null;
  carbGoalG?: number | string | null;
  fatGoalG?: number | string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [householdId, setHouseholdIdState] = useState<string | null>(null);
  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [householdName, setHouseholdName] = useState('Home');
  const [inviteCode, setInviteCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [notifyExpiring, setNotifyExpiring] = useState(false);
  const [notifyTripReminder, setNotifyTripReminder] = useState(false);
  const [budgetGoal, setBudgetGoal] = useState('');
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState('');
  const [proteinGoal, setProteinGoal] = useState('');
  const [carbGoal, setCarbGoal] = useState('');
  const [fatGoal, setFatGoal] = useState('');
  const [nutritionSaving, setNutritionSaving] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const loadHouseholds = useCallback(async () => {
    const session = readSession();
    if (!session) return;
    const result = await apiFetch<{ households: HouseholdRow[] }>('/households', {
      token: session.accessToken,
    });
    if (result.success) {
      setHouseholds(result.data.households);
      const session = readSession();
      const active = result.data.households.find((h) => h.id === session?.householdId);
      if (active) {
        setBudgetGoal(
          active.monthlyBudgetGoal != null && active.monthlyBudgetGoal !== ''
            ? String(active.monthlyBudgetGoal)
            : '',
        );
        setCalorieGoal(
          active.dailyCalorieGoal != null && active.dailyCalorieGoal !== ''
            ? String(active.dailyCalorieGoal)
            : '',
        );
        setProteinGoal(
          active.proteinGoalG != null && active.proteinGoalG !== '' ? String(active.proteinGoalG) : '',
        );
        setCarbGoal(
          active.carbGoalG != null && active.carbGoalG !== '' ? String(active.carbGoalG) : '',
        );
        setFatGoal(active.fatGoalG != null && active.fatGoalG !== '' ? String(active.fatGoalG) : '');
      }
    }
  }, []);

  useEffect(() => {
    const session = readSession();
    if (!session) return;
    setSessionUser(session.user);
    setHouseholdIdState(session.householdId);
    setDietaryPrefs(session.user.dietaryPrefs || []);
    void (async () => {
      const me = await apiFetch<{ user: SessionUser }>('/auth/me', { token: session.accessToken });
      if (me.success) {
        updateStoredUser(me.data.user);
        setSessionUser(me.data.user);
        setDietaryPrefs(me.data.user.dietaryPrefs || []);
        setNotifyExpiring(Boolean(me.data.user.notificationPrefs?.notifyExpiring));
        setNotifyTripReminder(Boolean(me.data.user.notificationPrefs?.notifyTripReminder));
      }
      await loadHouseholds();
    })();
  }, [loadHouseholds]);

  const handleSwitchHousehold = (id: string) => {
    setHouseholdId(id);
    setHouseholdIdState(id);
    showToast('Switched household');
  };

  const handleCopyInvite = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast('Invite code copied');
    } catch {
      showToast(`Invite code: ${code}`);
    }
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session) return;
    const result = await apiFetch<{ household: { id: string; inviteCode: string } }>('/households', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({ name: householdName }),
    });
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    setHouseholdId(result.data.household.id);
    setHouseholdIdState(result.data.household.id);
    setCreatedCode(result.data.household.inviteCode);
    await loadHouseholds();
  };

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session) return;
    const result = await apiFetch<{ household: { id: string } }>('/households/join', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({ inviteCode }),
    });
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    setHouseholdId(result.data.household.id);
    setHouseholdIdState(result.data.household.id);
    setInviteCode('');
    showToast('Joined household');
    await loadHouseholds();
  };

  const handlePassword = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session) return;
    const result = await apiFetch('/auth/password', {
      method: 'PUT',
      token: session.accessToken,
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    showToast(result.success ? 'Password updated' : result.error.message);
  };

  const handleTogglePref = (id: string) => {
    setDietaryPrefs((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleSavePrefs = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session) return;
    const result = await apiFetch<{ user: SessionUser }>('/me/preferences', {
      method: 'PATCH',
      token: session.accessToken,
      body: JSON.stringify({
        dietaryPrefs,
        notifyExpiring,
        notifyTripReminder,
      }),
    });
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    updateStoredUser(result.data.user);
    setSessionUser(result.data.user);
    showToast('Preferences saved');
  };

  const handleSaveNutritionGoals = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session?.householdId) {
      showToast('Select a household first');
      return;
    }
    setNutritionSaving(true);
    const parseGoal = (raw: string, intOnly = false) => {
      const trimmed = raw.trim();
      if (trimmed === '') return null;
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) return NaN;
      return intOnly ? Math.round(n) : n;
    };
    const dailyCalorieGoal = parseGoal(calorieGoal, true);
    const proteinGoalG = parseGoal(proteinGoal);
    const carbGoalG = parseGoal(carbGoal);
    const fatGoalG = parseGoal(fatGoal);
    if (
      [dailyCalorieGoal, proteinGoalG, carbGoalG, fatGoalG].some(
        (v) => v !== null && Number.isNaN(v as number),
      )
    ) {
      setNutritionSaving(false);
      showToast('Enter valid goal amounts');
      return;
    }
    const result = await apiFetch<{ household: HouseholdRow }>(`/households/${session.householdId}`, {
      method: 'PATCH',
      token: session.accessToken,
      body: JSON.stringify({
        dailyCalorieGoal,
        proteinGoalG,
        carbGoalG,
        fatGoalG,
      }),
    });
    setNutritionSaving(false);
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    showToast('Nutrition goals saved');
    await loadHouseholds();
  };

  const handleSaveBudget = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session?.householdId) {
      showToast('Select a household first');
      return;
    }
    setBudgetSaving(true);
    const trimmed = budgetGoal.trim();
    const monthlyBudgetGoal = trimmed === '' ? null : Number(trimmed);
    if (monthlyBudgetGoal !== null && (!Number.isFinite(monthlyBudgetGoal) || monthlyBudgetGoal < 0)) {
      setBudgetSaving(false);
      showToast('Enter a valid budget amount');
      return;
    }
    const result = await apiFetch<{ household: HouseholdRow }>(`/households/${session.householdId}`, {
      method: 'PATCH',
      token: session.accessToken,
      body: JSON.stringify({ monthlyBudgetGoal }),
    });
    setBudgetSaving(false);
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    showToast('Budget goal saved');
    await loadHouseholds();
  };

  const handleEnableWebNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Notifications are not supported in this browser');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('Browser notifications enabled for expiring pantry banners');
      return;
    }
    showToast('Permission denied — use Push on mobile for trip reminders');
  };

  const handleExport = async () => {
    const session = readSession();
    if (!session) return;
    const result = await apiFetch<unknown>('/me/export', { token: session.accessToken });
    if (result.success) setExportJson(JSON.stringify(result.data, null, 2));
  };

  const handleDeleteAccount = async () => {
    const session = readSession();
    if (!session || deleteConfirm !== 'DELETE') return;
    setDeletingAccount(true);
    const result = await apiFetch('/auth/me', {
      method: 'DELETE',
      token: session.accessToken,
    });
    setDeletingAccount(false);
    if (!result.success) {
      setToast(result.error.message);
      setTimeout(() => setToast(null), 3000);
      return;
    }
    clearSession();
    router.replace('/login');
  };

  return (
    <div className="stack">
      <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Settings</h1>
      <p className="muted">
        {sessionUser?.name} · {sessionUser?.email}
      </p>
      <p className="muted">Active household: {householdId || 'none'}</p>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Your households</h2>
        {households.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No households yet — create or join below.
          </p>
        ) : (
          households.map((hh) => {
            const isActive = hh.id === householdId;
            return (
              <div
                key={hh.id}
                className="list-row"
                style={{
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  borderColor: isActive ? 'var(--citrus)' : undefined,
                  borderWidth: isActive ? 2 : undefined,
                }}
              >
                <div style={{ flex: 1, minWidth: 160 }}>
                  <strong>
                    {hh.name}
                    {isActive ? ' · Active' : ''}
                  </strong>
                  <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>
                      Invite: <code>{hh.inviteCode}</code>
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      aria-label={`Copy invite code for ${hh.name}`}
                      onClick={() => handleCopyInvite(hh.inviteCode)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className={isActive ? 'btn btn-secondary' : 'btn btn-primary'}
                  disabled={isActive}
                  aria-label={
                    isActive ? `${hh.name} is the active household` : `Use ${hh.name} household`
                  }
                  aria-pressed={isActive}
                  onClick={() => handleSwitchHousehold(hh.id)}
                >
                  {isActive ? 'Using this household' : 'Use this household'}
                </button>
              </div>
            );
          })
        )}
      </div>

      <form className="card stack" onSubmit={handleCreate}>
        <h2 style={{ margin: 0 }}>Create household</h2>
        <div className="field">
          <label htmlFor="hh">New household name</label>
          <input id="hh" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit">
          Create household
        </button>
        {createdCode ? (
          <p>
            Invite code: <strong>{createdCode}</strong>
          </p>
        ) : null}
      </form>

      <form className="card stack" onSubmit={handleJoin}>
        <div className="field">
          <label htmlFor="invite">Join with invite code</label>
          <input
            id="invite"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          />
        </div>
        <button className="btn btn-secondary" type="submit">
          Join household
        </button>
      </form>

      <form className="card stack" onSubmit={handleSaveBudget}>
        <h2 style={{ margin: 0 }}>Monthly budget goal</h2>
        <p className="muted" style={{ margin: 0 }}>
          Compared on Insights against prices recorded this calendar month.
        </p>
        <div className="field">
          <label htmlFor="budget-goal">Goal (USD)</label>
          <input
            id="budget-goal"
            type="number"
            min="0"
            step="0.01"
            value={budgetGoal}
            onChange={(e) => setBudgetGoal(e.target.value)}
            placeholder="e.g. 500"
            aria-label="Monthly budget goal in dollars"
          />
        </div>
        <button
          className="btn btn-secondary"
          type="submit"
          disabled={budgetSaving || !householdId}
          aria-label="Save monthly budget goal"
        >
          {budgetSaving ? 'Saving…' : 'Save budget goal'}
        </button>
      </form>

      <form className="card stack" onSubmit={handleSaveNutritionGoals}>
        <h2 style={{ margin: 0 }}>Nutrition goals</h2>
        <p className="muted" style={{ margin: 0 }}>
          Lifestyle targets for meal logging — not medical prescriptions. Shared household members see
          the same goals on Meals and Insights.
        </p>
        <div className="field">
          <label htmlFor="calorie-goal">Daily calories (kcal)</label>
          <input
            id="calorie-goal"
            type="number"
            min="0"
            step="1"
            value={calorieGoal}
            onChange={(e) => setCalorieGoal(e.target.value)}
            placeholder="e.g. 2000"
            aria-label="Daily calorie goal"
          />
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="field" style={{ flex: 1, minWidth: 120 }}>
            <label htmlFor="protein-goal">Protein (g)</label>
            <input
              id="protein-goal"
              type="number"
              min="0"
              step="1"
              value={proteinGoal}
              onChange={(e) => setProteinGoal(e.target.value)}
              placeholder="e.g. 120"
              aria-label="Daily protein goal in grams"
            />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 120 }}>
            <label htmlFor="carb-goal">Carbs (g)</label>
            <input
              id="carb-goal"
              type="number"
              min="0"
              step="1"
              value={carbGoal}
              onChange={(e) => setCarbGoal(e.target.value)}
              placeholder="e.g. 250"
              aria-label="Daily carb goal in grams"
            />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 120 }}>
            <label htmlFor="fat-goal">Fat (g)</label>
            <input
              id="fat-goal"
              type="number"
              min="0"
              step="1"
              value={fatGoal}
              onChange={(e) => setFatGoal(e.target.value)}
              placeholder="e.g. 65"
              aria-label="Daily fat goal in grams"
            />
          </div>
        </div>
        <button
          className="btn btn-secondary"
          type="submit"
          disabled={nutritionSaving || !householdId}
          aria-label="Save nutrition goals"
        >
          {nutritionSaving ? 'Saving…' : 'Save nutrition goals'}
        </button>
      </form>

      <form className="card stack" onSubmit={handleSavePrefs}>
        <h2 style={{ margin: 0 }}>Dietary preferences</h2>
        <p className="muted" style={{ margin: 0 }}>
          Used to filter recipe suggestions (confirm-first — never auto-changes your lists).
        </p>
        {PREF_OPTIONS.map((opt) => (
          <label key={opt.id} className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={dietaryPrefs.includes(opt.id)}
              onChange={() => handleTogglePref(opt.id)}
              aria-label={opt.label}
            />
            <span>{opt.label}</span>
          </label>
        ))}
        <h3 style={{ margin: '0.5rem 0 0' }}>Notifications</h3>
        <label className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={notifyExpiring}
            onChange={(e) => setNotifyExpiring(e.target.checked)}
            aria-label="Notify when pantry items are expiring"
          />
          <span>Notify when pantry items are expiring</span>
        </label>
        <label className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={notifyTripReminder}
            onChange={(e) => setNotifyTripReminder(e.target.checked)}
            aria-label="Trip reminder preference"
          />
          <span>Trip / list reminder preference</span>
        </label>
        <p className="muted" style={{ margin: 0 }}>
          Push delivery runs on the mobile app. On web you can enable an optional browser permission
          for expiring banners.
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleEnableWebNotifications}
          aria-label="Enable browser notifications for expiring pantry"
        >
          Enable browser notifications
        </button>
        <button className="btn btn-secondary" type="submit">
          Save preferences
        </button>
      </form>

      <form className="card stack" onSubmit={handlePassword}>
        <h2 style={{ margin: 0 }}>Password</h2>
        <div className="field">
          <label htmlFor="cur">Current password</label>
          <input
            id="cur"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="next">New password</label>
          <input
            id="next"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
          />
        </div>
        <button className="btn btn-secondary" type="submit">
          Change password
        </button>
      </form>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Staples catalog</h2>
        <p className="muted" style={{ margin: 0 }}>
          Browse household staples you can pull onto lists quickly.
        </p>
        <Link className="btn btn-secondary" href="/app/catalog" aria-label="Open staples catalog">
          Open staples catalog
        </Link>
      </div>

      <div className="card stack">
        <button type="button" className="btn btn-ghost" onClick={handleExport} aria-label="Export my data">
          Export my data
        </button>
        {exportJson ? (
          <pre style={{ overflow: 'auto', maxHeight: 240, fontSize: 12 }}>{exportJson}</pre>
        ) : null}
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Delete account</h2>
        <p className="muted" style={{ margin: 0 }}>
          Permanently deletes your account, recipes, and meal plans. Households you leave stay for
          other members.
        </p>
        <div className="field">
          <label htmlFor="delete-confirm">Type DELETE to confirm</label>
          <input
            id="delete-confirm"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            autoComplete="off"
            aria-label="Type DELETE to confirm account deletion"
          />
        </div>
        <button
          type="button"
          className="btn btn-danger"
          disabled={deletingAccount || deleteConfirm !== 'DELETE'}
          aria-label="Permanently delete account"
          onClick={() => void handleDeleteAccount()}
        >
          {deletingAccount ? 'Deleting…' : 'Delete account'}
        </button>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Legal</h2>
        <p className="muted" style={{ margin: 0 }}>
          Privacy policy and terms of service for Marketlist.
        </p>
        <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" href="/privacy" aria-label="Open privacy policy">
            Privacy policy
          </Link>
          <Link className="btn btn-secondary" href="/terms" aria-label="Open terms of service">
            Terms of service
          </Link>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Support:{' '}
          <a href="mailto:support@marketlist.app">support@marketlist.app</a>
        </p>
      </div>

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
