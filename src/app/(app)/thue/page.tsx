"use client";

import { SettingOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Select } from "antd";
import Link from "next/link";
import { useState } from "react";
import { MetricRow } from "@/components/reports/period-picker";
import { TaxMeter } from "@/components/reports/tax-meter";
import { useStatsRange, useTaxConfig } from "@/hooks/use-shop-data";
import { todayVN } from "@/lib/domain/dates";
import { TAX_GROUP_LABEL, TAX_GROUPS } from "@/lib/domain/models";
import { formatVnd } from "@/lib/domain/money";
import { periodRange, sumStats } from "@/lib/domain/reports";
import { estimateTax, forecastYearRevenue, type TaxEstimate } from "@/lib/domain/tax";

function EstimateRows({ estimate }: { estimate: TaxEstimate }) {
  return (
    <>
      {TAX_GROUPS.filter((g) => estimate.byGroup[g].revenue).map((g) => (
        <MetricRow
          key={g}
          label={TAX_GROUP_LABEL[g]}
          value={formatVnd(estimate.byGroup[g].vat + estimate.byGroup[g].pit)}
          hint={`trên ${formatVnd(estimate.byGroup[g].revenue)}`}
        />
      ))}
      <MetricRow label="Thuế GTGT" value={formatVnd(estimate.vat)} />
      <MetricRow label="Thuế TNCN" value={formatVnd(estimate.pit)} />
      <MetricRow label="Tổng thuế ước tính" value={formatVnd(estimate.total)} strong tone="debt" />
    </>
  );
}

export default function TaxPage() {
  const today = todayVN();
  const currentYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const stats = useStatsRange(`${year - 1}-01`, `${year}-12`);
  const config = useTaxConfig();

  const throughMonth = year === currentYear ? Number(today.slice(5, 7)) : 12;
  const revenueByMonth = Object.fromEntries(stats.data.map((s) => [s.id, s.revenue ?? 0]));
  const forecast = forecastYearRevenue(year, throughMonth, revenueByMonth);
  const yearStats = stats.data.filter((s) => s.id.startsWith(`${year}-`));
  const yearTotals = sumStats(yearStats);
  const ytd = estimateTax(yearTotals.byTaxGroup, forecast.forecast, config.data);
  const quarters = [1, 2, 3, 4]
    .map((q) => {
      const range = periodRange({ kind: "quarter", year, index: q });
      const totals = sumStats(yearStats.filter((s) => range.months.includes(s.id)));
      return { q, label: range.label, estimate: estimateTax(totals.byTaxGroup, forecast.forecast, config.data) };
    })
    .filter((x) => x.estimate.revenue !== 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Thuế</h1>
        <div className="flex gap-2">
          <Select
            className="w-24"
            value={year}
            options={Array.from({ length: currentYear - 2024 }, (_, i) => currentYear - i).map((y) => ({ value: y, label: y }))}
            onChange={setYear}
          />
          <Link href="/cai-dat"><Button icon={<SettingOutlined />}>Cấu hình</Button></Link>
        </div>
      </div>

      <Alert
        type="warning"
        showIcon
        title="Số ước tính"
        description="Mốc doanh thu và tỷ lệ thuế lấy theo cấu hình của cửa hàng. Quy định cho hộ kinh doanh thay đổi từ năm 2026, cần xác nhận với cơ quan thuế."
      />

      <Card loading={stats.loading || config.loading}>
        <TaxMeter actual={forecast.actual} forecast={forecast.forecast} config={config.data} />
        <div className="mt-2 text-xs text-muted">
          {throughMonth === 12
            ? "Năm đã kết thúc, dự báo bằng thực tế."
            : `Dự báo = thực tế ${throughMonth} tháng` +
              (forecast.monthsFromLastYear ? ` + ${forecast.monthsFromLastYear} tháng theo cùng kỳ năm trước` : "") +
              (forecast.monthsFromAverage ? ` + ${forecast.monthsFromAverage} tháng theo trung bình tháng năm nay` : "") +
              "."}
        </div>
      </Card>

      <Card title={`Thuế trên doanh thu đã có năm ${year}`} loading={stats.loading || config.loading}>
        {ytd.tier === "exempt" ? (
          <div className="text-muted">
            Doanh thu dự báo cả năm chưa vượt {formatVnd(config.data.exemptThreshold)} nên chưa phải nộp thuế GTGT, TNCN.
          </div>
        ) : (
          <EstimateRows estimate={ytd} />
        )}
      </Card>

      {ytd.tier !== "exempt" && quarters.length > 0 && (
        <Card title="Theo quý">
          {quarters.map((x) => (
            <MetricRow
              key={x.q}
              label={x.label}
              value={formatVnd(x.estimate.total)}
              hint={`GTGT ${formatVnd(x.estimate.vat)} · TNCN ${formatVnd(x.estimate.pit)}`}
            />
          ))}
        </Card>
      )}
    </div>
  );
}
