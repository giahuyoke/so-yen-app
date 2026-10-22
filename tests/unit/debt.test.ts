import { describe, expect, test } from "vitest";
import { remainingDebtBySale } from "@/lib/domain/debt";

const sale = (id: string, date: string, debt: number, status: "active" | "voided" = "active") => ({ id, date, debt, status });

describe("remainingDebtBySale", () => {
  test("tiền thu trả đơn cũ trước, phần nợ còn lại thuộc đơn mới nhất", () => {
    const sales = [sale("a", "2026-08-01", 3_000_000), sale("b", "2026-09-01", 2_000_000), sale("c", "2026-10-01", 1_000_000)];
    // Đã thu 4tr trên tổng 6tr nợ: đơn a trả hết, b còn 1tr, c còn nguyên.
    expect(remainingDebtBySale(sales, 2_000_000)).toEqual(new Map([["c", 1_000_000], ["b", 1_000_000]]));
  });

  test("bỏ qua đơn đã hủy và đơn không nợ; hết nợ thì rỗng", () => {
    const sales = [sale("a", "2026-08-01", 0), sale("b", "2026-09-01", 500_000, "voided"), sale("c", "2026-10-01", 700_000)];
    expect(remainingDebtBySale(sales, 700_000)).toEqual(new Map([["c", 700_000]]));
    expect(remainingDebtBySale(sales, 0).size).toBe(0);
  });

  test("cùng ngày thì đơn tạo sau được coi là mới hơn", () => {
    const at = (ms: number) => ({ toMillis: () => ms });
    const sales = [
      { ...sale("a", "2026-10-01", 1_000), createdAt: at(1) },
      { ...sale("b", "2026-10-01", 1_000), createdAt: at(2) },
    ];
    expect(remainingDebtBySale(sales, 1_000)).toEqual(new Map([["b", 1_000]]));
  });
});
