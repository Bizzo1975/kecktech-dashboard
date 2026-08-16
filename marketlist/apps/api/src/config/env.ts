import path from 'path';
import dotenv from 'dotenv';
import { parseCorsOrigins } from '../utils/corsOrigins';
import {
  assertProductionJwtSecrets,
  DEFAULT_ACCESS_SECRET,
  DEFAULT_REFRESH_SECRET,
  resolveCookieSecure,
} from '../utils/envGuards';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || DEFAULT_ACCESS_SECRET;
const jwtRefreshSecret =
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || DEFAULT_REFRESH_SECRET;

assertProductionJwtSecrets({
  nodeEnv,
  jwtSecret,
  jwtRefreshSecret,
  hasJwtSecretEnv: Boolean(process.env.JWT_SECRET),
  hasJwtRefreshSecretEnv: Boolean(process.env.JWT_REFRESH_SECRET),
});

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 3000),
  db: {
    name: process.env.DB_NAME || 'grocery_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
  },
  jwtSecret,
  jwtRefreshSecret,
  accessTtl: process.env.JWT_EXPIRES_IN || '15m',
  refreshTtlDays: Number(process.env.JWT_REFRESH_DAYS || 7),
  sentryDsn: process.env.SENTRY_DSN || '',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  cookieSecure: resolveCookieSecure(process.env.COOKIE_SECURE, nodeEnv),
  appPublicUrl: (process.env.APP_PUBLIC_URL || 'http://localhost:3001').replace(/\/$/, ''),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  },
  /** 64-char hex or any passphrase — used to encrypt FarmBot tokens at rest. Required in production. */
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || '',
};

export const REFRESH_COOKIE = 'ml_refresh';
