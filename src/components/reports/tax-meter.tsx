import { formatVnd } from "@/lib/domain/money";
import { revenueTier, type RevenueTier, type TaxConfig } from "@/lib/domain/tax";

export const TIER_LABEL: Record<RevenueTier, string> = {
  exempt: "Chưa tới mốc chịu thuế",
  taxable: "Đã vượt mốc chịu thuế",
  invoice: "Phải dùng hóa đơn điện tử",
};

/** Bậc đã đạt theo doanh thu thực tế; nếu chỉ dự báo mới tới bậc cao hơn thì nói rõ là dự báo. */
function tierText(actualTier: RevenueTier, forecastTier: RevenueTier): string {
  if (actualTier === forecastTier) return TIER_LABEL[actualTier];
  return forecastTier === "invoice" ? "Dự báo sẽ phải dùng hóa đơn điện tử" : "Dự báo sẽ vượt mốc chịu thuế";
}

const short = (n: number) => (n >= 1_000_000_000 ? `${n / 1_000_000_000} tỷ` : `${Math.round(n / 1_000_000)} triệu`);

/** Thanh doanh thu năm so với các mốc thuế; phần nhạt là dự báo tới cuối năm. */
export function TaxMeter({ actual, forecast, config }: { actual: number; forecast: number; config: TaxConfig }) {
  const max = Math.max(config.invoiceThreshold * 1.2, forecast, actual);
  const pct = (n: number) => `${Math.min(100, (n / max) * 100)}%`;
  const tier = revenueTier(forecast, config);
  const marks = [config.exemptThreshold, config.invoiceThreshold];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted">Doanh thu từ đầu năm</span>
        <span className="text-lg font-semibold">{formatVnd(actual)}</span>
      </div>
      <div className="relative mt-3 h-3 rounded-full bg-canvas">
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand-tint" style={{ width: pct(forecast) }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand bg-brand-gradient" style={{ width: pct(actual) }} />
        {marks.map((m) => (
          <div key={m} className="absolute -inset-y-1 w-0.5 bg-ink" style={{ left: pct(m) }} />
        ))}
      </div>
      <div className="relative mt-1 h-4 text-xs text-muted">
        {marks.map((m) => (
          <span key={m} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: pct(m) }}>
            {short(m)}
          </span>
        ))}
      </div>
      <div className="mt-2 text-sm">
        Dự báo cả năm <b>{formatVnd(forecast)}</b> ·{" "}
        <span className={tier === "exempt" ? "text-brand" : "text-debt"}>{tierText(revenueTier(actual, config), tier)}</span>
      </div>
    </div>
  );
}
