import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import * as Network from 'expo-network';
import { Button, EmptyState, Sheet } from '../../src/components/ui';
import {
  NutritionStrip,
  type MacroSet,
  type NutritionGoals,
} from '../../src/components/nutrition';
import { apiFetch } from '../../src/lib/api';
import { writeCoach } from '../../src/lib/coach';
import { RootState } from '../../src/store';

type Restock = {
  itemName: string;
  reason: string;
  pantryId?: string;
  urgency: 'expired' | 'soon' | 'low' | 'habit';
  lastPrice?: number;
};

const URGENCY_LABEL: Record<Restock['urgency'], string> = {
  expired: 'Expired',
  soon: 'Soon',
  low: 'Low',
  habit: 'Habit',
};

const startOfWeekMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(12, 0, 0, 0);
  return date;
};

const toDateKey = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(12, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
};

const EMPTY_MACROS: MacroSet = { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 };
const EMPTY_GOALS: NutritionGoals = {
  dailyCalorieGoal: null,
  proteinGoalG: null,
  carbGoalG: null,
  fatGoalG: null,
};

export default function InsightsScreen() {
  const router = useRouter();
  const { accessToken, householdId } = useSelector((s: RootState) => s.auth);
  const [spending, setSpending] = useState<{
    byCategory: Record<string, number>;
    total: number;
    monthTotal?: number;
    monthlyBudgetGoal?: number | null;
  } | null>(null);
  const [restock, setRestock] = useState<Restock[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [pickListOpen, setPickListOpen] = useState(false);
  const [pending, setPending] = useState<Restock | null>(null);
  const [dayNutrition, setDayNutrition] = useState<{
    date: string;
    totals: MacroSet;
    goals: NutritionGoals;
    disclaimer: string;
  } | null>(null);
  const [weekNutrition, setWeekNutrition] = useState<{
    weekTotals: MacroSet;
    goals: NutritionGoals;
    disclaimer: string;
    from: string;
    to: string;
  } | null>(null);
  const [online, setOnline] = useState(true);

  const maxCategory = useMemo(() => {
    if (!spending) return 1;
    const values = Object.values(spending.byCategory);
    return Math.max(1, ...values);
  }, [spending]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        await writeCoach({ visitedInsights: true });
        const net = await Network.getNetworkStateAsync();
        const isOnline = Boolean(net.isConnected);
        setOnline(isOnline);
        if (!accessToken) return;
        if (!isOnline) return;
        const s = await apiFetch<{
          byCategory: Record<string, number>;
          total: number;
          monthTotal?: number;
          monthlyBudgetGoal?: number | null;
        }>(`/insights/spending${householdId ? `?householdId=${householdId}` : ''}`, {
          token: accessToken,
        });
        if (s.success) setSpending(s.data);
        const r = await apiFetch<{ suggestions: Restock[] }>('/insights/restock', {
          token: accessToken,
        });
        if (r.success) setRestock(r.data.suggestions);
        if (householdId) {
          const today = toDateKey(new Date());
          const dayRes = await apiFetch<{
            date: string;
            totals: MacroSet;
            goals: NutritionGoals;
            disclaimer: string;
          }>(`/nutrition/day?householdId=${householdId}&date=${today}`, {
            token: accessToken,
          });
          if (dayRes.success) {
            setDayNutrition({
              date: dayRes.data.date,
              totals: dayRes.data.totals,
              goals: dayRes.data.goals,
              disclaimer: dayRes.data.disclaimer,
            });
          }
          const weekStart = startOfWeekMonday(new Date());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          const from = toDateKey(weekStart);
          const to = toDateKey(weekEnd);
          const nutritionRes = await apiFetch<{
            weekTotals: MacroSet;
            goals: NutritionGoals;
            disclaimer: string;
          }>(`/nutrition/week?householdId=${householdId}&from=${from}&to=${to}`, {
            token: accessToken,
          });
          if (nutritionRes.success) {
            setWeekNutrition({
              weekTotals: nutritionRes.data.weekTotals,
              goals: nutritionRes.data.goals,
              disclaimer: nutritionRes.data.disclaimer,
              from,
              to,
            });
          }
          const listRes = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
            `/lists?householdId=${householdId}`,
            { token: accessToken },
          );
          if (listRes.success) setLists(listRes.data.lists);
        }
      };
      load();
    }, [accessToken, householdId]),
  );

  const handleAddPress = (item: Restock) => {
    if (!online) {
      Alert.alert('Offline', 'Connect to add restock items to a list.');
      return;
    }
    if (lists.length === 0) {
      Alert.alert('Create a shopping list first');
      return;
    }
    setPending(item);
    setPickListOpen(true);
  };

  const handleConfirmAdd = async (listId: string) => {
    if (!accessToken || !pending) return;
    if (pending.pantryId) {
      await apiFetch(`/pantry/${pending.pantryId}/add-to-list`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ listId }),
      });
    } else {
      await apiFetch(`/lists/${listId}/items`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ name: pending.itemName, quantity: 1 }),
      });
    }
    const listName = lists.find((l) => l.id === listId)?.name || 'list';
    setPickListOpen(false);
    setPending(null);
    Alert.alert('Added', `${pending.itemName} → ${listName}`);
  };

  return (
    <ScrollView className="flex-1 bg-surface dark:bg-ink px-4 py-4">
      <Text className="font-display text-2xl text-ink dark:text-sage">Insights</Text>
      <Text className="mb-4 font-ui text-ink-muted dark:text-sage/80">
        Calm totals. Restock suggestions never auto-add.
      </Text>

      {!online ? (
        <View className="mb-3 rounded-xl bg-sage-deep/30 px-3 py-2 dark:bg-surface-dark-elevated">
          <Text className="font-ui text-sm text-ink dark:text-ink-on-dark">
            Offline — Insights need a connection. Showing last loaded data if any.
          </Text>
        </View>
      ) : null}

      {householdId && dayNutrition ? (
        <View className="mb-4">
          <NutritionStrip
            title={`Health · ${dayNutrition.date}`}
            totals={dayNutrition.totals}
            goals={dayNutrition.goals}
            goalMultiplier={1}
            disclaimer={dayNutrition.disclaimer}
            compact
          />
        </View>
      ) : householdId ? (
        <View className="mb-4">
          <NutritionStrip
            title="Health today"
            totals={EMPTY_MACROS}
            goals={EMPTY_GOALS}
            goalMultiplier={1}
          />
        </View>
      ) : null}

      {householdId && weekNutrition ? (
        <View className="mb-6">
          <NutritionStrip
            title={`Health · ${weekNutrition.from} – ${weekNutrition.to}`}
            totals={weekNutrition.weekTotals}
            goals={weekNutrition.goals}
            goalMultiplier={7}
            disclaimer={weekNutrition.disclaimer}
            compact
          />
        </View>
      ) : householdId ? (
        <View className="mb-6">
          <NutritionStrip
            title="Health this week"
            totals={EMPTY_MACROS}
            goals={EMPTY_GOALS}
            goalMultiplier={7}
          />
        </View>
      ) : null}

      {!spending || spending.total === 0 ? (
        <EmptyState
          title="No spending data"
          description="Record prices first to unlock category totals."
          actionLabel="Go to Prices"
          onAction={() => router.push('/(app)/prices')}
        />
      ) : (
        <View className="gap-3">
          <Text className="font-ui-bold text-ink dark:text-sage">
            Total ${spending.total.toFixed(2)}
          </Text>
          {typeof spending.monthlyBudgetGoal === 'number' && spending.monthlyBudgetGoal > 0 ? (
            <View className="gap-1" accessibilityLabel="Monthly budget progress">
              <View className="flex-row justify-between">
                <Text className="font-ui text-ink dark:text-sage">This month</Text>
                <Text className="font-ui text-ink-muted dark:text-sage/70">
                  ${(spending.monthTotal ?? 0).toFixed(2)} / ${spending.monthlyBudgetGoal.toFixed(2)}
                </Text>
              </View>
              <View className="h-3 w-full overflow-hidden rounded-full bg-sage">
                <View
                  className="h-3 rounded-full bg-citrus"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(((spending.monthTotal ?? 0) / spending.monthlyBudgetGoal) * 100),
                    )}%`,
                  }}
                />
              </View>
              <Text className="font-ui text-sm text-ink-muted dark:text-sage/70">
                {Math.round(((spending.monthTotal ?? 0) / spending.monthlyBudgetGoal) * 100)}% of
                monthly budget goal
              </Text>
            </View>
          ) : (
            <Text className="font-ui text-sm text-ink-muted dark:text-sage/70">
              Set a monthly budget goal in Settings to track progress here.
            </Text>
          )}
          {Object.entries(spending.byCategory).map(([cat, amount]) => {
            const pct = Math.max(8, Math.round((amount / maxCategory) * 100));
            return (
              <View key={cat} className="gap-1">
                <View className="flex-row justify-between">
                  <Text className="font-ui text-ink dark:text-sage">{cat}</Text>
                  <Text className="font-ui text-ink-muted dark:text-sage/70">
                    ${amount.toFixed(2)}
                  </Text>
                </View>
                <View className="h-3 w-full overflow-hidden rounded-full bg-sage">
                  <View className="h-3 rounded-full bg-citrus" style={{ width: `${pct}%` }} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Text className="mb-2 mt-6 font-ui-bold text-lg text-ink dark:text-sage">Restock (opt-in)</Text>
      {restock.length === 0 ? (
        <Text className="font-ui text-ink-muted dark:text-sage/80">
          No restock suggestions right now.
        </Text>
      ) : (
        restock.map((s) => (
          <View
            key={`${s.itemName}-${s.urgency}`}
            className="flex-row items-center justify-between border-b border-border py-3"
          >
            <View className="flex-1 pr-3">
              <Text className="font-ui-medium text-base text-ink dark:text-sage">{s.itemName}</Text>
              <Text className="font-ui text-sm text-ink-muted dark:text-sage/70">
                {URGENCY_LABEL[s.urgency]} · {s.reason}
                {s.lastPrice != null ? ` · $${s.lastPrice.toFixed(2)}` : ''}
              </Text>
            </View>
            <Button label="Add" variant="secondary" onPress={() => handleAddPress(s)} />
          </View>
        ))
      )}

      <Sheet
        visible={pickListOpen}
        title="Add to which list?"
        onClose={() => {
          setPickListOpen(false);
          setPending(null);
        }}
      >
        {lists.map((list) => (
          <Button
            key={list.id}
            label={list.name}
            variant="secondary"
            onPress={() => handleConfirmAdd(list.id)}
          />
        ))}
      </Sheet>
    </ScrollView>
  );
}
