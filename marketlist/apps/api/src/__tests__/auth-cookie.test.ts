import { refreshSchema } from '@marketlist/shared';

describe('refreshSchema (cookie-friendly body)', () => {
  it('accepts missing refreshToken (cookie-only refresh)', () => {
    const result = refreshSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.refreshToken).toBeUndefined();
    }
  });

  it('accepts omitted body fields with undefined', () => {
    const result = refreshSchema.safeParse({ refreshToken: undefined });
    expect(result.success).toBe(true);
  });

  it('accepts a provided refreshToken', () => {
    const result = refreshSchema.safeParse({ refreshToken: 'opaque-token-value' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.refreshToken).toBe('opaque-token-value');
    }
  });

  it('treats empty-string refreshToken as omitted', () => {
    const result = refreshSchema.safeParse({ refreshToken: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.refreshToken).toBeUndefined();
    }
  });
});
