import React, { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import * as Network from 'expo-network';
import { Button, EmptyState, ListRow, Sheet, TextField } from '../../../src/components/ui';
import {
  formatRecipeMacros,
  LifestyleDisclaimer,
  type MacroSet,
} from '../../../src/components/nutrition';
import { apiFetch } from '../../../src/lib/api';
import { writeCoach } from '../../../src/lib/coach';
import { RootState } from '../../../src/store';
import {
  enqueueOutbox,
  getMirroredRecipes,
  listOutbox,
  mirrorRecipes,
  newOutboxId,
  removeOutbox,
} from '../../../src/lib/offline';

type Ingredient = { name: string; quantity?: number; unit?: string; category?: string };

type Recipe = {
  id: string;
  name: string;
  instructions?: string | null;
  category?: string | null;
  ingredients?: Ingredient[];
};

type Suggestion = {
  id: string;
  name: string;
  matchPercentage: number;
  missingIngredients: string[];
  expiringIngredientNames?: string[];
  gardenIngredientNames?: string[];
  grownMatchCount?: number;
};

const parseIngredientsText = (raw: string): Ingredient[] =>
  raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+(?:\.\d+)?)\s+(\S+)\s+(.+)$/);
      if (match) {
        return { quantity: Number(match[1]), unit: match[2], name: match[3] };
      }
      const qtyOnly = line.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
      if (qtyOnly) {
        return { quantity: Number(qtyOnly[1]), name: qtyOnly[2] };
      }
      return { name: line };
    });

export default function RecipesScreen() {
  const router = useRouter();
  const { accessToken, householdId } = useSelector((s: RootState) => s.auth);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [quietHints, setQuietHints] = useState<string[]>([]);
  const [recipesDisclaimer, setRecipesDisclaimer] = useState<string | null>(null);
  const [expiringSuggestions, setExpiringSuggestions] = useState<Suggestion[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [pendingIngredients, setPendingIngredients] = useState<Ingredient[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editIngredientsText, setEditIngredientsText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [recipeNutrition, setRecipeNutrition] = useState<{
    servings: number;
    perServing: MacroSet;
    disclaimer: string;
  } | null>(null);
  const [logServings, setLogServings] = useState('1');
  const [loggingMeal, setLoggingMeal] = useState(false);
  const [online, setOnline] = useState(true);
  const parseFieldRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    const net = await Network.getNetworkStateAsync();
    const isOnline = Boolean(net.isConnected);
    setOnline(isOnline);

    if (!isOnline) {
      const mirrored = await getMirroredRecipes<Recipe>();
      setRecipes(mirrored);
      return;
    }

    const queue = await listOutbox();
    for (const entry of queue) {
      if (!entry.path.startsWith('/recipes') && !entry.path.startsWith('/meal-plans') && !entry.path.startsWith('/prices') && !entry.path.startsWith('/catalog')) {
        continue;
      }
      if (!entry.path.startsWith('/recipes')) continue;
      await apiFetch(entry.path, {
        method: entry.method,
        token: accessToken,
        body: entry.body ?? undefined,
      });
      await removeOutbox(entry.id);
    }

    const recipeRes = await apiFetch<{ recipes: Recipe[] }>('/recipes', { token: accessToken });
    if (recipeRes.success) {
      setRecipes(recipeRes.data.recipes);
      await mirrorRecipes(recipeRes.data.recipes);
    }

    if (householdId) {
      const suggestRes = await apiFetch<{
        suggestions: Suggestion[];
        quietHints?: string[];
        disclaimer?: string;
      }>(`/recipes/suggestions?householdId=${householdId}`, { token: accessToken });
      if (suggestRes.success) {
        setSuggestions(suggestRes.data.suggestions);
        setQuietHints(suggestRes.data.quietHints || []);
        setRecipesDisclaimer(suggestRes.data.disclaimer || null);
      }

      const expRes = await apiFetch<{ suggestions: Suggestion[] }>(
        `/recipes/suggestions/expiring?householdId=${householdId}`,
        { token: accessToken },
      );
      if (expRes.success) setExpiringSuggestions(expRes.data.suggestions);
      else setExpiringSuggestions([]);

      const listRes = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
        `/lists?householdId=${householdId}`,
        { token: accessToken },
      );
      if (listRes.success) setLists(listRes.data.lists);
    } else {
      setExpiringSuggestions([]);
      setQuietHints([]);
      setRecipesDisclaimer(null);
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
      load();
      return () => netSub.remove();
    }, [load]),
  );

  const matchFor = (recipeId: string) => suggestions.find((s) => s.id === recipeId);

  const handleParse = async () => {
    if (!accessToken) return;
    setLoading(true);
    const result = await apiFetch<{ ingredients: Ingredient[]; title?: string }>('/recipes/parse', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify(url.trim() ? { url: url.trim() } : { text }),
    });
    setLoading(false);
    if (!result.success) {
      Alert.alert('Parse failed', result.error.message);
      return;
    }
    setIngredients(result.data.ingredients);
    await writeCoach({ usedRecipe: true });
  };

  const handleAddToList = (ings: Ingredient[]) => {
    if (ings.length === 0) return;
    if (lists.length === 0) {
      Alert.alert('Create a shopping list first');
      return;
    }
    setPendingIngredients(ings);
    setListPickerOpen(true);
  };

  const confirmAddToList = async (listId: string) => {
    if (!accessToken) return;
    for (const ing of pendingIngredients) {
      await apiFetch(`/lists/${listId}/items`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          name: ing.name,
          quantity: ing.quantity || 1,
          unit: ing.unit,
          category: ing.category,
        }),
      });
    }
    const listName = lists.find((l) => l.id === listId)?.name || 'list';
    setListPickerOpen(false);
    setPendingIngredients([]);
    await writeCoach({ usedRecipe: true });
    Alert.alert('Added', `Ingredients added to ${listName}`);
  };

  const handleAddMissingToList = (recipe: Recipe) => {
    const match = matchFor(recipe.id);
    const missing = match?.missingIngredients || [];
    if (missing.length === 0) {
      Alert.alert(
        'Nothing missing',
        'Pantry already covers this recipe — no ingredients dumped onto your list.',
      );
      return;
    }
    handleAddToList(missing.map((n) => ({ name: n })));
  };

  const offerPlanMealAfterSave = (recipeName: string) => {
    Alert.alert('Saved', `"${recipeName}" is in your library.`, [
      { text: 'Done', style: 'cancel' },
      {
        text: 'Plan on Meals',
        onPress: () => router.push('/(app)/meals'),
      },
    ]);
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    Alert.alert('Delete recipe?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await apiFetch(`/recipes/${id}`, { method: 'DELETE', token: accessToken });
          if (editId === id) {
            setEditOpen(false);
            setEditId(null);
          }
          await load();
        },
      },
    ]);
  };

  const handleOpenEdit = async (id: string) => {
    if (!accessToken) return;
    const result = await apiFetch<{ recipe: Recipe }>(`/recipes/${id}`, { token: accessToken });
    if (!result.success) {
      Alert.alert('Could not load recipe', result.error.message);
      return;
    }
    const recipe = result.data.recipe;
    setEditId(recipe.id);
    setEditName(recipe.name);
    setEditInstructions(recipe.instructions || '');
    setEditIngredientsText(
      (recipe.ingredients || [])
        .map((ing) => {
          const qty = ing.quantity != null ? `${ing.quantity} ` : '';
          const unit = ing.unit ? `${ing.unit} ` : '';
          return `${qty}${unit}${ing.name}`.trim();
        })
        .join('\n'),
    );
    setRecipeNutrition(null);
    setLogServings('1');
    if (householdId && online) {
      const nutritionRes = await apiFetch<{
        servings: number;
        perServing: MacroSet;
        disclaimer: string;
      }>(`/recipes/${id}/nutrition?householdId=${householdId}`, { token: accessToken });
      if (nutritionRes.success) {
        setRecipeNutrition({
          servings: nutritionRes.data.servings,
          perServing: nutritionRes.data.perServing,
          disclaimer: nutritionRes.data.disclaimer,
        });
      }
    }
    setEditOpen(true);
  };

  const handleCookAndLog = async () => {
    if (!accessToken || !householdId || !editId) return;
    const servings = Number(logServings);
    if (!Number.isFinite(servings) || servings <= 0) {
      Alert.alert('Enter valid servings');
      return;
    }
    setLoggingMeal(true);
    const today = new Date().toISOString().slice(0, 10);
    const result = await apiFetch<{
      log: { name: string };
      pantryDeducted: Array<{ name: string }>;
    }>('/meal-logs', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        householdId,
        recipeId: editId,
        name: editName.trim() || undefined,
        consumedAt: today,
        servingsEaten: servings,
        deductPantry: true,
      }),
    });
    setLoggingMeal(false);
    if (!result.success) {
      Alert.alert('Could not log meal', result.error.message);
      return;
    }
    const pantryN = result.data.pantryDeducted?.length ?? 0;
    Alert.alert(
      'Meal logged',
      `${result.data.log.name}${pantryN > 0 ? ` · pantry updated (${pantryN})` : ''}`,
    );
  };

  const handleSaveEdit = async () => {
    if (!accessToken || !editId || !editName.trim()) return;
    setSavingEdit(true);
    const result = await apiFetch<{ recipe: Recipe }>(`/recipes/${editId}`, {
      method: 'PUT',
      token: accessToken,
      body: JSON.stringify({
        name: editName.trim(),
        instructions: editInstructions.trim() || null,
        ingredients: parseIngredientsText(editIngredientsText),
      }),
    });
    setSavingEdit(false);
    if (!result.success) {
      Alert.alert('Save failed', result.error.message);
      return;
    }
    setEditOpen(false);
    setEditId(null);
    await load();
    offerPlanMealAfterSave(editName.trim());
  };

  return (
    <ScrollView className="flex-1 bg-surface px-4 py-4 dark:bg-surface-dark">
      {!online ? (
        <View className="-mx-4 mb-3 bg-citrus px-4 py-2">
          <Text className="font-ui-medium text-ink">
            Offline — showing cached recipes · creates sync when back online
          </Text>
        </View>
      ) : null}
      <Text className="mb-2 font-display text-2xl text-ink dark:text-ink-on-dark">Recipes</Text>
      <Text className="mb-2 font-ui text-ink-muted dark:text-ink-muted-dark">
        Parse a recipe, review ingredients, and see pantry matches.
      </Text>
      {quietHints.length > 0 ? (
        <View className="mb-4 gap-1 rounded-xl bg-sage-deep/30 px-3 py-3 dark:bg-surface-dark-elevated">
          {quietHints.map((hint) => (
            <Text
              key={hint}
              className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark"
            >
              · {hint}
            </Text>
          ))}
        </View>
      ) : null}
      {recipesDisclaimer ? <LifestyleDisclaimer text={recipesDisclaimer} className="mb-4" /> : null}
      <View className="gap-3">
        <TextField label="Recipe URL" value={url} onChangeText={setUrl} autoCapitalize="none" />
        <TextField
          ref={parseFieldRef}
          label="Or paste ingredients"
          value={text}
          onChangeText={setText}
          multiline
          className="min-h-[120px] rounded-xl border border-border bg-white px-3 py-2 font-ui text-base text-ink dark:border-border-dark dark:bg-surface-dark-elevated dark:text-ink-on-dark"
        />
        <Button label="Parse ingredients" onPress={handleParse} loading={loading} />
      </View>

      {ingredients.length > 0 ? (
        <View className="mt-4 gap-2">
          <Text className="font-ui-bold text-lg text-ink dark:text-ink-on-dark">Just parsed</Text>
          {ingredients.map((ing, idx) => (
            <Text
              key={`${ing.name}-${idx}`}
              className="font-ui text-base text-ink dark:text-ink-on-dark"
            >
              • {ing.quantity ? `${ing.quantity} ` : ''}
              {ing.unit ? `${ing.unit} ` : ''}
              {ing.name}
            </Text>
          ))}
          <Button label="Add parsed to list" onPress={() => handleAddToList(ingredients)} />
          <Button
            label="Save as recipe"
            variant="secondary"
            onPress={async () => {
              if (!accessToken || ingredients.length === 0) return;
              const savedName = url.trim() || 'Parsed recipe';
              const body = {
                name: savedName,
                ingredients,
                householdId: householdId || undefined,
              };
              if (!online) {
                const localId = `local-recipe-${Date.now()}`;
                const optimistic: Recipe = {
                  id: localId,
                  name: savedName,
                  ingredients,
                };
                const next = [optimistic, ...recipes];
                setRecipes(next);
                await mirrorRecipes(next);
                await enqueueOutbox({
                  id: newOutboxId(),
                  method: 'POST',
                  path: '/recipes',
                  body,
                });
                setIngredients([]);
                setUrl('');
                setText('');
                Alert.alert('Queued', 'Recipe will sync when you are online');
                return;
              }
              const result = await apiFetch('/recipes', {
                method: 'POST',
                token: accessToken,
                body: JSON.stringify(body),
              });
              if (!result.success) {
                Alert.alert('Save failed', result.error.message);
                return;
              }
              await writeCoach({ usedRecipe: true });
              setIngredients([]);
              setUrl('');
              setText('');
              await load();
              offerPlanMealAfterSave(savedName);
            }}
          />
        </View>
      ) : null}

      {expiringSuggestions.length > 0 ? (
        <View className="mt-6 gap-2">
          <Text className="font-ui-bold text-lg text-ink dark:text-ink-on-dark">Cook soon</Text>
          <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
            Uses pantry items expiring within 5 days.
          </Text>
          {expiringSuggestions.slice(0, 5).map((s) => (
            <Pressable
              key={`exp-${s.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Open ${s.name}`}
              onPress={() => handleOpenEdit(s.id)}
              className="rounded-xl bg-sage-deep/40 px-3 py-3 dark:bg-surface-dark-elevated"
            >
              <Text className="font-ui-medium text-ink dark:text-ink-on-dark">{s.name}</Text>
              <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
                {s.matchPercentage}% match
                {s.gardenIngredientNames?.length
                  ? ` · garden ${s.gardenIngredientNames.slice(0, 3).join(', ')}`
                  : ''}
                {s.expiringIngredientNames?.length
                  ? ` · ${s.expiringIngredientNames.slice(0, 3).join(', ')}`
                  : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text className="mb-2 mt-6 font-ui-bold text-lg text-ink dark:text-ink-on-dark">
        Saved recipes
      </Text>
      {recipes.length === 0 ? (
        <EmptyState
          title="No recipes yet"
          description="Use Parse ingredients above to save your first recipe."
          actionLabel="Paste ingredients"
          onAction={() => parseFieldRef.current?.focus()}
        />
      ) : (
        recipes.map((recipe) => {
          const match = matchFor(recipe.id);
          const missing = match?.missingIngredients || [];
          return (
            <View key={recipe.id} className="mb-2 border-b border-border pb-3">
              <ListRow
                title={recipe.name}
                subtitle={
                  match
                    ? `${match.matchPercentage}% pantry match · ${missing.length} missing`
                    : 'Tap Edit to view ingredients'
                }
                onPress={() => handleOpenEdit(recipe.id)}
              />
              {missing.length > 0 ? (
                <Text className="px-4 font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
                  Missing: {missing.slice(0, 6).join(', ')}
                  {missing.length > 6 ? '…' : ''}
                </Text>
              ) : match ? (
                <Text className="px-4 font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
                  Pantry covers this recipe
                </Text>
              ) : null}
              <View className="mt-2 flex-row flex-wrap gap-2 px-4">
                <Button
                  label="Edit"
                  variant="secondary"
                  onPress={() => handleOpenEdit(recipe.id)}
                />
                <Button
                  label="Add missing to list"
                  variant="secondary"
                  onPress={() => handleAddMissingToList(recipe)}
                />
                <Button label="Delete" variant="ghost" onPress={() => handleDelete(recipe.id)} />
              </View>
            </View>
          );
        })
      )}

      <Sheet
        visible={listPickerOpen}
        title="Add to which list?"
        onClose={() => setListPickerOpen(false)}
      >
        {lists.map((list) => (
          <Button
            key={list.id}
            label={list.name}
            variant="secondary"
            onPress={() => confirmAddToList(list.id)}
          />
        ))}
      </Sheet>

      <Sheet
        visible={editOpen}
        title="Edit recipe"
        onClose={() => {
          setEditOpen(false);
          setEditId(null);
          setRecipeNutrition(null);
        }}
      >
        <TextField label="Name" value={editName} onChangeText={setEditName} />
        {recipeNutrition ? (
          <View className="gap-1 rounded-xl border border-border px-3 py-3 dark:border-border-dark">
            <Text className="font-ui-bold text-sm text-ink dark:text-ink-on-dark">
              Nutrition · {recipeNutrition.servings} serving
              {recipeNutrition.servings === 1 ? '' : 's'}
            </Text>
            <Text className="font-ui text-sm text-ink dark:text-ink-on-dark">
              Per serving: {formatRecipeMacros(recipeNutrition.perServing)}
            </Text>
            <LifestyleDisclaimer text={recipeNutrition.disclaimer} />
          </View>
        ) : householdId ? (
          <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
            Nutrition estimates appear when ingredient profiles are known.
          </Text>
        ) : null}
        <TextField
          label="Instructions"
          value={editInstructions}
          onChangeText={setEditInstructions}
          multiline
          className="min-h-[80px] rounded-xl border border-border bg-white px-3 py-2 font-ui text-base text-ink dark:border-border-dark dark:bg-surface-dark-elevated dark:text-ink-on-dark"
        />
        <TextField
          label="Ingredients (one per line)"
          value={editIngredientsText}
          onChangeText={setEditIngredientsText}
          multiline
          className="min-h-[140px] rounded-xl border border-border bg-white px-3 py-2 font-ui text-base text-ink dark:border-border-dark dark:bg-surface-dark-elevated dark:text-ink-on-dark"
        />
        <Button label="Save changes" onPress={handleSaveEdit} loading={savingEdit} />
        {householdId && editId ? (
          <>
            <TextField
              label="Servings to log"
              value={logServings}
              onChangeText={setLogServings}
              keyboardType="decimal-pad"
            />
            <Button
              label="Cook & log meal"
              variant="secondary"
              onPress={handleCookAndLog}
              loading={loggingMeal}
              accessibilityLabel="Log this recipe as a cooked meal"
            />
            <LifestyleDisclaimer />
          </>
        ) : null}
      </Sheet>
    </ScrollView>
  );
}
