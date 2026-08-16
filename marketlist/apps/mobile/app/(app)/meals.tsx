import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import * as Network from 'expo-network';
import { Button, EmptyState, Sheet, TextField } from '../../src/components/ui';
import {
  LifestyleDisclaimer,
  NutritionStrip,
  type MacroSet,
  type NutritionGoals,
} from '../../src/components/nutrition';
import { apiFetch } from '../../src/lib/api';
import { writeCoach } from '../../src/lib/coach';
import { RootState } from '../../src/store';
import {
  enqueueOutbox,
  getMirroredMeals,
  listOutbox,
  mirrorMeals,
  newOutboxId,
  removeOutbox,
} from '../../src/lib/offline';

type Recipe = { id: string; name: string };

type MealPlan = {
  id: string;
  plannedDate: string;
  mealType: string;
  recipeId?: string | null;
  notes?: string | null;
  Recipe?: Recipe | null;
};

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = (typeof MEAL_TYPES)[number];

const EMPTY_MACROS: MacroSet = { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 };
const EMPTY_GOALS: NutritionGoals = {
  dailyCalorieGoal: null,
  proteinGoalG: null,
  carbGoalG: null,
  fatGoalG: null,
};

const toDateKey = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(12, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
};

const startOfWeekMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(12, 0, 0, 0);
  return date;
};

const weekdayLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });

export default function MealsScreen() {
  const { accessToken, householdId } = useSelector((s: RootState) => s.auth);
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const week = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [weekStart]);

  const [selectedDay, setSelectedDay] = useState(toDateKey(new Date()));
  const [nutritionMode, setNutritionMode] = useState<'day' | 'week'>('day');
  const [dayNutrition, setDayNutrition] = useState<{
    totals: MacroSet;
    goals: NutritionGoals;
    disclaimer: string;
  } | null>(null);
  const [weekNutrition, setWeekNutrition] = useState<{
    weekTotals: MacroSet;
    goals: NutritionGoals;
    disclaimer: string;
  } | null>(null);

  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [mealTypePickerOpen, setMealTypePickerOpen] = useState(false);
  const [missingOnly, setMissingOnly] = useState(true);
  const [online, setOnline] = useState(true);

  const [logTarget, setLogTarget] = useState<MealPlan | null>(null);
  const [logServings, setLogServings] = useState('1');
  const [logging, setLogging] = useState(false);

  const weekFrom = toDateKey(week[0]);
  const weekTo = toDateKey(week[week.length - 1]);

  const loadNutrition = useCallback(async () => {
    if (!accessToken || !householdId || !online) {
      setDayNutrition(null);
      setWeekNutrition(null);
      return;
    }
    const dayRes = await apiFetch<{
      totals: MacroSet;
      goals: NutritionGoals;
      disclaimer: string;
    }>(`/nutrition/day?householdId=${householdId}&date=${selectedDay}`, {
      token: accessToken,
    });
    if (dayRes.success) {
      setDayNutrition({
        totals: dayRes.data.totals,
        goals: dayRes.data.goals,
        disclaimer: dayRes.data.disclaimer,
      });
    }
    const weekRes = await apiFetch<{
      weekTotals: MacroSet;
      goals: NutritionGoals;
      disclaimer: string;
    }>(`/nutrition/week?householdId=${householdId}&from=${weekFrom}&to=${weekTo}`, {
      token: accessToken,
    });
    if (weekRes.success) {
      setWeekNutrition({
        weekTotals: weekRes.data.weekTotals,
        goals: weekRes.data.goals,
        disclaimer: weekRes.data.disclaimer,
      });
    }
  }, [accessToken, householdId, online, selectedDay, weekFrom, weekTo]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    const net = await Network.getNetworkStateAsync();
    const isOnline = Boolean(net.isConnected);
    setOnline(isOnline);

    if (!isOnline) {
      setPlans(await getMirroredMeals<MealPlan>());
      return;
    }

    const queue = await listOutbox();
    for (const entry of queue) {
      if (!entry.path.startsWith('/meal-plans')) continue;
      await apiFetch(entry.path, {
        method: entry.method,
        token: accessToken,
        body: entry.body ?? undefined,
      });
      await removeOutbox(entry.id);
    }

    const result = await apiFetch<{ plans: MealPlan[] }>('/meal-plans', { token: accessToken });
    if (result.success) {
      setPlans(result.data.plans);
      await mirrorMeals(result.data.plans);
    }
    const recipeRes = await apiFetch<{ recipes: Recipe[] }>('/recipes', { token: accessToken });
    if (recipeRes.success) setRecipes(recipeRes.data.recipes);
    if (householdId) {
      const listRes = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
        `/lists?householdId=${householdId}`,
        { token: accessToken },
      );
      if (listRes.success) setLists(listRes.data.lists);
      await loadNutrition();
    }
  }, [accessToken, householdId, loadNutrition]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const net = await Network.getNetworkStateAsync();
        setOnline(Boolean(net.isConnected));
      })();
      const netSub = Network.addNetworkStateListener((state) => {
        setOnline(Boolean(state.isConnected));
      });
      load();
      return () => netSub.remove();
    }, [load]),
  );

  const dayPlans = useMemo(
    () => plans.filter((p) => p.plannedDate.slice(0, 10) === selectedDay),
    [plans, selectedDay],
  );

  const handlePrevWeek = () => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() - 7);
    setWeekStart(next);
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + 7);
    setWeekStart(next);
  };

  const handleAddMeal = async (recipeId: string) => {
    if (!accessToken) return;
    const body = {
      plannedDate: selectedDay,
      mealType,
      recipeId,
      householdId: householdId || undefined,
    };
    if (!online) {
      const recipe = recipes.find((r) => r.id === recipeId);
      const optimistic: MealPlan = {
        id: `local-meal-${Date.now()}`,
        plannedDate: selectedDay,
        mealType,
        recipeId,
        Recipe: recipe || null,
      };
      const next = [...plans, optimistic];
      setPlans(next);
      await mirrorMeals(next);
      await enqueueOutbox({
        id: newOutboxId(),
        method: 'POST',
        path: '/meal-plans',
        body,
      });
      setRecipePickerOpen(false);
      Alert.alert('Queued', 'Meal plan will sync when you are online');
      return;
    }
    const result = await apiFetch('/meal-plans', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify(body),
    });
    if (!result.success) {
      Alert.alert('Could not plan meal', result.error.message);
      return;
    }
    await writeCoach({ plannedMeal: true });
    setRecipePickerOpen(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    await apiFetch(`/meal-plans/${id}`, { method: 'DELETE', token: accessToken });
    await load();
  };

  const handleGenerate = async (listId: string) => {
    if (!accessToken) return;
    const result = await apiFetch<{ items: unknown[] }>('/meal-plans/generate-list', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        listId,
        from: weekFrom,
        to: weekTo,
        missingOnly,
      }),
    });
    setListPickerOpen(false);
    if (!result.success) {
      Alert.alert('Could not generate', result.error.message);
      return;
    }
    await writeCoach({ plannedMeal: true });
    const listName = lists.find((l) => l.id === listId)?.name || 'list';
    const createdCount = result.data.items?.length ?? 0;
    if (createdCount === 0) {
      Alert.alert(
        'Nothing to add',
        missingOnly
          ? `No missing ingredients for this Mon–Sun week — pantry already covers planned meals for ${listName}.`
          : `No ingredients found for this Mon–Sun week to add to ${listName}.`,
      );
      return;
    }
    Alert.alert(
      'List updated',
      missingOnly
        ? `Added ${createdCount} missing ingredient${createdCount === 1 ? '' : 's'} to ${listName}`
        : `Added ${createdCount} ingredient${createdCount === 1 ? '' : 's'} to ${listName}`,
    );
  };

  const handleOpenLog = (plan: MealPlan) => {
    if (!householdId) {
      Alert.alert('Select a household first');
      return;
    }
    if (!plan.recipeId) {
      Alert.alert('No recipe linked', 'This meal has no recipe to log.');
      return;
    }
    setLogTarget(plan);
    setLogServings('1');
  };

  const handleConfirmLog = async () => {
    if (!accessToken || !householdId || !logTarget?.recipeId) return;
    const servings = Number(logServings);
    if (!Number.isFinite(servings) || servings <= 0) {
      Alert.alert('Enter valid servings');
      return;
    }
    setLogging(true);
    const result = await apiFetch<{
      log: { name: string };
      pantryDeducted: Array<{ name: string }>;
      disclaimer: string;
    }>('/meal-logs', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        householdId,
        recipeId: logTarget.recipeId,
        mealPlanId: logTarget.id,
        mealType: logTarget.mealType,
        consumedAt: selectedDay,
        servingsEaten: servings,
        deductPantry: true,
      }),
    });
    setLogging(false);
    if (!result.success) {
      Alert.alert('Could not log meal', result.error.message);
      return;
    }
    const pantryN = result.data.pantryDeducted?.length ?? 0;
    setLogTarget(null);
    await load();
    Alert.alert(
      'Meal logged',
      `${result.data.log.name} · ${Math.round(servings)} serving${servings === 1 ? '' : 's'}${
        pantryN > 0 ? ` · pantry updated (${pantryN} item${pantryN === 1 ? '' : 's'})` : ''
      }`,
    );
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      {!online ? (
        <View className="bg-citrus px-4 py-2">
          <Text className="font-ui-medium text-ink">
            Offline — showing cached meals · creates sync later
          </Text>
        </View>
      ) : null}
      <FlatList
        className="flex-1"
        data={dayPlans}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="gap-3 border-b border-border px-4 py-4 dark:border-border-dark">
            <Text className="font-display text-2xl text-ink dark:text-ink-on-dark">Meals</Text>
            <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
              Plan the week, log what you cook, and track lifestyle nutrition.
            </Text>

            {householdId && online ? (
              <View className="gap-2">
                <View className="flex-row gap-2">
                  <Button
                    label="Day nutrition"
                    variant={nutritionMode === 'day' ? 'primary' : 'secondary'}
                    onPress={() => setNutritionMode('day')}
                    accessibilityLabel="Show nutrition for selected day"
                  />
                  <Button
                    label="Week nutrition"
                    variant={nutritionMode === 'week' ? 'primary' : 'secondary'}
                    onPress={() => setNutritionMode('week')}
                    accessibilityLabel="Show nutrition for this week"
                  />
                </View>
                {nutritionMode === 'day' ? (
                  <NutritionStrip
                    title={`Nutrition · ${selectedDay}`}
                    totals={dayNutrition?.totals ?? EMPTY_MACROS}
                    goals={dayNutrition?.goals ?? EMPTY_GOALS}
                    disclaimer={dayNutrition?.disclaimer}
                  />
                ) : (
                  <NutritionStrip
                    title={`Week total · ${weekFrom} – ${weekTo}`}
                    totals={weekNutrition?.weekTotals ?? EMPTY_MACROS}
                    goals={weekNutrition?.goals ?? EMPTY_GOALS}
                    goalMultiplier={7}
                    disclaimer={weekNutrition?.disclaimer}
                  />
                )}
              </View>
            ) : householdId ? (
              <LifestyleDisclaimer text="Nutrition tracking needs a connection." />
            ) : (
              <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
                Join a household to log meals and track nutrition.
              </Text>
            )}

            <View className="flex-row items-center justify-between">
              <Button label="← Prev" variant="ghost" onPress={handlePrevWeek} accessibilityLabel="Previous week" />
              <Text className="font-ui-medium text-sm text-ink dark:text-ink-on-dark">
                Mon–Sun week
              </Text>
              <Button label="Next →" variant="ghost" onPress={handleNextWeek} accessibilityLabel="Next week" />
            </View>
            <FlatList
              horizontal
              data={week}
              keyExtractor={(d) => toDateKey(d)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => {
                const key = toDateKey(item);
                const selected = key === selectedDay;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={weekdayLabel(item)}
                    onPress={() => setSelectedDay(key)}
                    className={`min-w-[72px] rounded-xl px-3 py-3 ${
                      selected ? 'bg-citrus' : 'bg-sage-deep/40 dark:bg-surface-dark-elevated'
                    }`}
                  >
                    <Text className="text-center font-ui-medium text-sm text-ink dark:text-ink-on-dark">
                      {weekdayLabel(item)}
                    </Text>
                  </Pressable>
                );
              }}
            />
            <View className="flex-row flex-wrap gap-2">
              <Button
                label={`Meal: ${mealType}`}
                variant="secondary"
                onPress={() => setMealTypePickerOpen(true)}
              />
              <Button label="Add meal" onPress={() => setRecipePickerOpen(true)} />
              <Button
                label={missingOnly ? 'Missing only: on' : 'Missing only: off'}
                variant="secondary"
                onPress={() => setMissingOnly((prev) => !prev)}
              />
              <Button
                label="Generate for this week"
                variant="secondary"
                onPress={() => {
                  if (lists.length === 0) {
                    Alert.alert('Create a shopping list first');
                    return;
                  }
                  setListPickerOpen(true);
                }}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Nothing planned"
            description="Choose breakfast, lunch, dinner, or snack, then pick a recipe."
            actionLabel="Add meal"
            onAction={() => setRecipePickerOpen(true)}
          />
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3 dark:border-border-dark">
            <View className="flex-1 pr-3">
              <Text className="font-ui-medium text-base text-ink dark:text-ink-on-dark">
                {item.Recipe?.name || item.notes || 'Meal'}
              </Text>
              <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
                {item.mealType}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-1">
              {item.recipeId ? (
                <Button
                  label="Cook & log"
                  variant="secondary"
                  onPress={() => handleOpenLog(item)}
                  accessibilityLabel={`Log ${item.Recipe?.name || 'meal'}`}
                />
              ) : null}
              <Button label="Delete" variant="ghost" onPress={() => handleDelete(item.id)} />
            </View>
          </View>
        )}
      />

      <Sheet
        visible={mealTypePickerOpen}
        title="Meal type"
        onClose={() => setMealTypePickerOpen(false)}
      >
        {MEAL_TYPES.map((type) => (
          <Button
            key={type}
            label={type}
            variant={type === mealType ? 'primary' : 'secondary'}
            onPress={() => {
              setMealType(type);
              setMealTypePickerOpen(false);
            }}
          />
        ))}
      </Sheet>

      <Sheet
        visible={recipePickerOpen}
        title={`Choose a recipe (${mealType})`}
        onClose={() => setRecipePickerOpen(false)}
      >
        {recipes.length === 0 ? (
          <Text className="font-ui text-ink-muted dark:text-ink-muted-dark">
            Save a recipe first under Recipes.
          </Text>
        ) : (
          recipes.map((r) => (
            <Button key={r.id} label={r.name} variant="secondary" onPress={() => handleAddMeal(r.id)} />
          ))
        )}
      </Sheet>

      <Sheet
        visible={listPickerOpen}
        title="Generate this week into which list?"
        onClose={() => setListPickerOpen(false)}
      >
        {lists.map((list) => (
          <Button
            key={list.id}
            label={list.name}
            variant="secondary"
            onPress={() => handleGenerate(list.id)}
          />
        ))}
      </Sheet>

      <Sheet
        visible={Boolean(logTarget)}
        title="Cook & log meal"
        onClose={() => setLogTarget(null)}
      >
        <Text className="font-ui text-base text-ink dark:text-ink-on-dark">
          {logTarget?.Recipe?.name || 'Meal'}
        </Text>
        <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
          Logs nutrition for {selectedDay} and deducts matched pantry ingredients.
        </Text>
        <TextField
          label="Servings eaten"
          value={logServings}
          onChangeText={setLogServings}
          keyboardType="decimal-pad"
        />
        <Button label="Log meal" onPress={handleConfirmLog} loading={logging} />
        <LifestyleDisclaimer />
      </Sheet>
    </View>
  );
}
