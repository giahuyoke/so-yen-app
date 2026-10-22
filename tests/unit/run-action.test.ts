import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { AppError } from "@/lib/domain/errors";
import { runAction } from "@/server/run-action";

describe("runAction", () => {
  test("bọc kết quả thành công", async () => {
    expect(await runAction(async () => 42)).toEqual({ ok: true, data: 42 });
  });

  test("AppError giữ nguyên code và message", async () => {
    const r = await runAction(async () => {
      throw new AppError("INSUFFICIENT_STOCK", "Không đủ hàng");
    });
    expect(r).toEqual({ ok: false, code: "INSUFFICIENT_STOCK", message: "Không đủ hàng" });
  });

  test("ZodError thành VALIDATION kèm fieldErrors theo đường dẫn", async () => {
    const schema = z.object({ lines: z.array(z.object({ qty: z.number().positive("Phải > 0") })) });
    const r = await runAction(async () => schema.parse({ lines: [{ qty: -1 }] }));
    expect(r).toEqual({
      ok: false,
      code: "VALIDATION",
      message: "Phải > 0",
      fieldErrors: { "lines.0.qty": "Phải > 0" },
    });
  });

  test("lỗi lạ thành INTERNAL, không lộ chi tiết", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await runAction(async () => {
      throw new Error("db password wrong");
    });
    expect(r).toEqual({ ok: false, code: "INTERNAL", message: "Có lỗi xảy ra, vui lòng thử lại." });
    spy.mockRestore();
  });
});
