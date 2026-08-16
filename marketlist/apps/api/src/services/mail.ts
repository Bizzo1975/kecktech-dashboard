import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { env } from '../config/env';

const hasSmtp = (): boolean =>
  Boolean(env.smtp.host && env.smtp.from);

export const sendPasswordResetEmail = async (opts: {
  to: string;
  resetUrl: string;
}): Promise<{ delivered: 'smtp' | 'console' }> => {
  const subject = 'Reset your Marketlist password';
  const text = `Reset your Marketlist password using this link (expires in 1 hour):\n\n${opts.resetUrl}\n\nIf you did not request this, you can ignore this email.`;

  if (hasSmtp()) {
    const transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth:
        env.smtp.user && env.smtp.pass
          ? { user: env.smtp.user, pass: env.smtp.pass }
          : undefined,
    });
    await transporter.sendMail({
      from: env.smtp.from,
      to: opts.to,
      subject,
      text,
    });
    return { delivered: 'smtp' };
  }

  if (env.nodeEnv !== 'production') {
    console.info('[marketlist] Password reset (no SMTP_* configured):', opts.resetUrl);
    return { delivered: 'console' };
  }

  console.warn('[marketlist] Password reset requested but SMTP is not configured in production');
  return { delivered: 'console' };
};

export const hashResetToken = (raw: string): string =>
  crypto.createHash('sha256').update(raw).digest('hex');

export const generateResetToken = (): string => crypto.randomBytes(32).toString('hex');
