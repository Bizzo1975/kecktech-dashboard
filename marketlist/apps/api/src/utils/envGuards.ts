export const DEFAULT_ACCESS_SECRET = 'dev-access-secret-change-me';
export const DEFAULT_REFRESH_SECRET = 'dev-refresh-secret-change-me';

export type JwtSecretInput = {
  nodeEnv: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  hasJwtSecretEnv: boolean;
  hasJwtRefreshSecretEnv: boolean;
};

/** Throws when production boots with missing or default JWT secrets. */
export const assertProductionJwtSecrets = (input: JwtSecretInput): void => {
  if (input.nodeEnv !== 'production') return;

  if (!input.hasJwtSecretEnv || input.jwtSecret === DEFAULT_ACCESS_SECRET) {
    throw new Error('FATAL: JWT_SECRET must be set to a non-default value in production');
  }

  if (
    !input.hasJwtRefreshSecretEnv ||
    input.jwtRefreshSecret === DEFAULT_REFRESH_SECRET ||
    input.jwtRefreshSecret === DEFAULT_ACCESS_SECRET
  ) {
    throw new Error('FATAL: JWT_REFRESH_SECRET must be set to a non-default value in production');
  }
};

/** Cookie Secure flag: explicit COOKIE_SECURE=true or production. */
export const resolveCookieSecure = (
  cookieSecureEnv: string | undefined,
  nodeEnv: string,
): boolean => cookieSecureEnv === 'true' || nodeEnv === 'production';
