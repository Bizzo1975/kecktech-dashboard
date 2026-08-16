import { suggestCategoryAndAisle, aisleSortIndex } from '@marketlist/shared';

describe('aisle helpers', () => {
  it('suggests dairy for milk', () => {
    expect(suggestCategoryAndAisle('Whole milk')).toEqual({
      category: 'Dairy',
      aisleSection: 'Dairy',
    });
  });

  it('orders produce before other', () => {
    expect(aisleSortIndex('Produce')).toBeLessThan(aisleSortIndex('Other'));
  });
});
