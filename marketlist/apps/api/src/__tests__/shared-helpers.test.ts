import { normalizeItemName, suggestCategoryAndAisle, aisleSortIndex } from '@marketlist/shared';

describe('shared item helpers', () => {
  it('normalizes item names', () => {
    expect(normalizeItemName('  Whole   Milk ')).toBe('whole milk');
  });

  it('suggests dairy aisle for milk', () => {
    const result = suggestCategoryAndAisle('Whole milk');
    expect(result.aisleSection).toBe('Dairy');
    expect(result.category).toBe('Dairy');
  });

  it('sorts produce before pantry', () => {
    expect(aisleSortIndex('Produce')).toBeLessThan(aisleSortIndex('Pantry'));
  });
});
