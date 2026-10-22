import { TAX_GROUPS, type TaxGroup } from "@/lib/domain/models";

/** Tỷ lệ tính bằng phần trăm, VD 1.5 = 1,5%. */
export interface TaxRate {
  vat: number;
  pit: number;
}

export interface TaxConfig {
  /** Doanh thu năm từ mốc này trở xuống thì không phải nộp GTGT, TNCN. */
  exemptThreshold: number;
  /** Từ mốc này phải dùng hóa đơn điện tử khởi tạo từ máy tính tiền. */
  invoiceThreshold: number;
  /** TNCN chỉ tính trên phần doanh thu vượt mốc miễn thuế. */
  pitOnExcessOnly: boolean;
  rates: Record<TaxGroup, TaxRate>;
}

/** Giá trị gợi ý theo quy định hộ kinh doanh từ 2026; cần xác nhận với cơ quan thuế. */
export const DEFAULT_TAX_CONFIG: TaxConfig = {
  exemptThreshold: 500_000_000,
  invoiceThreshold: 1_000_000_000,
  pitOnExcessOnly: true,
  rates: {
    self_raw: { vat: 0, pit: 0 },
    resale: { vat: 1, pit: 0.5 },
    processed: { vat: 3, pit: 1.5 },
  },
};

/** Ghép cấu hình đã lưu (có thể thiếu trường) với giá trị mặc định. */
export function resolveTaxConfig(saved?: Partial<TaxConfig> | null): TaxConfig {
  const rates = Object.fromEntries(
    TAX_GROUPS.map((g) => [g, { ...DEFAULT_TAX_CONFIG.rates[g], ...saved?.rates?.[g] }]),
  ) as Record<TaxGroup, TaxRate>;
  return { ...DEFAULT_TAX_CONFIG, ...saved, rates };
}

export type RevenueTier = "exempt" | "taxable" | "invoice";

export function revenueTier(yearRevenue: number, config: TaxConfig): RevenueTier {
  if (yearRevenue <= config.exemptThreshold) return "exempt";
  return yearRevenue >= config.invoiceThreshold ? "invoice" : "taxable";
}

export interface TaxEstimate {
  tier: RevenueTier;
  revenue: number;
  vat: number;
  pit: number;
  total: number;
  byGroup: Record<TaxGroup, { revenue: number; vat: number; pit: number }>;
}

/**
 * Ước tính thuế cho doanh thu theo nhóm thuế của một kỳ. `yearRevenue` là
 * doanh thu cả năm (thực tế hoặc dự báo) để xác định bậc. Khi chỉ tính TNCN
 * trên phần vượt mốc, phần được trừ chia đều theo tỷ lệ doanh thu của kỳ.
 */
export function estimateTax(
  byTaxGroup: Partial<Record<TaxGroup, number>>,
  yearRevenue: number,
  config: TaxConfig,
): TaxEstimate {
  const tier = revenueTier(yearRevenue, config);
  const pitShare =
    tier === "exempt" ? 0 : config.pitOnExcessOnly ? (yearRevenue - config.exemptThreshold) / yearRevenue : 1;
  const byGroup = {} as TaxEstimate["byGroup"];
  let revenue = 0;
  let vat = 0;
  let pit = 0;
  for (const group of TAX_GROUPS) {
    const r = byTaxGroup[group] ?? 0;
    const rate = config.rates[group];
    const g = {
      revenue: r,
      vat: tier === "exempt" ? 0 : Math.round((r * rate.vat) / 100),
      pit: Math.round((r * rate.pit * pitShare) / 100),
    };
    byGroup[group] = g;
    revenue += g.revenue;
    vat += g.vat;
    pit += g.pit;
  }
  return { tier, revenue, vat, pit, total: vat + pit, byGroup };
}

export interface YearForecast {
  actual: number;
  forecast: number;
  /** Số tháng còn lại được lấy theo cùng kỳ năm trước. */
  monthsFromLastYear: number;
  /** Số tháng còn lại được lấy theo trung bình tháng năm nay. */
  monthsFromAverage: number;
}

const monthId = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

/**
 * Dự báo doanh thu cả năm: thực tế tháng 1..`throughMonth`, cộng các tháng
 * còn lại theo cùng kỳ năm trước nếu có dữ liệu, nếu không thì theo trung
 * bình tháng của năm nay. `revenueByMonth` chỉ chứa các tháng có dữ liệu.
 */
export function forecastYearRevenue(
  year: number,
  throughMonth: number,
  revenueByMonth: Record<string, number>,
): YearForecast {
  let actual = 0;
  for (let m = 1; m <= throughMonth; m++) actual += revenueByMonth[monthId(year, m)] ?? 0;
  const average = throughMonth > 0 ? actual / throughMonth : 0;

  let forecast = actual;
  let monthsFromLastYear = 0;
  let monthsFromAverage = 0;
  for (let m = throughMonth + 1; m <= 12; m++) {
    const lastYear = revenueByMonth[monthId(year - 1, m)];
    if (lastYear !== undefined) {
      forecast += lastYear;
      monthsFromLastYear++;
    } else {
      forecast += average;
      monthsFromAverage++;
    }
  }
  return { actual, forecast: Math.round(forecast), monthsFromLastYear, monthsFromAverage };
}
