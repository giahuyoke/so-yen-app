import { describe, expect, test } from "vitest";
import { formatNumber, formatPercent, formatQty, formatVnd, parseMoney } from "@/lib/domain/money";

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
