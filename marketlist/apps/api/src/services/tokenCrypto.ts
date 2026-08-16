import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from '../utils/http';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const PREFIX = 'v1:';

const resolveKey = (): Buffer => {
  const raw = env.tokenEncryptionKey;
  if (!raw) {
    if (env.nodeEnv === 'production') {
      throw new AppError(
        'TOKEN_ENCRYPTION_KEY is required in production',
        500,
        'CONFIG_ERROR',
      );
    }
    // Dev-only deterministic key derived from JWT secret (never for prod).
    return crypto.createHash('sha256').update(`dev-garden:${env.jwtSecret}`).digest();
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return crypto.createHash('sha256').update(raw).digest();
};

/** Encrypt a secret string for DB storage. Returns prefixed ciphertext. */
export const encryptSecret = (plaintext: string): string => {
  const key = resolveKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
};

/** Decrypt a value produced by encryptSecret. Pass-through if not prefixed (legacy cleartext). */
export const decryptSecret = (stored: string): string => {
  if (!stored.startsWith(PREFIX)) {
    return stored;
  }
  const key = resolveKey();
  const body = stored.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = body.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new AppError('Corrupt encrypted secret', 500, 'CRYPTO_ERROR');
  }
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(dataB64, 'base64url');
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new AppError('Corrupt encrypted secret', 500, 'CRYPTO_ERROR');
  }
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};

export const isEncryptedSecret = (stored: string): boolean => stored.startsWith(PREFIX);
