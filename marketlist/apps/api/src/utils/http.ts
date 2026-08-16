export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const sendSuccess = <T>(
  res: import('express').Response,
  data: T,
  status = 200,
) => res.status(status).json({ success: true, data });

export const sendError = (
  res: import('express').Response,
  message: string,
  status = 400,
  code = 'BAD_REQUEST',
) => res.status(status).json({ success: false, error: { message, code } });
