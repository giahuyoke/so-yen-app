import { describe, expect, test } from "vitest";
import { DEFAULT_TAX_CONFIG, estimateTax, forecastYearRevenue, resolveTaxConfig, revenueTier } from "@/lib/domain/tax";

const config = DEFAULT_TAX_CONFIG;

describe("revenueTier", () => {
  test("đúng mốc 500 triệu vẫn được miễn, trên 1 tỷ là bậc hóa đơn", () => {
    expect(revenueTier(500_000_000, config)).toBe("exempt");
    expect(revenueTier(500_000_001, config)).toBe("taxable");
    expect(revenueTier(1_000_000_000, config)).toBe("invoice");
  });
});

describe("estimateTax", () => {
  test("dưới mốc miễn thuế thì không có thuế", () => {
    const e = estimateTax({ processed: 300_000_000 }, 400_000_000, config);
    expect(e).toMatchObject({ tier: "exempt", revenue: 300_000_000, vat: 0, pit: 0, total: 0 });
  });

  test("GTGT tính trên toàn bộ doanh thu, TNCN chỉ trên phần vượt mốc", () => {
    const e = estimateTax({ processed: 600_000_000, resale: 200_000_000, self_raw: 200_000_000 }, 1_000_000_000, config);
    expect(e.tier).toBe("invoice");
    expect(e.byGroup.processed).toEqual({ revenue: 600_000_000, vat: 18_000_000, pit: 4_500_000 });
    expect(e.byGroup.resale).toEqual({ revenue: 200_000_000, vat: 2_000_000, pit: 500_000 });
    expect(e.byGroup.self_raw).toEqual({ revenue: 200_000_000, vat: 0, pit: 0 });
    expect(e.total).toBe(25_000_000);
  });

  test("tắt chỉ tính phần vượt thì TNCN tính trên toàn bộ", () => {
    const e = estimateTax({ processed: 800_000_000 }, 800_000_000, { ...config, pitOnExcessOnly: false });
    expect(e.pit).toBe(12_000_000);
  });
});

describe("resolveTaxConfig", () => {
  test("bù các trường thiếu bằng mặc định", () => {
    const c = resolveTaxConfig({ exemptThreshold: 600_000_000, rates: { processed: { vat: 2, pit: 1 } } as never });
    expect(c.exemptThreshold).toBe(600_000_000);
    expect(c.invoiceThreshold).toBe(1_000_000_000);
    expect(c.rates.processed).toEqual({ vat: 2, pit: 1 });
    expect(c.rates.resale).toEqual({ vat: 1, pit: 0.5 });
    expect(resolveTaxConfig(undefined)).toEqual(DEFAULT_TAX_CONFIG);
  });
});

describe("forecastYearRevenue", () => {
  test("các tháng còn lại lấy cùng kỳ năm trước nếu có, không thì trung bình", () => {
    const f = forecastYearRevenue(2026, 3, {
      "2026-01": 100,
      "2026-02": 200,
      "2026-03": 300,
      "2025-04": 1_000,
      "2025-12": 2_000,
    });
    expect(f.actual).toBe(600);
    expect(f.monthsFromLastYear).toBe(2);
    expect(f.monthsFromAverage).toBe(7);
    expect(f.forecast).toBe(600 + 3_000 + 7 * 200);
  });

  test("năm đã qua thì dự báo bằng thực tế", () => {
    const f = forecastYearRevenue(2025, 12, { "2025-01": 50, "2025-12": 70 });
    expect(f).toEqual({ actual: 120, forecast: 120, monthsFromLastYear: 0, monthsFromAverage: 0 });
  });
});
