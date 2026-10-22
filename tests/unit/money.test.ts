import { describe, expect, test } from "vitest";
import {
  formatCostPer,
  formatNumber,
  formatPercent,
  formatQty,
  formatUnitPrice,
  formatVnd,
  fromDisplayPrice,
  parseMoney,
  toDisplayPrice,
} from "@/lib/domain/money";

describe("formatVnd", () => {
  test("dùng dấu chấm phân cách hàng nghìn", () => {
    expect(formatVnd(1250000)).toBe("1.250.000\u00a0₫");
    expect(formatVnd(0)).toBe("0\u00a0₫");
    expect(formatNumber(-35000)).toBe("-35.000");
  });
});

describe("formatQty", () => {
  test("gram và cái", () => {
    expect(formatQty(1200, "g")).toBe("1.200g");
    expect(formatQty(3, "piece")).toBe("3 cái");
  });
});

describe("parseMoney", () => {
  test.each([
    ["1tr5", 1_500_000],
    ["1.5tr", 1_500_000],
    ["1,5tr", 1_500_000],
    ["2tr", 2_000_000],
    ["1tr25", 1_250_000],
    ["1tr250", 1_250_000],
    ["2 triệu", 2_000_000],
    ["350k", 350_000],
    ["1.5k", 1_500],
    ["1.250.000", 1_250_000],
    ["1,250,000", 1_250_000],
    ["250000", 250_000],
    [" 350K ", 350_000],
    ["120.000đ", 120_000],
  ])("%s → %d", (raw, expected) => {
    expect(parseMoney(raw)).toBe(expected);
  });

  test.each(["", "abc", "1,5", "1.5tr5", "-200k", "1..000"])("%s → null", (raw) => {
    expect(parseMoney(raw)).toBeNull();
  });
});

describe("formatPercent", () => {
  test("dấu phẩy thập phân kiểu Việt Nam, một chữ số lẻ", () => {
    expect(formatPercent(0.5)).toBe("50,0%");
    expect(formatPercent(0.397_2)).toBe("39,7%");
    expect(formatPercent(0)).toBe("0,0%");
  });
});

describe("giá theo 100g", () => {
  test("đổi qua lại giữa giá lưu ₫/g và giá hiển thị ₫/100g", () => {
    expect(toDisplayPrice(45_000, "g")).toBe(4_500_000);
    expect(toDisplayPrice(300_000, "piece")).toBe(300_000);
    expect(fromDisplayPrice(4_550_000, "g")).toBe(45_500);
    expect(fromDisplayPrice(4_555_550, "g")).toBeNull();
    expect(fromDisplayPrice(75_000, "piece")).toBe(75_000);
  });

  test("định dạng", () => {
    expect(formatUnitPrice(45_000, "g")).toBe("4.500.000 ₫/100g");
    expect(formatCostPer(2_500_000, 1_000, "g")).toBe("250.000 ₫/100g");
    expect(formatCostPer(514_000, 2, "piece")).toBe("257.000 ₫/cái");
  });
});
