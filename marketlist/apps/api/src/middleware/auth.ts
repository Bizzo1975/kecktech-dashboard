import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models';
import { AppError } from '../utils/http';

export type AuthRequest = Request & { user?: InstanceType<typeof User> };

export const requireAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401, 'UNAUTHORIZED');
    }
    const token = header.slice(7);
    const decoded = jwt.verify(token, env.jwtSecret) as { id: string };
    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new AppError('User not found', 401, 'UNAUTHORIZED');
    }
    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'));
  }
};
