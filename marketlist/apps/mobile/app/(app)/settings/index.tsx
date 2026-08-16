import React, { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Network from 'expo-network';
import { Button, TextField } from '../../../src/components/ui';
import { LifestyleDisclaimer } from '../../../src/components/nutrition';
import { apiFetch, getApiBaseUrl } from '../../../src/lib/api';
import { clearSession, RootState, setHouseholdId, setSession } from '../../../src/store';
import { disconnectSocket } from '../../../src/lib/socket';
import {
  clearHouseholdId,
  clearTokens,
  getRefreshToken,
  saveHouseholdId,
  saveTokens,
} from '../../../src/lib/secureStorage';
import {
  registerForPushNotifications,
  syncNotificationPrefs,
} from '../../../src/lib/notifications';

const PREF_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten_free', label: 'Gluten-free' },
  { id: 'dairy_free', label: 'Dairy-free' },
] as const;

type MeUser = {
  id: string;
  email: string;
  name: string;
  dietaryPrefs?: string[] | null;
  notificationPrefs?: {
    notifyExpiring?: boolean;
    notifyTripReminder?: boolean;
  } | null;
};
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
type MemberRow = { id: string; email: string; name: string; role: string };

const legalBaseUrl = () => getApiBaseUrl().replace(/\/api\/?$/, '');

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { accessToken, user, householdId, refreshToken } = useSelector((s: RootState) => s.auth);
  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [householdName, setHouseholdName] = useState('Home');
  const [inviteCode, setInviteCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [notifyExpiring, setNotifyExpiring] = useState(false);
  const [notifyTripReminder, setNotifyTripReminder] = useState(false);
  const [budgetGoal, setBudgetGoal] = useState('');
  const [calorieGoal, setCalorieGoal] = useState('');
  const [proteinGoal, setProteinGoal] = useState('');
  const [carbGoal, setCarbGoal] = useState('');
  const [fatGoal, setFatGoal] = useState('');
  const [online, setOnline] = useState(true);

  const loadMembers = useCallback(
    async (id: string | null) => {
      if (!accessToken || !id) {
        setMembers([]);
        return;
      }
      const result = await apiFetch<{ members: MemberRow[] }>(`/households/${id}/members`, {
        token: accessToken,
      });
      if (result.success) setMembers(result.data.members);
      else setMembers([]);
    },
    [accessToken],
  );

  const loadHouseholds = useCallback(async () => {
    if (!accessToken) return;
    const result = await apiFetch<{ households: HouseholdRow[] }>('/households', {
      token: accessToken,
    });
    if (result.success) {
      setHouseholds(result.data.households);
      const active = result.data.households.find((h) => h.id === householdId);
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
          active.proteinGoalG != null && active.proteinGoalG !== ''
            ? String(active.proteinGoalG)
            : '',
        );
        setCarbGoal(
          active.carbGoalG != null && active.carbGoalG !== '' ? String(active.carbGoalG) : '',
        );
        setFatGoal(
          active.fatGoalG != null && active.fatGoalG !== '' ? String(active.fatGoalG) : '',
        );
      }
    }
  }, [accessToken, householdId]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const net = await Network.getNetworkStateAsync();
        setOnline(Boolean(net.isConnected));
      })();
      const netSub = Network.addNetworkStateListener((state) => {
        setOnline(Boolean(state.isConnected));
      });
      if (!accessToken) {
        return () => netSub.remove();
      }
      void (async () => {
        const me = await apiFetch<{ user: MeUser }>('/auth/me', { token: accessToken });
        if (me.success) {
          setDietaryPrefs(me.data.user.dietaryPrefs || []);
          setNotifyExpiring(Boolean(me.data.user.notificationPrefs?.notifyExpiring));
          setNotifyTripReminder(Boolean(me.data.user.notificationPrefs?.notifyTripReminder));
          const refresh = refreshToken || (await getRefreshToken());
          if (refresh) {
            dispatch(
              setSession({
                user: me.data.user,
                accessToken,
                refreshToken: refresh,
              }),
            );
          }
        }
        await loadHouseholds();
        await loadMembers(householdId);
      })();
      return () => netSub.remove();
    }, [accessToken, dispatch, householdId, loadHouseholds, loadMembers, refreshToken]),
  );

  const handleSwitchHousehold = async (id: string) => {
    dispatch(setHouseholdId(id));
    await saveHouseholdId(id);
    await loadMembers(id);
    Alert.alert('Switched household');
  };

  const handleShareInvite = async (code: string, name: string) => {
    try {
      await Share.share({
        message: `Join my Marketlist household "${name}" with invite code: ${code}`,
      });
    } catch {
      Alert.alert('Invite code', code);
    }
  };

  const handleCreateHousehold = async () => {
    if (!accessToken) return;
    const result = await apiFetch<{ household: { id: string; inviteCode: string } }>('/households', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ name: householdName }),
    });
    if (!result.success) {
      Alert.alert('Error', result.error.message);
      return;
    }
    dispatch(setHouseholdId(result.data.household.id));
    await saveHouseholdId(result.data.household.id);
    setCreatedCode(result.data.household.inviteCode);
    await loadHouseholds();
    await loadMembers(result.data.household.id);
  };

  const handleJoin = async () => {
    if (!accessToken) return;
    if (!inviteCode.trim()) {
      Alert.alert('Enter an invite code');
      return;
    }
    const result = await apiFetch<{ household: { id: string } }>('/households/join', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ inviteCode: inviteCode.trim() }),
    });
    if (!result.success) {
      Alert.alert('Error', result.error.message);
      return;
    }
    dispatch(setHouseholdId(result.data.household.id));
    await saveHouseholdId(result.data.household.id);
    setInviteCode('');
    Alert.alert('Joined household');
    await loadHouseholds();
    await loadMembers(result.data.household.id);
  };

  const handleLeaveHousehold = () => {
    if (!accessToken || !householdId) return;
    const active = households.find((h) => h.id === householdId);
    Alert.alert(
      'Leave household?',
      `Leave "${active?.name || 'this household'}"? Shared data stays with remaining members.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const result = await apiFetch(`/households/${householdId}/leave`, {
                method: 'POST',
                token: accessToken,
              });
              if (!result.success) {
                Alert.alert('Could not leave', result.error.message);
                return;
              }
              const remaining = households.filter((h) => h.id !== householdId);
              const nextId = remaining[0]?.id || null;
              dispatch(setHouseholdId(nextId));
              if (nextId) await saveHouseholdId(nextId);
              else await clearHouseholdId();
              setMembers([]);
              await loadHouseholds();
              if (nextId) await loadMembers(nextId);
              Alert.alert('Left household');
            })();
          },
        },
      ],
    );
  };

  const handlePassword = async () => {
    if (!accessToken) return;
    const result = await apiFetch('/auth/password', {
      method: 'PUT',
      token: accessToken,
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    Alert.alert(
      result.success ? 'Updated' : 'Error',
      result.success ? 'Password changed' : result.error.message,
    );
  };

  const handleTogglePref = (id: string) => {
    setDietaryPrefs((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleSavePrefs = async () => {
    if (!accessToken) return;
    const result = await apiFetch<{ user: MeUser }>('/me/preferences', {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify({
        dietaryPrefs,
        notifyExpiring,
        notifyTripReminder,
      }),
    });
    if (!result.success) {
      Alert.alert('Error', result.error.message);
      return;
    }
    const refresh = refreshToken || (await getRefreshToken());
    if (refresh) {
      dispatch(
        setSession({
          user: result.data.user,
          accessToken,
          refreshToken: refresh,
        }),
      );
    }
    await syncNotificationPrefs({
      accessToken,
      notifyExpiring,
      notifyTripReminder,
      householdId,
    });
    Alert.alert('Saved', 'Preferences updated');
  };

  const handleSaveBudget = async () => {
    if (!accessToken || !householdId) {
      Alert.alert('Select a household first');
      return;
    }
    const trimmed = budgetGoal.trim();
    const monthlyBudgetGoal = trimmed === '' ? null : Number(trimmed);
    if (monthlyBudgetGoal !== null && (!Number.isFinite(monthlyBudgetGoal) || monthlyBudgetGoal < 0)) {
      Alert.alert('Enter a valid budget amount');
      return;
    }
    const result = await apiFetch<{ household: HouseholdRow }>(`/households/${householdId}`, {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify({ monthlyBudgetGoal }),
    });
    if (!result.success) {
      Alert.alert('Error', result.error.message);
      return;
    }
    Alert.alert('Saved', 'Budget goal updated');
    await loadHouseholds();
  };

  const handleSaveNutritionGoals = async () => {
    if (!accessToken || !householdId) {
      Alert.alert('Select a household first');
      return;
    }
    const parseGoal = (raw: string, label: string, intOnly = false) => {
      const trimmed = raw.trim();
      if (trimmed === '') return null;
      const value = Number(trimmed);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Enter a valid ${label}`);
      }
      if (intOnly && !Number.isInteger(value)) {
        throw new Error(`${label} must be a whole number`);
      }
      return value;
    };
    try {
      const dailyCalorieGoal = parseGoal(calorieGoal, 'calorie goal', true);
      const proteinGoalG = parseGoal(proteinGoal, 'protein goal');
      const carbGoalG = parseGoal(carbGoal, 'carb goal');
      const fatGoalG = parseGoal(fatGoal, 'fat goal');
      const result = await apiFetch<{ household: HouseholdRow }>(`/households/${householdId}`, {
        method: 'PATCH',
        token: accessToken,
        body: JSON.stringify({
          dailyCalorieGoal,
          proteinGoalG,
          carbGoalG,
          fatGoalG,
        }),
      });
      if (!result.success) {
        Alert.alert('Error', result.error.message);
        return;
      }
      Alert.alert('Saved', 'Nutrition goals updated');
      await loadHouseholds();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Invalid goal');
    }
  };

  const handleEnablePush = async () => {
    if (!accessToken) return;
    const token = await registerForPushNotifications(accessToken);
    if (token) Alert.alert('Push enabled', 'Expo push token saved');
    else Alert.alert('Permission needed', 'Enable notifications in system settings');
  };

  const handleExport = async () => {
    if (!accessToken) return;
    const result = await apiFetch<unknown>('/me/export', { token: accessToken });
    if (!result.success) {
      Alert.alert('Export failed', result.error.message);
      return;
    }
    try {
      const dir = FileSystem.cacheDirectory;
      if (!dir) {
        Alert.alert('Export failed', 'No cache directory available');
        return;
      }
      const path = `${dir}marketlist-export.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(result.data, null, 2));
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Exported', 'Data saved locally but sharing is unavailable on this device.');
        return;
      }
      await Sharing.shareAsync(path, {
        mimeType: 'application/json',
        dialogTitle: 'Export Marketlist data',
        UTI: 'public.json',
      });
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Could not share file');
    }
  };

  const handleLogout = async () => {
    if (accessToken) {
      const refresh = refreshToken || (await getRefreshToken());
      await apiFetch('/auth/logout', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify(refresh ? { refreshToken: refresh } : {}),
      });
    }
    await clearTokens();
    disconnectSocket();
    dispatch(clearSession());
    router.replace('/(auth)/login');
  };

  const handleDeleteAccount = () => {
    if (!accessToken) return;
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, recipes, and meal plans. Households you leave stay for other members.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const result = await apiFetch('/auth/me', {
                method: 'DELETE',
                token: accessToken,
              });
              if (!result.success) {
                Alert.alert('Could not delete account', result.error.message);
                return;
              }
              await clearTokens();
              disconnectSocket();
              dispatch(clearSession());
              router.replace('/(auth)/login');
            })();
          },
        },
      ],
    );
  };

  const handleOpenLegal = async (path: '/privacy' | '/terms') => {
    const url = `${legalBaseUrl()}${path}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open link', url);
    }
  };

  const handleTryDemoLogin = async () => {
    const result = await apiFetch<{
      user: MeUser;
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'demo@marketlist.app', password: 'demo12345' }),
    });
    if (!result.success) {
      Alert.alert('Demo login failed', 'Run npm run seed on the API first.');
      return;
    }
    await saveTokens(result.data.accessToken, result.data.refreshToken);
    dispatch(
      setSession({
        user: result.data.user,
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      }),
    );
    const hhResult = await apiFetch<{ households: Array<{ id: string }> }>('/households', {
      token: result.data.accessToken,
    });
    if (hhResult.success && hhResult.data.households[0]) {
      dispatch(setHouseholdId(hhResult.data.households[0].id));
      await saveHouseholdId(hhResult.data.households[0].id);
    }
    router.replace('/(app)');
  };

  const activeHousehold = households.find((h) => h.id === householdId);

  return (
    <ScrollView className="flex-1 bg-surface px-4 py-6 dark:bg-surface-dark">
      {!online ? (
        <View className="mb-4 rounded-xl bg-citrus px-4 py-2">
          <Text className="font-ui-medium text-ink">
            Offline — settings changes need a connection
          </Text>
        </View>
      ) : null}
      <Text className="font-display text-3xl text-ink dark:text-ink-on-dark">Settings</Text>
      <Text className="mt-2 font-ui text-ink-muted dark:text-ink-muted-dark">
        {user?.name} · {user?.email}
      </Text>
      <Text className="mt-1 font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
        Active household: {activeHousehold?.name || householdId || 'none — join or create below'}
      </Text>

      <View className="mt-6 gap-3 rounded-2xl border border-border bg-white p-4 dark:border-border-dark dark:bg-surface-dark-elevated">
        <Text className="font-ui-bold text-lg text-ink dark:text-ink-on-dark">Your households</Text>
        {households.length === 0 ? (
          <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
            No households yet — create or join below.
          </Text>
        ) : (
          households.map((hh) => {
            const isActive = hh.id === householdId;
            return (
              <View
                key={hh.id}
                className={`gap-2 rounded-xl border-2 px-3 py-3 ${
                  isActive
                    ? 'border-citrus bg-sage-deep/30 dark:bg-surface-dark'
                    : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
                }`}
              >
                <Text className="font-ui-bold text-base text-ink dark:text-ink-on-dark">
                  {hh.name}
                  {isActive ? ' · Active' : ''}
                </Text>
                <Text
                  className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark"
                  accessibilityLabel={`Invite code ${hh.inviteCode}`}
                >
                  Invite code: {hh.inviteCode}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Button
                    label="Share code"
                    variant="secondary"
                    onPress={() => handleShareInvite(hh.inviteCode, hh.name)}
                    accessibilityLabel={`Share invite code for ${hh.name}`}
                  />
                  <Button
                    label={isActive ? 'Using this household' : 'Use this household'}
                    variant={isActive ? 'secondary' : 'primary'}
                    onPress={() => void handleSwitchHousehold(hh.id)}
                    disabled={isActive}
                    accessibilityLabel={
                      isActive
                        ? `${hh.name} is the active household`
                        : `Use ${hh.name} household`
                    }
                  />
                </View>
              </View>
            );
          })
        )}
        {householdId ? (
          <Button
            label="Leave active household"
            variant="danger"
            onPress={handleLeaveHousehold}
            accessibilityLabel="Leave active household"
          />
        ) : null}
      </View>

      {householdId ? (
        <View className="mt-6 gap-3 rounded-2xl border border-border bg-white p-4 dark:border-border-dark dark:bg-surface-dark-elevated">
          <Text className="font-ui-bold text-lg text-ink dark:text-ink-on-dark">
            Members {activeHousehold ? `· ${activeHousehold.name}` : ''}
          </Text>
          {members.length === 0 ? (
            <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
              No members loaded yet.
            </Text>
          ) : (
            members.map((member) => (
              <View
                key={member.id}
                className="border-b border-border py-2 dark:border-border-dark"
              >
                <Text className="font-ui-medium text-ink dark:text-ink-on-dark">
                  {member.name || 'Member'}
                </Text>
                <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
                  {member.email} · {member.role}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : null}

      {!householdId ? (
        <View className="mt-6 gap-3 rounded-2xl border-2 border-citrus bg-sage-deep/30 px-4 py-4 dark:bg-surface-dark-elevated">
          <Text className="font-display text-2xl text-ink dark:text-ink-on-dark">
            Join a household
          </Text>
          <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
            Enter an invite code from a household member to shop together.
          </Text>
          <TextField
            label="Invite code"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            placeholder="ABCD12"
          />
          <Button label="Join household" onPress={handleJoin} />
        </View>
      ) : null}

      <View className="mt-6 gap-3 rounded-2xl border border-border bg-white p-4 dark:border-border-dark dark:bg-surface-dark-elevated">
        <Text className="font-ui-bold text-lg text-ink dark:text-ink-on-dark">Create or join</Text>
        {householdId ? (
          <>
            <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
              Join another household with a code, or create a new one.
            </Text>
            <TextField
              label="Join with invite code"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />
            <Button label="Join household" onPress={handleJoin} />
          </>
        ) : null}
        <TextField
          label="New household name"
          value={householdName}
          onChangeText={setHouseholdName}
        />
        <Button label="Create household" variant="secondary" onPress={handleCreateHousehold} />
        {createdCode ? (
          <Text className="font-ui-bold text-ink dark:text-ink-on-dark">
            Share invite code: {createdCode}
          </Text>
        ) : null}
      </View>

      <View className="mt-6 gap-3 rounded-2xl border border-border bg-white p-4 dark:border-border-dark dark:bg-surface-dark-elevated">
        <Text className="font-ui-bold text-lg text-ink dark:text-ink-on-dark">
          Nutrition goals
        </Text>
        <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
          Household lifestyle targets for Meals and Insights — optional.
        </Text>
        <TextField
          label="Daily calories (kcal)"
          value={calorieGoal}
          onChangeText={setCalorieGoal}
          keyboardType="number-pad"
          placeholder="e.g. 2000"
        />
        <TextField
          label="Protein (g/day)"
          value={proteinGoal}
          onChangeText={setProteinGoal}
          keyboardType="decimal-pad"
          placeholder="e.g. 120"
        />
        <TextField
          label="Carbs (g/day)"
          value={carbGoal}
          onChangeText={setCarbGoal}
          keyboardType="decimal-pad"
          placeholder="e.g. 250"
        />
        <TextField
          label="Fat (g/day)"
          value={fatGoal}
          onChangeText={setFatGoal}
          keyboardType="decimal-pad"
          placeholder="e.g. 65"
        />
        <Button
          label="Save nutrition goals"
          variant="secondary"
          onPress={handleSaveNutritionGoals}
          disabled={!householdId}
          accessibilityLabel="Save household nutrition goals"
        />
        <LifestyleDisclaimer />
      </View>

      <View className="mt-6 gap-3 rounded-2xl border border-border bg-white p-4 dark:border-border-dark dark:bg-surface-dark-elevated">
        <Text className="font-ui-bold text-lg text-ink dark:text-ink-on-dark">
          Monthly budget goal
        </Text>
        <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
          Insights compares this against prices recorded this month.
        </Text>
        <TextField
          label="Goal (USD)"
          value={budgetGoal}
          onChangeText={setBudgetGoal}
          keyboardType="decimal-pad"
          placeholder="e.g. 500"
        />
        <Button
          label="Save budget goal"
          variant="secondary"
          onPress={handleSaveBudget}
          disabled={!householdId}
          accessibilityLabel="Save monthly budget goal"
        />
      </View>

      <View className="mt-6 gap-3 rounded-2xl border border-border bg-white p-4 dark:border-border-dark dark:bg-surface-dark-elevated">
        <Text className="font-ui-bold text-lg text-ink dark:text-ink-on-dark">
          Dietary preferences
        </Text>
        <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
          Filters recipe suggestions. Never auto-changes your lists.
        </Text>
        {PREF_OPTIONS.map((opt) => {
          const on = dietaryPrefs.includes(opt.id);
          return (
            <Pressable
              key={opt.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={opt.label}
              onPress={() => handleTogglePref(opt.id)}
              className="flex-row items-center gap-2 py-2"
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded border ${
                  on ? 'border-citrus bg-citrus' : 'border-border dark:border-border-dark'
                }`}
              >
                {on ? <Text className="font-ui-bold text-xs text-ink">✓</Text> : null}
              </View>
              <Text className="font-ui text-ink dark:text-ink-on-dark">{opt.label}</Text>
            </Pressable>
          );
        })}
        <Text className="mt-2 font-ui-bold text-ink dark:text-ink-on-dark">Notifications</Text>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: notifyExpiring }}
          accessibilityLabel="Notify when pantry items are expiring"
          onPress={() => setNotifyExpiring((v) => !v)}
          className="flex-row items-center gap-2 py-2"
        >
          <View
            className={`h-5 w-5 items-center justify-center rounded border ${
              notifyExpiring ? 'border-citrus bg-citrus' : 'border-border dark:border-border-dark'
            }`}
          >
            {notifyExpiring ? <Text className="font-ui-bold text-xs text-ink">✓</Text> : null}
          </View>
          <Text className="font-ui text-ink dark:text-ink-on-dark">Expiring pantry nudges</Text>
        </Pressable>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: notifyTripReminder }}
          accessibilityLabel="Trip list reminder preference"
          onPress={() => setNotifyTripReminder((v) => !v)}
          className="flex-row items-center gap-2 py-2"
        >
          <View
            className={`h-5 w-5 items-center justify-center rounded border ${
              notifyTripReminder
                ? 'border-citrus bg-citrus'
                : 'border-border dark:border-border-dark'
            }`}
          >
            {notifyTripReminder ? <Text className="font-ui-bold text-xs text-ink">✓</Text> : null}
          </View>
          <Text className="font-ui text-ink dark:text-ink-on-dark">Trip / list reminder</Text>
        </Pressable>
        <Button label="Enable push notifications" variant="secondary" onPress={handleEnablePush} />
        <Button label="Save preferences" onPress={handleSavePrefs} />
      </View>

      <View className="mt-6 gap-3 rounded-2xl border border-border bg-white p-4 dark:border-border-dark dark:bg-surface-dark-elevated">
        <Text className="font-ui-bold text-lg text-ink dark:text-ink-on-dark">Password</Text>
        <TextField
          label="Current password"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <TextField
          label="New password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <Button label="Change password" variant="secondary" onPress={handlePassword} />
      </View>

      <View className="mt-6 gap-3 rounded-2xl border border-border bg-white p-4 dark:border-border-dark dark:bg-surface-dark-elevated">
        <Text className="font-ui-bold text-lg text-ink dark:text-ink-on-dark">Legal</Text>
        <Button
          label="Privacy Policy"
          variant="secondary"
          onPress={() => void handleOpenLegal('/privacy')}
        />
        <Button
          label="Terms of Service"
          variant="secondary"
          onPress={() => void handleOpenLegal('/terms')}
        />
      </View>

      <View className="mt-6 gap-3 pb-10">
        <Button label="Garden" variant="secondary" onPress={() => router.push('/(app)/garden')} />
        <Button label="Catalog" variant="secondary" onPress={() => router.push('/(app)/catalog')} />
        <Button label="Export my data" variant="secondary" onPress={handleExport} />
        <Button label="Sign in as demo" variant="secondary" onPress={handleTryDemoLogin} />
        <Button label="Sign out" variant="danger" onPress={handleLogout} />
        <Button
          label="Delete account"
          variant="danger"
          onPress={handleDeleteAccount}
          accessibilityLabel="Permanently delete account"
        />
      </View>
    </ScrollView>
  );
}
