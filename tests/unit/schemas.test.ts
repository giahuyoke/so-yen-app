import { describe, expect, test } from "vitest";
import { adjustmentInput, inviteInput, productInput, productionInput, receiptInput } from "@/lib/domain/schemas";

const ID = "abcdef0123456789";

describe("productInput", () => {
  test("hợp lệ và tự trim tên", () => {
    const p = productInput.parse({
      id: ID, name: "  Yến thô  ", kind: "raw", unit: "g",
      suggestedPrice: 35_000, lowStockThreshold: 100, taxGroup: "self_raw",
    });
    expect(p.name).toBe("Yến thô");
  });

  test("từ chối tên trống và giá âm", () => {
    const r = productInput.safeParse({
      id: ID, name: " ", kind: "raw", unit: "g", suggestedPrice: -1, lowStockThreshold: 0, taxGroup: "self_raw",
    });
    expect(r.success).toBe(false);
  });
});

describe("receiptInput", () => {
  test("note và supplierId có giá trị mặc định", () => {
    const r = receiptInput.parse({
      id: ID, kind: "harvest", date: "2026-10-22", lines: [{ productId: ID, qty: 500, totalCost: 0 }],
    });
    expect(r).toMatchObject({ note: "", supplierId: null });
  });

  test("cần ít nhất một dòng, số lượng nguyên dương, ngày đúng định dạng", () => {
    expect(receiptInput.safeParse({ id: ID, kind: "harvest", date: "2026-10-22", lines: [] }).success).toBe(false);
    expect(
      receiptInput.safeParse({ id: ID, kind: "harvest", date: "2026-10-22", lines: [{ productId: ID, qty: 1.5, totalCost: 0 }] }).success,
    ).toBe(false);
    expect(
      receiptInput.safeParse({ id: ID, kind: "harvest", date: "22/10/2026", lines: [{ productId: ID, qty: 1, totalCost: 0 }] }).success,
    ).toBe(false);
  });
});

describe("productionInput", () => {
  test("hợp lệ", () => {
    expect(
      productionInput.safeParse({
        id: ID, kind: "clean", date: "2026-10-22",
        inputs: [{ productId: ID, qty: 1000 }],
        outputs: [{ productId: "zzzzzz0123456789", qty: 800, gramPerUnit: 1 }],
      }).success,
    ).toBe(true);
  });
});

describe("adjustmentInput", () => {
  test("bắt buộc lý do, qtyDelta khác 0", () => {
    expect(adjustmentInput.safeParse({ id: ID, date: "2026-10-22", reason: "", lines: [{ productId: ID, qtyDelta: -5 }] }).success).toBe(false);
    expect(adjustmentInput.safeParse({ id: ID, date: "2026-10-22", reason: "Kiểm kho", lines: [{ productId: ID, qtyDelta: 0 }] }).success).toBe(false);
    expect(adjustmentInput.safeParse({ id: ID, date: "2026-10-22", reason: "Kiểm kho", lines: [{ productId: ID, qtyDelta: -5 }] }).success).toBe(true);
  });
});

describe("inviteInput", () => {
  test("chuẩn hóa email về chữ thường", () => {
    expect(inviteInput.parse({ email: " Lan@Gmail.com " }).email).toBe("lan@gmail.com");
  });
});
