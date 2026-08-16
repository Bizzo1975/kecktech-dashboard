import { suggestCategoryAndAisle } from '@marketlist/shared';

const QTY_RE = /^(\d+[\d./]*)\s*(cups?|tbsp|tsp|oz|lbs?|g|kg|ml|l|cloves?|cans?|packages?|pkg)?\s+(.*)$/i;

export const parseIngredientLines = (text: string) => {
  const lines = text
    .split(/\r?\n|•|\u2022/)
    .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
    .filter((l) => l.length > 1 && !/^ingredients$/i.test(l));

  return lines.map((line) => {
    const match = line.match(QTY_RE);
    let name = line;
    let quantity: number | undefined;
    let unit: string | undefined;
    if (match) {
      quantity = Number(match[1]);
      unit = match[2];
      name = match[3] || line;
    }
    const { category, aisleSection } = suggestCategoryAndAisle(name);
    return { name, quantity, unit, category, aisleSection };
  });
};

export const parseRecipePayload = async (input: { url?: string; text?: string }) => {
  if (input.text) {
    return { source: 'text' as const, ingredients: parseIngredientLines(input.text) };
  }
  if (input.url) {
    try {
      const res = await fetch(input.url, {
        headers: { 'User-Agent': 'Marketlist/1.0' },
      });
      const html = await res.text();
      const schemaMatch = html.match(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i,
      );
      if (schemaMatch) {
        const json = JSON.parse(schemaMatch[1]);
        const nodes = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json];
        const recipe = nodes.find(
          (n: { '@type'?: string | string[] }) =>
            n['@type'] === 'Recipe' || (Array.isArray(n['@type']) && n['@type'].includes('Recipe')),
        );
        if (recipe?.recipeIngredient) {
          const text = (recipe.recipeIngredient as string[]).join('\n');
          return { source: 'schema.org' as const, ingredients: parseIngredientLines(text), title: recipe.name };
        }
      }
      const liMatches = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
        .filter(Boolean)
        .slice(0, 40);
      if (liMatches.length) {
        return { source: 'html' as const, ingredients: parseIngredientLines(liMatches.join('\n')) };
      }
    } catch {
      // fall through
    }
    return { source: 'url-failed' as const, ingredients: [] as ReturnType<typeof parseIngredientLines> };
  }
  return { source: 'empty' as const, ingredients: [] as ReturnType<typeof parseIngredientLines> };
};
