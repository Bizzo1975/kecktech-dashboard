import {
  assertProductionJwtSecrets,
  DEFAULT_ACCESS_SECRET,
  DEFAULT_REFRESH_SECRET,
  resolveCookieSecure,
} from '../utils/envGuards';

describe('assertProductionJwtSecrets', () => {
  it('no-ops outside production', () => {
    expect(() =>
      assertProductionJwtSecrets({
        nodeEnv: 'development',
        jwtSecret: DEFAULT_ACCESS_SECRET,
        jwtRefreshSecret: DEFAULT_REFRESH_SECRET,
        hasJwtSecretEnv: false,
        hasJwtRefreshSecretEnv: false,
      }),
    ).not.toThrow();
  });

  it('rejects default access secret in production', () => {
    expect(() =>
      assertProductionJwtSecrets({
        nodeEnv: 'production',
        jwtSecret: DEFAULT_ACCESS_SECRET,
        jwtRefreshSecret: 'real-refresh-secret',
        hasJwtSecretEnv: true,
        hasJwtRefreshSecretEnv: true,
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('rejects missing refresh secret env in production', () => {
    expect(() =>
      assertProductionJwtSecrets({
        nodeEnv: 'production',
        jwtSecret: 'real-access-secret',
        jwtRefreshSecret: 'real-refresh-secret',
        hasJwtSecretEnv: true,
        hasJwtRefreshSecretEnv: false,
      }),
    ).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('allows non-default secrets in production', () => {
    expect(() =>
      assertProductionJwtSecrets({
        nodeEnv: 'production',
        jwtSecret: 'real-access-secret',
        jwtRefreshSecret: 'real-refresh-secret',
        hasJwtSecretEnv: true,
        hasJwtRefreshSecretEnv: true,
      }),
    ).not.toThrow();
  });
});

describe('resolveCookieSecure', () => {
  it('is true when COOKIE_SECURE=true', () => {
    expect(resolveCookieSecure('true', 'development')).toBe(true);
  });

  it('is true in production even without COOKIE_SECURE', () => {
    expect(resolveCookieSecure(undefined, 'production')).toBe(true);
  });

  it('is false in development by default', () => {
    expect(resolveCookieSecure(undefined, 'development')).toBe(false);
    expect(resolveCookieSecure('false', 'development')).toBe(false);
  });
});
