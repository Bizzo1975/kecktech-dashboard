import { DEFAULT_CORS_ORIGINS, parseCorsOrigins } from '../utils/corsOrigins';

describe('parseCorsOrigins', () => {
  it('returns defaults when env is empty', () => {
    expect(parseCorsOrigins(undefined)).toEqual(DEFAULT_CORS_ORIGINS);
    expect(parseCorsOrigins('')).toEqual(DEFAULT_CORS_ORIGINS);
    expect(parseCorsOrigins('   ')).toEqual(DEFAULT_CORS_ORIGINS);
  });

  it('parses comma-separated origins and trims', () => {
    expect(parseCorsOrigins(' https://a.example ,http://localhost:3001 ')).toEqual([
      'https://a.example',
      'http://localhost:3001',
    ]);
  });

  it('ignores empty segments', () => {
    expect(parseCorsOrigins('https://a.example,, ,https://b.example')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });
});
