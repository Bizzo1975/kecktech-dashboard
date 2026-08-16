import { Response } from 'express';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  pushTokenSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  updatePreferencesSchema,
} from '@marketlist/shared';
import {
  HouseholdMember,
  MealPlan,
  NotificationPrefs,
  PasswordResetToken,
  Recipe,
  RecipeIngredient,
  RefreshSession,
  User,
} from '../models';
import { AuthRequest } from '../middleware/auth';
import { AppError, sendSuccess } from '../utils/http';
import {
  createRefreshToken,
  publicUser,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from '../services/authTokens';
import { generateResetToken, hashResetToken, sendPasswordResetEmail } from '../services/mail';
import { validateBody } from '../middleware/error';
import { env, REFRESH_COOKIE } from '../config/env';
import { leaveHouseholdInternal } from './household.controller';

export const registerValidators = [validateBody(registerSchema)];
export const loginValidators = [validateBody(loginSchema)];
export const refreshValidators = [validateBody(refreshSchema)];
export const passwordValidators = [validateBody(changePasswordSchema)];
export const preferencesValidators = [validateBody(updatePreferencesSchema)];
export const pushTokenValidators = [validateBody(pushTokenSchema)];
export const forgotPasswordValidators = [validateBody(forgotPasswordSchema)];
export const resetPasswordValidators = [validateBody(resetPasswordSchema)];

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/api',
    maxAge: env.refreshTtlDays * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/api',
  });
};

const readRefreshToken = (req: AuthRequest): string | undefined => {
  const fromBody = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;
  if (fromBody?.trim()) return fromBody.trim();
  const fromCookie = req.cookies?.[REFRESH_COOKIE];
  return typeof fromCookie === 'string' && fromCookie.trim() ? fromCookie.trim() : undefined;
};

export const register = async (req: AuthRequest, res: Response) => {
  const { email, password, name } = req.body;
  const existing = await User.findOne({ where: { email } });
  if (existing) throw new AppError('User already exists', 400, 'VALIDATION_ERROR');
  const user = await User.create({ email, password, name });
  const accessToken = signAccessToken(user.id);
  const refreshToken = await createRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);
  return sendSuccess(res, { user: publicUser(user), accessToken, refreshToken }, 201);
};

export const login = async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user || !(await user.validatePassword(password))) {
    throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
  }
  const accessToken = signAccessToken(user.id);
  const refreshToken = await createRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);
  return sendSuccess(res, { user: publicUser(user), accessToken, refreshToken });
};

export const refresh = async (req: AuthRequest, res: Response) => {
  const raw = readRefreshToken(req);
  if (!raw) throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');
  const result = await rotateRefreshToken(raw);
  if (!result) throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');
  setRefreshCookie(res, result.refreshToken);
  return sendSuccess(res, {
    user: publicUser(result.user),
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
};

export const logout = async (req: AuthRequest, res: Response) => {
  const raw = readRefreshToken(req);
  if (raw) await revokeRefreshToken(raw);
  clearRefreshCookie(res);
  return sendSuccess(res, { message: 'Logged out' });
};

export const me = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  return sendSuccess(res, { user: publicUser(req.user) });
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { currentPassword, newPassword } = req.body;
  if (!(await req.user.validatePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 401, 'UNAUTHORIZED');
  }
  await req.user.update({ password: newPassword });
  return sendSuccess(res, { message: 'Password changed' });
};

export const forgotPassword = async (req: AuthRequest, res: Response) => {
  const email = String((req.body as { email: string }).email || '').trim();
  const user = await User.findOne({ where: { email } });

  const payload: { message: string; resetUrl?: string } = {
    message: 'If that email is registered, a reset link has been sent.',
  };

  if (user) {
    const raw = generateResetToken();
    const tokenHash = hashResetToken(raw);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await PasswordResetToken.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      usedAt: null,
    });
    const resetUrl = `${env.appPublicUrl}/reset-password?token=${encodeURIComponent(raw)}`;
    try {
      await sendPasswordResetEmail({ to: user.email, resetUrl });
    } catch (err) {
      console.error('[marketlist] Failed to send password reset email', err);
      if (env.nodeEnv !== 'production') {
        console.info('[marketlist] Password reset URL (email failed):', resetUrl);
      }
    }
    if (env.nodeEnv !== 'production') {
      payload.resetUrl = resetUrl;
    }
  }

  return sendSuccess(res, payload);
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
  const { token, password } = req.body as { token: string; password: string };
  const tokenHash = hashResetToken(token);
  const row = await PasswordResetToken.findOne({ where: { tokenHash } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw new AppError('Invalid or expired reset token', 400, 'VALIDATION_ERROR');
  }
  const user = await User.findByPk(row.userId);
  if (!user) throw new AppError('Invalid or expired reset token', 400, 'VALIDATION_ERROR');
  await user.update({ password });
  await row.update({ usedAt: new Date() });
  await RefreshSession.destroy({ where: { userId: user.id } });
  return sendSuccess(res, { message: 'Password updated' });
};

export const updatePreferences = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { dietaryPrefs, notifyExpiring, notifyTripReminder } = req.body as {
    dietaryPrefs: string[];
    notifyExpiring?: boolean;
    notifyTripReminder?: boolean;
  };
  const current = (req.user.notificationPrefs || {}) as NotificationPrefs;
  const notificationPrefs: NotificationPrefs = {
    notifyExpiring:
      typeof notifyExpiring === 'boolean' ? notifyExpiring : Boolean(current.notifyExpiring),
    notifyTripReminder:
      typeof notifyTripReminder === 'boolean'
        ? notifyTripReminder
        : Boolean(current.notifyTripReminder),
  };
  await req.user.update({ dietaryPrefs, notificationPrefs });
  await req.user.reload();
  return sendSuccess(res, { user: publicUser(req.user) });
};

export const savePushToken = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { pushToken } = req.body as { pushToken: string };
  await req.user.update({ pushToken });
  await req.user.reload();
  return sendSuccess(res, { user: publicUser(req.user), pushToken: req.user.pushToken });
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const userId = req.user.id;

  const memberships = await HouseholdMember.findAll({ where: { userId } });
  for (const membership of memberships) {
    await leaveHouseholdInternal(userId, membership.householdId);
  }

  const recipes = await Recipe.findAll({ where: { userId } });
  const recipeIds = recipes.map((r) => r.id);
  if (recipeIds.length) {
    await RecipeIngredient.destroy({ where: { recipeId: recipeIds } });
    await Recipe.destroy({ where: { id: recipeIds } });
  }
  await MealPlan.destroy({ where: { userId } });
  await RefreshSession.destroy({ where: { userId } });
  await PasswordResetToken.destroy({ where: { userId } });

  const raw = readRefreshToken(req);
  if (raw) await revokeRefreshToken(raw);
  clearRefreshCookie(res);

  await User.destroy({ where: { id: userId } });
  return sendSuccess(res, { message: 'Account deleted' });
};
