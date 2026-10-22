import { ZodError } from "zod";
import { AppError, type ActionResult } from "@/lib/domain/errors";

/** Chuyển mọi lỗi thành ActionResult để client hiển thị thống nhất. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, code: error.code, message: error.message };
    }
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) {
        fieldErrors[issue.path.join(".")] ??= issue.message;
      }
      return {
        ok: false,
        code: "VALIDATION",
        message: error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        fieldErrors,
      };
    }
    console.error(error);
    return { ok: false, code: "INTERNAL", message: "Có lỗi xảy ra, vui lòng thử lại." };
  }
}
