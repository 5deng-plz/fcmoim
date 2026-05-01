export type AppErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'membership_not_approved'
  | 'match_result_not_saved'
  | 'internal_error';

export class AppError extends Error {
  code: AppErrorCode;
  status: number;
  details?: unknown;

  constructor(code: AppErrorCode, message: string, options?: { status?: number; cause?: unknown; details?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = options?.status ?? statusForCode(code);
    this.details = options?.details;
  }
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err(code: AppErrorCode, message: string, options?: { status?: number; cause?: unknown; details?: unknown }): Result<never> {
  return { ok: false, error: new AppError(code, message, options) };
}

export function statusForCode(code: AppErrorCode): number {
  switch (code) {
    case 'bad_request':
      return 400;
    case 'unauthorized':
      return 401;
    case 'forbidden':
    case 'membership_not_approved':
      return 403;
    case 'not_found':
      return 404;
    case 'conflict':
      return 409;
    case 'match_result_not_saved':
      return 500;
    case 'internal_error':
    default:
      return 500;
  }
}

export function toAppError(error: unknown, fallbackCode: AppErrorCode = 'internal_error'): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  return new AppError(fallbackCode, message, { cause: error });
}

export function appErrorResponse(error: unknown): Response {
  const appError = toAppError(error);

  return Response.json(
    {
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      },
    },
    { status: appError.status },
  );
}

