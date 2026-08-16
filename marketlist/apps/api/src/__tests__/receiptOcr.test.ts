import { parseReceiptText } from '../services/receiptOcr';

describe('parseReceiptText', () => {
  it('keeps item names and trailing prices when present', () => {
    const raw = `
WHOLE FOODS
Whole Milk 1gal $3.49
Sourdough Bread $4.99
SUBTOTAL 8.48
TAX 0.70
TOTAL 9.18
`;
    expect(parseReceiptText(raw)).toEqual([
      { name: 'Whole Milk 1gal', price: 3.49 },
      { name: 'Sourdough Bread', price: 4.99 },
    ]);
  });

  it('returns null price when no money trail', () => {
    const raw = `Organic Spinach\nBananas`;
    expect(parseReceiptText(raw)).toEqual([
      { name: 'Organic Spinach', price: null },
      { name: 'Bananas', price: null },
    ]);
  });
});
