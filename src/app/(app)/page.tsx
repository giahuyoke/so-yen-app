"use client";

import { BarChartOutlined, ExperimentOutlined, InboxOutlined, RightOutlined, WalletOutlined } from "@ant-design/icons";
import { Card, Empty, Skeleton, Tag } from "antd";
import Link from "next/link";
import { TaxMeter } from "@/components/reports/tax-meter";
import { useCustomers, useMonthStats, useProducts, useStatsRange, useTaxConfig, useTodaySales, useTopDebtors } from "@/hooks/use-shop-data";
import { monthKey, todayVN } from "@/lib/domain/dates";
import { PRODUCT_KIND_LABEL } from "@/lib/domain/models";
import { formatPercent, formatQty, formatVnd } from "@/lib/domain/money";
import { forecastYearRevenue } from "@/lib/domain/tax";

function Tile({ label, value, hint, tone = "ink" }: { label: string; value: string; hint?: string; tone?: "ink" | "debt" }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className={`text-lg font-semibold ${tone === "debt" ? "text-debt" : "text-ink"}`}>{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}

function Shortcut({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="text-ink">
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-lg text-brand">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const today = todayVN();
  const month = monthKey(today);
  const todaySales = useTodaySales();
  const stats = useMonthStats(month);
  const debtors = useTopDebtors();
  const customers = useCustomers();
  const products = useProducts();
  const year = Number(today.slice(0, 4));
  const yearStats = useStatsRange(`${year - 1}-01`, `${year}-12`);
  const taxConfig = useTaxConfig();
  const forecast = forecastYearRevenue(
    year,
    Number(month.slice(5)),
    Object.fromEntries(yearStats.data.map((s) => [s.id, s.revenue ?? 0])),
  );

  const active = todaySales.data.filter((s) => s.status === "active");
  const todayRevenue = active.reduce((sum, s) => sum + s.total, 0);
  const todayCogs = active.reduce((sum, s) => sum + s.lines.reduce((x, l) => x + l.totalCost, 0), 0);
  const monthRevenue = stats.data?.revenue ?? 0;
  const monthProfit = monthRevenue - (stats.data?.cogs ?? 0);
  const monthNet = monthProfit - (stats.data?.expenses ?? 0);
  const totalDebt = customers.data.reduce((sum, c) => sum + (c.debtBalance ?? 0), 0);
  const lowStock = products.data.filter((p) => !p.archived && p.lowStockThreshold > 0 && p.stockQty <= p.lowStockThreshold);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Khối nổi bật kiểu ví điện tử: con số quan trọng nhất của tháng. */}
      <section className="rounded-3xl bg-brand p-5 text-white">
        <div className="text-sm text-brand-tint">Doanh thu tháng {Number(month.slice(5))}</div>
        {stats.loading ? (
          <Skeleton.Input active className="mt-1" />
        ) : (
          <div className="text-3xl font-semibold">{formatVnd(monthRevenue)}</div>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-brand-dark px-3 py-1">
            Lãi gộp {formatVnd(monthProfit)}
            {monthRevenue > 0 && ` · ${formatPercent(monthProfit / monthRevenue)}`}
          </span>
          <span className="rounded-full bg-brand-dark px-3 py-1">Lãi ròng {formatVnd(monthNet)}</span>
          <span className="rounded-full bg-brand-dark px-3 py-1">{stats.data?.saleCount ?? 0} đơn</span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Tile
          label="Hôm nay"
          value={formatVnd(todayRevenue)}
          hint={`${active.length} đơn · lãi ${formatVnd(todayRevenue - todayCogs)}`}
        />
        <Tile label="Công nợ" value={formatVnd(totalDebt)} hint={`${customers.data.filter((c) => (c.debtBalance ?? 0) > 0).length} khách đang nợ`} tone="debt" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Shortcut href="/kho/nhap" icon={<InboxOutlined />} label="Nhập kho" />
        <Shortcut href="/kho/che-bien" icon={<ExperimentOutlined />} label="Chế biến" />
        <Shortcut href="/chi-phi" icon={<WalletOutlined />} label="Chi phí" />
        <Shortcut href="/bao-cao" icon={<BarChartOutlined />} label="Báo cáo" />
      </div>

      <Card title={`Đồng hồ thuế ${year}`} loading={yearStats.loading || taxConfig.loading} extra={<Link href="/thue">Chi tiết</Link>}>
        <TaxMeter actual={forecast.actual} forecast={forecast.forecast} config={taxConfig.data} />
      </Card>

      <Card title="Khách đang nợ" loading={debtors.loading} extra={<Link href="/khach-hang">Tất cả</Link>}>
        {debtors.data.length === 0 ? (
          <Empty description="Không có khách nào đang nợ" />
        ) : (
          <div className="divide-y divide-line">
            {debtors.data.map((c) => (
              <Link key={c.id} href={`/khach-hang/${c.id}`} className="flex items-center justify-between py-3 text-ink">
                <span>{c.name}</span>
                <span className="flex items-center gap-2 font-medium text-debt">
                  {formatVnd(c.debtBalance ?? 0)}
                  <RightOutlined className="text-xs text-muted" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card title="Sắp hết hàng" loading={products.loading} extra={<Link href="/kho">Kho</Link>}>
        {lowStock.length === 0 ? (
          <Empty description="Chưa có sản phẩm nào dưới mức cảnh báo" />
        ) : (
          <div className="divide-y divide-line">
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <div>{p.name}</div>
                  <div className="text-xs text-muted">{PRODUCT_KIND_LABEL[p.kind]}</div>
                </div>
                <Tag color="warning" className="m-0!">còn {formatQty(p.stockQty, p.unit)}</Tag>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
