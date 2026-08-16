import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { RefreshSession, User } from '../models';

export const signAccessToken = (userId: string) =>
  jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: env.accessTtl } as jwt.SignOptions);

export const createRefreshToken = async (userId: string) => {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = await bcrypt.hash(raw, 10);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.refreshTtlDays);
  await RefreshSession.create({ userId, tokenHash, expiresAt });
  return raw;
};

export const rotateRefreshToken = async (raw: string) => {
  const sessions = await RefreshSession.findAll({
    where: {},
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  let matched: RefreshSession | null = null;
  for (const session of sessions) {
    if (await bcrypt.compare(raw, session.tokenHash)) {
      matched = session;
      break;
    }
  }
  if (!matched || matched.expiresAt < new Date()) {
    return null;
  }
  await matched.destroy();
  const user = await User.findByPk(matched.userId);
  if (!user) return null;
  const accessToken = signAccessToken(user.id);
  const refreshToken = await createRefreshToken(user.id);
  return { user, accessToken, refreshToken };
};

export const revokeRefreshToken = async (raw: string) => {
  const sessions = await RefreshSession.findAll();
  for (const session of sessions) {
    if (await bcrypt.compare(raw, session.tokenHash)) {
      await session.destroy();
      return;
    }
  }
};

export const publicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  dietaryPrefs: user.dietaryPrefs,
  notificationPrefs: user.notificationPrefs || {
    notifyExpiring: false,
    notifyTripReminder: false,
  },
});
