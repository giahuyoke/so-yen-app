export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "INSUFFICIENT_STOCK"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

/** Lỗi nghiệp vụ có message tiếng Việt, hiển thị thẳng cho người dùng. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; fieldErrors?: Record<string, string> };
