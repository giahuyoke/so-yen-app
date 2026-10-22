"use client";

import { DownloadOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Tabs } from "antd";
import Link from "next/link";
import { useState } from "react";
import { ItemList, ListItem, ListItemMeta } from "@/components/common/item-list";
import { MetricRow, PeriodPicker } from "@/components/reports/period-picker";
import { useShop } from "@/components/shop/shop-provider";
import {
  useDebtors,
  useProductionsInRange,
  useProducts,
  useReceiptsUpTo,
  useStatsRange,
  useSuppliers,
} from "@/hooks/use-shop-data";
import { formatDate, todayVN } from "@/lib/domain/dates";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABEL,
  SALE_CHANNEL_LABEL,
  SALE_CHANNELS,
} from "@/lib/domain/models";
import { formatPercent, formatQty, formatVnd } from "@/lib/domain/money";
import { lossBySource, periodRange, sumStats, type LossSource, type Period } from "@/lib/domain/reports";

const margin = (profit: number, revenue: number) => (revenue > 0 ? formatPercent(profit / revenue) : undefined);

export default function ReportsPage() {
  const { shop } = useShop();
  const today = todayVN();
  const [period, setPeriod] = useState<Period>({ kind: "month", year: Number(today.slice(0, 4)), index: Number(today.slice(5, 7)) });
  const range = periodRange(period);
  const stats = useStatsRange(range.months[0], range.months[range.months.length - 1]);
  const totals = sumStats(stats.data);
  const products = useProducts();
  const suppliers = useSuppliers();
  const productions = useProductionsInRange(range.from, range.to);
  const receipts = useReceiptsUpTo(range.to);
  const debtors = useDebtors();

  const exportUrl = `/api/export?${new URLSearchParams({ shopId: shop.id, from: range.from, to: range.to })}`;

  const channels = SALE_CHANNELS.map((c) => ({ channel: c, ...totals.byChannel[c] })).filter((c) => c.count || c.revenue);
  const productRows = Object.entries(totals.byProduct)
    .map(([id, p]) => ({ id, ...p }))
    .filter((p) => p.qty || p.revenue)
    .sort((a, b) => b.revenue - a.revenue);
  const cleanings = productions.data.filter((p) => p.kind === "clean" && p.status === "active").sort((a, b) => b.date.localeCompare(a.date));
  const lossGroups = lossBySource(cleanings, receipts.data);
  const sourceLabel = (source: LossSource) =>
    source === "harvest"
      ? "Thu hoạch nhà yến"
      : source === "unknown"
        ? "Không rõ nguồn"
        : source === "supplier:"
          ? "Mua hàng, không ghi nhà cung cấp"
          : (suppliers.byId.get(source.slice("supplier:".length))?.name ?? "Nhà cung cấp đã xóa");
  const totalDebt = debtors.data.reduce((sum, c) => sum + (c.debtBalance ?? 0), 0);

  const profitTab = (
    <Card loading={stats.loading}>
      <MetricRow label="Doanh thu" value={formatVnd(totals.revenue)} hint={`${totals.saleCount} đơn`} />
      <MetricRow label="Giá vốn hàng bán" value={`− ${formatVnd(totals.cogs)}`} />
      <MetricRow label="Lãi gộp" value={formatVnd(totals.grossProfit)} hint={margin(totals.grossProfit, totals.revenue)} strong />
      <div className="my-1 border-t border-line" />
      {EXPENSE_CATEGORIES.filter((c) => totals.expensesByCategory[c]).map((c) => (
        <MetricRow key={c} label={`Chi phí ${EXPENSE_CATEGORY_LABEL[c].toLowerCase()}`} value={`− ${formatVnd(totals.expensesByCategory[c] ?? 0)}`} />
      ))}
      <MetricRow label="Tổng chi phí" value={`− ${formatVnd(totals.expenses)}`} />
      <div className="my-1 border-t border-line" />
      <MetricRow
        label="Lãi ròng"
        value={formatVnd(totals.netProfit)}
        hint={margin(totals.netProfit, totals.revenue)}
        strong
        tone={totals.netProfit < 0 ? "debt" : "brand"}
      />
    </Card>
  );

  const channelTab = (
    <Card loading={stats.loading}>
      {channels.length === 0 ? (
        <Empty description="Chưa có đơn trong kỳ" />
      ) : (
        <ItemList
          dataSource={channels}
          rowKey={(c) => c.channel}
          renderItem={(c) => {
            const profit = (c.revenue ?? 0) - (c.cogs ?? 0);
            return (
              <ListItem extra={<div className="text-right font-semibold">{formatVnd(c.revenue ?? 0)}</div>}>
                <ListItemMeta
                  title={SALE_CHANNEL_LABEL[c.channel]}
                  description={`${c.count ?? 0} đơn · giá vốn ${formatVnd(c.cogs ?? 0)} · lãi ${formatVnd(profit)}${
                    c.revenue ? ` (${formatPercent(profit / c.revenue)})` : ""
                  }`}
                />
              </ListItem>
            );
          }}
        />
      )}
    </Card>
  );

  const productTab = (
    <Card loading={stats.loading || products.loading}>
      {productRows.length === 0 ? (
        <Empty description="Chưa bán sản phẩm nào trong kỳ" />
      ) : (
        <ItemList
          dataSource={productRows}
          renderItem={(p) => {
            const product = products.byId.get(p.id);
            const profit = p.revenue - p.cogs;
            return (
              <ListItem extra={<div className="text-right font-semibold">{formatVnd(p.revenue)}</div>}>
                <ListItemMeta
                  title={product?.name ?? "Sản phẩm đã xóa"}
                  description={`${product ? formatQty(p.qty, product.unit) : p.qty} · lãi ${formatVnd(profit)}${
                    p.revenue ? ` (${formatPercent(profit / p.revenue)})` : ""
                  }`}
                />
              </ListItem>
            );
          }}
        />
      )}
    </Card>
  );

  const lossTab = (
    <div className="space-y-4">
      <Card title="Hao hụt theo nguồn hàng" loading={productions.loading || receipts.loading}>
        {lossGroups.length === 0 ? (
          <Empty description="Chưa có lần làm sạch nào trong kỳ" />
        ) : (
          <ItemList
            dataSource={lossGroups}
            rowKey={(g) => g.source}
            renderItem={(g) => (
              <ListItem extra={<div className="text-right font-semibold">{formatPercent(g.lossRate)}</div>}>
                <ListItemMeta
                  title={sourceLabel(g.source)}
                  description={`${g.count} lần · ${formatQty(g.inputQty, "g")} thô · hao ${formatQty(g.lossQty, "g")}`}
                />
              </ListItem>
            )}
          />
        )}
        <div className="mt-2 text-xs text-muted">Nguồn hàng xác định theo phiếu nhập gần nhất của yến thô đầu vào.</div>
      </Card>
      <Card title="Các lần làm sạch" loading={productions.loading}>
        {cleanings.length === 0 ? (
          <Empty description="Chưa có lần làm sạch nào trong kỳ" />
        ) : (
          <ItemList
            dataSource={cleanings}
            renderItem={(p) => (
              <ListItem extra={<div className="text-right font-semibold">{formatPercent(p.lossRate)}</div>}>
                <ListItemMeta
                  title={p.inputs.map((l) => products.byId.get(l.productId)?.name ?? "Sản phẩm đã xóa").join(", ")}
                  description={`${formatDate(p.date)} · ${formatQty(p.inputs.reduce((s, l) => s + l.qty, 0), "g")} → hao ${formatQty(p.lossQty, "g")}`}
                />
              </ListItem>
            )}
          />
        )}
      </Card>
    </div>
  );

  const debtTab = (
    <Card loading={debtors.loading} title={`Tổng nợ ${formatVnd(totalDebt)}`}>
      {debtors.data.length === 0 ? (
        <Empty description="Không có khách nào đang nợ" />
      ) : (
        <ItemList
          dataSource={debtors.data}
          renderItem={(c) => (
            <Link href={`/khach-hang/${c.id}`} className="text-ink">
              <ListItem
                extra={
                  <span className="flex items-center gap-2 font-medium text-debt">
                    {formatVnd(c.debtBalance ?? 0)}
                    <RightOutlined className="text-xs text-muted" />
                  </span>
                }
              >
                <ListItemMeta title={c.name} description={[c.phone, c.lastPurchaseAt && `mua gần nhất ${formatDate(c.lastPurchaseAt)}`].filter(Boolean).join(" · ")} />
              </ListItem>
            </Link>
          )}
        />
      )}
      <div className="mt-2 text-xs text-muted">Số dư hiện tại; bấm vào khách để xem lịch sử bán nợ và thu nợ.</div>
    </Card>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Báo cáo</h1>
        <a href={exportUrl} download>
          <Button icon={<DownloadOutlined />}>Xuất Excel</Button>
        </a>
      </div>
      <PeriodPicker value={period} onChange={setPeriod} today={today} />

      <section className="hero-card">
        <div className="text-sm text-brand-tint">Lãi ròng {range.label.toLowerCase()}</div>
        <div className="text-3xl font-semibold">{formatVnd(totals.netProfit)}</div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="hero-chip">Doanh thu {formatVnd(totals.revenue)}</span>
          <span className="hero-chip">Lãi gộp {formatVnd(totals.grossProfit)}</span>
          <span className="hero-chip">Chi phí {formatVnd(totals.expenses)}</span>
        </div>
      </section>

      <Tabs
        items={[
          { key: "profit", label: "Lãi lỗ", children: profitTab },
          { key: "channel", label: "Theo kênh", children: channelTab },
          { key: "product", label: "Theo sản phẩm", children: productTab },
          { key: "loss", label: "Hao hụt", children: lossTab },
          { key: "debt", label: "Công nợ", children: debtTab },
        ]}
      />
    </div>
  );
}
