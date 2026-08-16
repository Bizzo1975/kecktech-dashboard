/**
 * Quiet dietary filters + humble seed nutrition for common staples.
 * Values are approximate kitchen averages (kcal per typical unit / 100g) for lifestyle tracking — not medical advice.
 */
export type MacroSet = {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};

export const DIETARY_BLOCKLISTS: Record<string, string[]> = {
  vegetarian: ['chicken', 'beef', 'pork', 'salmon', 'shrimp', 'turkey', 'bacon', 'ham', 'lamb', 'meat'],
  vegan: [
    'chicken',
    'beef',
    'pork',
    'salmon',
    'shrimp',
    'turkey',
    'bacon',
    'ham',
    'lamb',
    'meat',
    'milk',
    'cheese',
    'butter',
    'yogurt',
    'cream',
    'egg',
    'honey',
    'whey',
  ],
  gluten_free: ['wheat', 'flour', 'bread', 'pasta', 'noodle', 'barley', 'rye', 'couscous', 'cracker'],
  dairy_free: ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'whey', 'lactose'],
};

export const conflictsWithDietary = (text: string, prefs: string[]): boolean => {
  const hay = text.toLowerCase();
  for (const pref of prefs.map((p) => p.toLowerCase())) {
    const keys = DIETARY_BLOCKLISTS[pref];
    if (!keys) continue;
    if (keys.some((kw) => hay.includes(kw))) return true;
  }
  return false;
};

/** Seeded profiles — per 100g unless noted in comment */
export const USDA_SEED_PROFILES: Array<{
  name: string;
  canonicalName: string;
  kcalPer100g: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG?: number;
}> = [
  { name: 'Whole milk', canonicalName: 'whole milk', kcalPer100g: 61, proteinG: 3.2, carbG: 4.8, fatG: 3.3 },
  { name: 'Eggs', canonicalName: 'egg', kcalPer100g: 143, proteinG: 12.6, carbG: 0.7, fatG: 9.5 },
  { name: 'Banana', canonicalName: 'banana', kcalPer100g: 89, proteinG: 1.1, carbG: 23, fatG: 0.3, fiberG: 2.6 },
  { name: 'Chicken breast', canonicalName: 'chicken breast', kcalPer100g: 165, proteinG: 31, carbG: 0, fatG: 3.6 },
  { name: 'Olive oil', canonicalName: 'olive oil', kcalPer100g: 884, proteinG: 0, carbG: 0, fatG: 100 },
  { name: 'White rice cooked', canonicalName: 'rice', kcalPer100g: 130, proteinG: 2.7, carbG: 28, fatG: 0.3 },
  { name: 'Pasta cooked', canonicalName: 'pasta', kcalPer100g: 131, proteinG: 5, carbG: 25, fatG: 1.1 },
  { name: 'Spinach raw', canonicalName: 'spinach', kcalPer100g: 23, proteinG: 2.9, carbG: 3.6, fatG: 0.4, fiberG: 2.2 },
  { name: 'Greek yogurt', canonicalName: 'greek yogurt', kcalPer100g: 97, proteinG: 9, carbG: 3.6, fatG: 5 },
  { name: 'Bread sourdough', canonicalName: 'sourdough', kcalPer100g: 289, proteinG: 11, carbG: 56, fatG: 2 },
  { name: 'Garlic', canonicalName: 'garlic', kcalPer100g: 149, proteinG: 6.4, carbG: 33, fatG: 0.5 },
  { name: 'Bell pepper', canonicalName: 'bell pepper', kcalPer100g: 31, proteinG: 1, carbG: 6, fatG: 0.3 },
  { name: 'Ground beef 85%', canonicalName: 'ground beef', kcalPer100g: 250, proteinG: 17, carbG: 0, fatG: 20 },
  { name: 'Parmesan', canonicalName: 'parmesan', kcalPer100g: 431, proteinG: 38, carbG: 4.1, fatG: 29 },
  { name: 'Tomato crushed', canonicalName: 'tomato', kcalPer100g: 32, proteinG: 1.6, carbG: 7, fatG: 0.3 },
  { name: 'Basil fresh', canonicalName: 'basil', kcalPer100g: 23, proteinG: 3.2, carbG: 2.7, fatG: 0.6 },
  { name: 'Sparkling water', canonicalName: 'sparkling water', kcalPer100g: 0, proteinG: 0, carbG: 0, fatG: 0 },
];

export const estimateGrams = (quantity: number | null | undefined, unit: string | null | undefined): number => {
  const qty = quantity && quantity > 0 ? quantity : 1;
  const u = (unit || '').toLowerCase().trim();
  if (!u || u === 'g' || u === 'gram' || u === 'grams') return qty;
  if (u === 'kg') return qty * 1000;
  if (u === 'oz') return qty * 28.35;
  if (u === 'lb' || u === 'lbs') return qty * 453.6;
  if (u === 'ml') return qty;
  if (u === 'l' || u === 'liter' || u === 'litre') return qty * 1000;
  if (u === 'cup' || u === 'cups') return qty * 240;
  if (u === 'tbsp') return qty * 15;
  if (u === 'tsp') return qty * 5;
  if (u === 'clove' || u === 'cloves' || u === 'head' || u === 'heads') return qty * 5;
  // countable items → assume ~100g average serving weight
  return qty * 100;
};

export const macrosFromPer100g = (
  per100: { kcalPer100g: number; proteinG: number; carbG: number; fatG: number },
  grams: number,
): MacroSet => {
  const f = grams / 100;
  return {
    kcal: Math.round(per100.kcalPer100g * f),
    proteinG: Math.round(per100.proteinG * f * 10) / 10,
    carbG: Math.round(per100.carbG * f * 10) / 10,
    fatG: Math.round(per100.fatG * f * 10) / 10,
  };
};

export const emptyMacros = (): MacroSet => ({ kcal: 0, proteinG: 0, carbG: 0, fatG: 0 });

export const addMacros = (a: MacroSet, b: MacroSet): MacroSet => ({
  kcal: a.kcal + b.kcal,
  proteinG: Math.round((a.proteinG + b.proteinG) * 10) / 10,
  carbG: Math.round((a.carbG + b.carbG) * 10) / 10,
  fatG: Math.round((a.fatG + b.fatG) * 10) / 10,
});

export const scaleMacros = (m: MacroSet, factor: number): MacroSet => ({
  kcal: Math.round(m.kcal * factor),
  proteinG: Math.round(m.proteinG * factor * 10) / 10,
  carbG: Math.round(m.carbG * factor * 10) / 10,
  fatG: Math.round(m.fatG * factor * 10) / 10,
});
