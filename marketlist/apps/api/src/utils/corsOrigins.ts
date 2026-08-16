export const DEFAULT_CORS_ORIGINS = [
  'https://marketlist.kecktech.net',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

/** Parse comma-separated CORS_ORIGINS; fall back to defaults when empty. */
export const parseCorsOrigins = (
  raw: string | undefined,
  defaults: string[] = DEFAULT_CORS_ORIGINS,
): string[] => {
  const parsed = (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parsed.length ? parsed : [...defaults];
};
