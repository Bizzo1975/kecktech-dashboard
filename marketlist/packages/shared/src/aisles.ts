export const AISLE_SECTIONS = [
  'Produce',
  'Bakery',
  'Dairy',
  'Meat & Seafood',
  'Deli',
  'Frozen',
  'Pantry',
  'Snacks',
  'Beverages',
  'Household',
  'Personal Care',
  'Other',
] as const;

export type AisleSection = (typeof AISLE_SECTIONS)[number];

const KEYWORD_MAP: Array<{ keywords: string[]; category: string; aisle: AisleSection }> = [
  { keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg'], category: 'Dairy', aisle: 'Dairy' },
  { keywords: ['apple', 'banana', 'lettuce', 'tomato', 'onion', 'potato', 'spinach', 'berry'], category: 'Produce', aisle: 'Produce' },
  { keywords: ['bread', 'bagel', 'tortilla', 'bun'], category: 'Bakery', aisle: 'Bakery' },
  { keywords: ['chicken', 'beef', 'pork', 'salmon', 'shrimp', 'turkey'], category: 'Meat', aisle: 'Meat & Seafood' },
  { keywords: ['frozen', 'ice cream', 'pizza'], category: 'Frozen', aisle: 'Frozen' },
  { keywords: ['rice', 'pasta', 'flour', 'sugar', 'oil', 'sauce', 'bean', 'cereal'], category: 'Pantry', aisle: 'Pantry' },
  { keywords: ['chip', 'cookie', 'cracker', 'popcorn'], category: 'Snacks', aisle: 'Snacks' },
  { keywords: ['water', 'soda', 'juice', 'coffee', 'tea', 'beer', 'wine'], category: 'Beverages', aisle: 'Beverages' },
  { keywords: ['soap', 'detergent', 'paper towel', 'trash'], category: 'Household', aisle: 'Household' },
  { keywords: ['shampoo', 'toothpaste', 'deodorant'], category: 'Personal Care', aisle: 'Personal Care' },
];

export const suggestCategoryAndAisle = (
  name: string,
): { category: string; aisleSection: AisleSection } => {
  const lower = name.toLowerCase();
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      return { category: entry.category, aisleSection: entry.aisle };
    }
  }
  return { category: 'Other', aisleSection: 'Other' };
};

export const aisleSortIndex = (section: string): number => {
  const idx = AISLE_SECTIONS.indexOf(section as AisleSection);
  return idx === -1 ? AISLE_SECTIONS.length : idx;
};
