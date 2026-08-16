'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  LifestyleDisclaimer,
  PerServingMacros,
  type MacroSet,
} from '../../../components/NutritionUi';
import { apiFetch, readSession } from '../../../lib/api';
import { writeCoach } from '../../../lib/coach';

type Ingredient = { name: string; quantity?: number; unit?: string; category?: string };
type Recipe = {
  id: string;
  name: string;
  servings?: number;
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

export default function RecipesPage() {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [library, setLibrary] = useState<Recipe[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [quietHints, setQuietHints] = useState<string[]>([]);
  const [expiringSuggestions, setExpiringSuggestions] = useState<Suggestion[]>([]);
  const [expiringHints, setExpiringHints] = useState<string[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [listId, setListId] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLib, setLoadingLib] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editIngredientsText, setEditIngredientsText] = useState('');
  const [editServings, setEditServings] = useState('4');
  const [parseServings, setParseServings] = useState('4');
  const [recipeNutrition, setRecipeNutrition] = useState<{
    perServing: MacroSet;
    servings: number;
    disclaimer?: string;
  } | null>(null);
  const [loggingRecipeId, setLoggingRecipeId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const loadLibrary = useCallback(async () => {
    const session = readSession();
    if (!session) return;
    setLoadingLib(true);
    const recipes = await apiFetch<{ recipes: Recipe[] }>('/recipes', { token: session.accessToken });
    if (recipes.success) setLibrary(recipes.data.recipes);
    const qs = session.householdId ? `?householdId=${session.householdId}` : '';
    const sug = await apiFetch<{ suggestions: Suggestion[]; quietHints?: string[] }>(
      `/recipes/suggestions${qs}`,
      { token: session.accessToken },
    );
    if (sug.success) {
      setSuggestions(
        [...sug.data.suggestions].sort((a, b) => b.matchPercentage - a.matchPercentage),
      );
      setQuietHints(sug.data.quietHints || []);
    }
    if (session.householdId) {
      const exp = await apiFetch<{ suggestions: Suggestion[]; quietHints?: string[] }>(
        `/recipes/suggestions/expiring?householdId=${session.householdId}`,
        { token: session.accessToken },
      );
      if (exp.success) {
        setExpiringSuggestions(exp.data.suggestions);
        setExpiringHints(exp.data.quietHints || []);
      } else {
        setExpiringSuggestions([]);
        setExpiringHints([]);
      }

      const listRes = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
        `/lists?householdId=${session.householdId}`,
        { token: session.accessToken },
      );
      if (listRes.success) {
        setLists(listRes.data.lists);
        setListId((prev) => prev || listRes.data.lists[0]?.id || '');
      }
    } else {
      setExpiringSuggestions([]);
    }
    setLoadingLib(false);
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const handleParse = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session) return;
    setLoading(true);
    const result = await apiFetch<{ ingredients: Ingredient[] }>('/recipes/parse', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify(url.trim() ? { url: url.trim() } : { text }),
    });
    setLoading(false);
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    setIngredients(result.data.ingredients);
    writeCoach({ usedRecipe: true });
  };

  const handleSaveParsed = async () => {
    const session = readSession();
    if (!session || ingredients.length === 0) return;
    const name = url.trim() ? `Parsed recipe` : 'Pasted ingredients';
    const result = await apiFetch<{ recipe: Recipe }>('/recipes', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        name,
        householdId: session.householdId || null,
        servings: Number(parseServings) > 0 ? Number(parseServings) : 4,
        ingredients: ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
        })),
      }),
    });
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    showToast('Saved to library');
    writeCoach({ usedRecipe: true });
    setIngredients([]);
    await loadLibrary();
  };

  const addIngredientsToList = async (ings: Ingredient[]) => {
    const session = readSession();
    if (!session || ings.length === 0) return;
    if (!listId) {
      showToast('Select a shopping list first');
      return;
    }
    for (const ing of ings) {
      await apiFetch(`/lists/${listId}/items`, {
        method: 'POST',
        token: session.accessToken,
        body: JSON.stringify({
          name: ing.name,
          quantity: ing.quantity || 1,
          unit: ing.unit,
          category: ing.category,
        }),
      });
    }
    const listName = lists.find((l) => l.id === listId)?.name || 'list';
    writeCoach({ usedRecipe: true });
    showToast(`Added to ${listName}`);
  };

  const handleAddToList = async () => {
    await addIngredientsToList(ingredients);
  };

  const handleAddMissing = async (recipeId: string) => {
    const match = suggestions.find((s) => s.id === recipeId);
    const recipe = library.find((r) => r.id === recipeId);
    const missing = match?.missingIngredients || [];
    const ings =
      missing.length > 0
        ? missing.map((n) => ({ name: n }))
        : (recipe?.ingredients || []).map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
          }));
    await addIngredientsToList(ings);
  };

  const handleDelete = async (id: string) => {
    const session = readSession();
    if (!session) return;
    if (!window.confirm('Delete this recipe?')) return;
    const result = await apiFetch(`/recipes/${id}`, {
      method: 'DELETE',
      token: session.accessToken,
    });
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    if (expandedId === id) setExpandedId(null);
    showToast('Recipe deleted');
    await loadLibrary();
  };

  const handleOpenDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setRecipeNutrition(null);
      return;
    }
    const session = readSession();
    if (!session) return;
    const result = await apiFetch<{ recipe: Recipe }>(`/recipes/${id}`, {
      token: session.accessToken,
    });
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    const recipe = result.data.recipe;
    setEditName(recipe.name);
    setEditInstructions(recipe.instructions || '');
    setEditServings(String(recipe.servings && recipe.servings > 0 ? recipe.servings : 4));
    setEditIngredientsText(
      (recipe.ingredients || [])
        .map((ing) => {
          const qty = ing.quantity != null ? `${ing.quantity} ` : '';
          const unit = ing.unit ? `${ing.unit} ` : '';
          return `${qty}${unit}${ing.name}`.trim();
        })
        .join('\n'),
    );
    setExpandedId(id);
    setRecipeNutrition(null);
    if (session.householdId) {
      const nutRes = await apiFetch<{
        perServing: MacroSet;
        servings: number;
        disclaimer?: string;
      }>(`/recipes/${id}/nutrition?householdId=${session.householdId}`, {
        token: session.accessToken,
      });
      if (nutRes.success) setRecipeNutrition(nutRes.data);
    }
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

  const handleSaveEdit = async (id: string) => {
    const session = readSession();
    if (!session || !editName.trim()) return;
    setSavingEdit(true);
    const servings = Number(editServings);
    const result = await apiFetch<{ recipe: Recipe }>(`/recipes/${id}`, {
      method: 'PUT',
      token: session.accessToken,
      body: JSON.stringify({
        name: editName.trim(),
        instructions: editInstructions.trim() || null,
        servings: Number.isFinite(servings) && servings > 0 ? servings : 4,
        ingredients: parseIngredientsText(editIngredientsText),
      }),
    });
    setSavingEdit(false);
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    showToast('Recipe updated');
    await loadLibrary();
  };

  const matchFor = (recipeId: string) =>
    suggestions.find((s) => s.id === recipeId)?.matchPercentage;

  const missingFor = (recipeId: string) =>
    suggestions.find((s) => s.id === recipeId)?.missingIngredients || [];

  const handleCookLog = async (recipe: Recipe) => {
    const session = readSession();
    if (!session?.householdId) {
      showToast('Select a household first');
      return;
    }
    setLoggingRecipeId(recipe.id);
    const today = new Date().toISOString().slice(0, 10);
    const result = await apiFetch<{ pantryDeducted?: unknown[] }>('/meal-logs', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        householdId: session.householdId,
        recipeId: recipe.id,
        name: recipe.name,
        mealType: 'dinner',
        consumedAt: today,
        servingsEaten: 1,
        deductPantry: true,
      }),
    });
    setLoggingRecipeId(null);
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    const pantryN = result.data.pantryDeducted?.length ?? 0;
    showToast(
      pantryN > 0
        ? `Logged ${recipe.name} · ${pantryN} pantry deduction${pantryN === 1 ? '' : 's'}`
        : `Logged ${recipe.name}`,
    );
    writeCoach({ usedRecipe: true });
  };

  const scrollToParse = () => {
    document.getElementById('recipe-parse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="stack">
      <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Recipes</h1>
      <p className="muted">Library with pantry match %. Parse a URL or paste ingredients to add.</p>

      {quietHints.length > 0 ? (
        <div className="card stack" aria-label="Quiet hints">
          {quietHints.map((hint) => (
            <p key={hint} className="muted" style={{ margin: 0 }}>
              {hint}
            </p>
          ))}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="recipe-list-global">Default shopping list</label>
        <select
          id="recipe-list-global"
          value={listId}
          onChange={(e) => setListId(e.target.value)}
          aria-label="Select shopping list for recipe adds"
        >
          <option value="">Select a list…</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </div>

      {expiringSuggestions.length > 0 ? (
        <section className="card stack" aria-label="Cook soon">
          <strong>Cook soon</strong>
          <p className="muted" style={{ margin: 0 }}>
            Recipes that use pantry items expiring within 5 days.
          </p>
          {expiringHints.map((hint) => (
            <p key={hint} className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              {hint}
            </p>
          ))}
          {expiringSuggestions.slice(0, 5).map((s) => (
            <div key={`exp-${s.id}`} className="list-row">
              <div style={{ flex: 1 }}>
                <strong>{s.name}</strong>
                <div className="muted">
                  {s.matchPercentage}% pantry match
                  {s.expiringIngredientNames?.length
                    ? ` · uses ${s.expiringIngredientNames.slice(0, 3).join(', ')}`
                    : ''}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                aria-label={`Open ${s.name}`}
                onClick={() => handleOpenDetail(s.id)}
              >
                Open
              </button>
            </div>
          ))}
        </section>
      ) : null}

      <section className="stack" aria-label="Recipe library">
        <h2 style={{ margin: 0 }}>Library</h2>
        {loadingLib ? <div className="skeleton" /> : null}
        {!loadingLib && library.length === 0 ? (
          <div className="empty card">
            <h2>No saved recipes</h2>
            <p>Parse a URL or paste ingredients to build your library.</p>
            <button type="button" className="btn btn-primary" onClick={scrollToParse}>
              Parse a recipe
            </button>
          </div>
        ) : null}
        {library.map((recipe) => {
          const pct = matchFor(recipe.id);
          const missing = missingFor(recipe.id);
          const open = expandedId === recipe.id;
          return (
            <div key={recipe.id} className="card stack">
              <div className="list-row" style={{ border: 'none', padding: 0 }}>
                <div style={{ flex: 1 }}>
                  <strong>{recipe.name}</strong>
                  <div className="muted">
                    {(recipe.ingredients || []).length} ingredients
                    {typeof pct === 'number' ? ` · ${pct}% pantry match` : ''}
                  </div>
                </div>
                {typeof pct === 'number' ? (
                  <span className="suggest-chip" aria-label={`${pct} percent match`}>
                    {pct}%
                  </span>
                ) : null}
              </div>
              {missing.length > 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  Missing: {missing.slice(0, 6).join(', ')}
                  {missing.length > 6 ? '…' : ''}
                </p>
              ) : null}
              <div className="row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  aria-label={`${open ? 'Close' : 'Edit'} ${recipe.name}`}
                  onClick={() => handleOpenDetail(recipe.id)}
                >
                  {open ? 'Close' : 'Edit'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  aria-label={`Cook and log ${recipe.name}`}
                  disabled={loggingRecipeId === recipe.id}
                  onClick={() => handleCookLog(recipe)}
                >
                  {loggingRecipeId === recipe.id ? 'Logging…' : 'Cook / log'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  aria-label={`Add missing ingredients for ${recipe.name}`}
                  onClick={() => handleAddMissing(recipe.id)}
                >
                  Add missing to list
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label={`Delete ${recipe.name}`}
                  onClick={() => handleDelete(recipe.id)}
                >
                  Delete
                </button>
              </div>
              {open ? (
                <div className="stack">
                  {recipeNutrition ? (
                    <PerServingMacros
                      perServing={recipeNutrition.perServing}
                      servings={recipeNutrition.servings}
                      disclaimer={recipeNutrition.disclaimer}
                    />
                  ) : (
                    <p className="muted" style={{ margin: 0 }}>
                      No macro estimate yet — link ingredients to known nutrition profiles.
                    </p>
                  )}
                  <div className="field">
                    <label htmlFor={`edit-name-${recipe.id}`}>Name</label>
                    <input
                      id={`edit-name-${recipe.id}`}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`edit-instructions-${recipe.id}`}>Instructions</label>
                    <textarea
                      id={`edit-instructions-${recipe.id}`}
                      rows={3}
                      value={editInstructions}
                      onChange={(e) => setEditInstructions(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`edit-servings-${recipe.id}`}>Servings</label>
                    <input
                      id={`edit-servings-${recipe.id}`}
                      type="number"
                      min="1"
                      step="1"
                      value={editServings}
                      onChange={(e) => setEditServings(e.target.value)}
                      aria-label="Recipe servings"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`edit-ings-${recipe.id}`}>
                      Ingredients (one per line, e.g. &quot;2 cups flour&quot;)
                    </label>
                    <textarea
                      id={`edit-ings-${recipe.id}`}
                      rows={6}
                      value={editIngredientsText}
                      onChange={(e) => setEditIngredientsText(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={savingEdit}
                    onClick={() => handleSaveEdit(recipe.id)}
                  >
                    {savingEdit ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
        {suggestions.length > 0 ? (
          <div className="card stack">
            <strong>Best pantry matches</strong>
            {suggestions.slice(0, 5).map((s) => (
              <div key={s.id} className="muted">
                {s.name} — {s.matchPercentage}%
                {s.gardenIngredientNames?.length
                  ? ` · garden: ${s.gardenIngredientNames.slice(0, 3).join(', ')}`
                  : ''}
                {s.missingIngredients.length
                  ? ` (missing ${s.missingIngredients.slice(0, 3).join(', ')})`
                  : ''}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <form id="recipe-parse" className="card stack" onSubmit={handleParse}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Parse recipe</h2>
        <div className="field">
          <label htmlFor="url">Recipe URL</label>
          <input id="url" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="text">Or paste ingredients</label>
          <textarea id="text" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="parse-servings">Servings when saving</label>
          <input
            id="parse-servings"
            type="number"
            min="1"
            step="1"
            value={parseServings}
            onChange={(e) => setParseServings(e.target.value)}
            aria-label="Servings for parsed recipe"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Parsing…' : 'Parse ingredients'}
        </button>
      </form>

      {ingredients.length > 0 ? (
        <div className="card stack">
          {ingredients.map((ing, idx) => (
            <div key={`${ing.name}-${idx}`}>
              • {ing.quantity ? `${ing.quantity} ` : ''}
              {ing.unit ? `${ing.unit} ` : ''}
              {ing.name}
            </div>
          ))}
          <div className="row">
            <button type="button" className="btn btn-secondary" onClick={handleAddToList}>
              Add to list
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleSaveParsed}>
              Save to library
            </button>
          </div>
        </div>
      ) : null}

      <LifestyleDisclaimer text="Quiet lifestyle suggestions only — not medical or clinical advice." />

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
