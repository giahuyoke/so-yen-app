"use client";

import { CopyOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Result, Tag } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ItemList, ListItem, ListItemMeta } from "@/components/common/item-list";
import { useRunAction } from "@/components/common/use-run-action";
import { VoidModal } from "@/components/common/void-modal";
import { PaymentModal, type PaymentRequest } from "@/components/customers/payment-modal";
import { MetricRow } from "@/components/reports/period-picker";
import { InvoiceButton } from "@/components/sales/invoice-button";
import { useShareSummary } from "@/components/sales/use-share-summary";
import { useShop } from "@/components/shop/shop-provider";
import { useCustomers, useCustomerSales, useProducts, useSale, useSalePayments } from "@/hooks/use-shop-data";
import { formatDate } from "@/lib/domain/dates";
import { remainingDebtBySale } from "@/lib/domain/debt";
import { PAYMENT_METHOD_LABEL, SALE_CHANNEL_LABEL } from "@/lib/domain/models";
import { formatQty, formatUnitPrice, formatVnd } from "@/lib/domain/money";
import { saleSummaryText, type SaleSummary } from "@/lib/domain/sale";
import { voidSaleAction } from "@/server/actions/sales";

/** Khóa truy vấn không khớp đơn nào, dùng cho đơn khách lẻ (hook không được gọi có điều kiện). */
const NO_CUSTOMER = "__none__";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { shop } = useShop();
  const run = useRunAction();
  const sale = useSale(id);
  const products = useProducts();
  const customers = useCustomers();
  const customerId = sale.data?.customerId ?? NO_CUSTOMER;
  const customerSales = useCustomerSales(customerId);
  const payments = useSalePayments(id);
  const [paying, setPaying] = useState<PaymentRequest | null>(null);
  const [voiding, setVoiding] = useState(false);

  const s = sale.data;
  const customer = s?.customerId ? customers.byId.get(s.customerId) : undefined;
  const remaining = s && customer ? (remainingDebtBySale(customerSales.data, customer.debtBalance ?? 0).get(s.id) ?? 0) : 0;
  const saleSummary: SaleSummary | null = s
    ? {
        shopName: shop.name,
        customerName: customer?.name,
        code: s.code,
        date: s.date,
        lines: s.lines.map((l) => {
          const p = products.byId.get(l.productId);
          return { name: p?.name ?? l.productId, unit: p?.unit ?? "g", qty: l.qty, price: l.price };
        }),
        subtotal: s.subtotal,
        discount: s.discount,
        total: s.total,
        paid: s.paid,
        debt: s.debt,
        // Chỉ in phần còn lại khi đã tải xong đơn của khách, tránh hiện "đã thanh toán hết" thoáng qua.
        remainingDebt: customer && !customerSales.loading ? remaining : undefined,
      }
    : null;
  const summary = saleSummary ? saleSummaryText(saleSummary) : "";
  const { canShare, copy, share, summaryRef } = useShareSummary(s?.code ?? "", summary);

  if (sale.loading) return <Card loading />;
  if (!s) {
    return <Result status="404" title="Không tìm thấy đơn bán" extra={<Link href="/ban-hang"><Button>Về danh sách</Button></Link>} />;
  }

  const cogs = s.lines.reduce((sum, l) => sum + l.totalCost, 0);
  const voided = s.status === "voided";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/ban-hang" className="text-sm text-muted!">← Đơn bán</Link>
        <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold">
          <span className={voided ? "line-through opacity-60" : ""}>{s.code}</span>
          {voided && <Tag className="m-0!">Đã hủy</Tag>}
        </h1>
        <div className="text-muted">
          {formatDate(s.date)} · {SALE_CHANNEL_LABEL[s.channel]} ·{" "}
          {customer ? <Link href={`/khach-hang/${customer.id}`}>{customer.name}</Link> : "Khách lẻ"}
        </div>
        {voided && s.voidReason && <div className="mt-1 text-debt">Lý do hủy: {s.voidReason}</div>}
      </div>

      {!voided && s.debt > 0 && (
        <section className="hero-card">
          <div className="text-sm text-brand-tint">{remaining > 0 ? "Đơn còn nợ" : "Đã thu đủ nợ"}</div>
          <div className="text-3xl font-semibold">{formatVnd(remaining)}</div>
          <div className="mt-1 text-sm text-brand-tint">Ghi nợ lúc bán {formatVnd(s.debt)}</div>
          {remaining > 0 && customer && (
            <Button className="mt-4 border-none! bg-white! text-brand!" size="large" block onClick={() => setPaying({ saleId: s.id })}>
              Thu nợ đơn này
            </Button>
          )}
        </section>
      )}

      <Card title="Sản phẩm">
        <ItemList
          dataSource={s.lines}
          rowKey={(_, i) => String(i)}
          renderItem={(l) => {
            const p = products.byId.get(l.productId);
            return (
              <ListItem extra={<span className="font-medium whitespace-nowrap">{formatVnd(l.qty * l.price)}</span>}>
                <ListItemMeta
                  title={p?.name ?? l.productId}
                  description={`${formatQty(l.qty, p?.unit ?? "g")} × ${formatUnitPrice(l.price, p?.unit ?? "g")}`}
                />
              </ListItem>
            );
          }}
        />
        <div className="mt-2 border-t border-line pt-2">
          <MetricRow label="Tạm tính" value={formatVnd(s.subtotal)} />
          {s.discount > 0 && <MetricRow label="Giảm giá" value={`− ${formatVnd(s.discount)}`} />}
          <MetricRow label="Tổng cộng" value={formatVnd(s.total)} strong />
          <MetricRow label="Khách trả lúc bán" value={formatVnd(s.paid)} />
          <MetricRow label="Giá vốn" value={formatVnd(cogs)} />
          <MetricRow label="Lãi gộp" value={formatVnd(s.total - cogs)} tone="brand" />
        </div>
        {s.note && <div className="mt-2 text-sm text-muted">Ghi chú: {s.note}</div>}
      </Card>

      {s.debt > 0 && (
        <Card title="Phiếu thu của đơn" loading={payments.loading}>
          {payments.data.length === 0 ? (
            <Empty description="Chưa có phiếu thu gắn với đơn này" />
          ) : (
            <ItemList
              dataSource={payments.data}
              renderItem={(p) => (
                <ListItem extra={p.status === "voided" ? <Tag className="m-0!">Đã hủy</Tag> : undefined}>
                  <ListItemMeta
                    title={<span className={p.status === "voided" ? "line-through opacity-60" : ""}>{formatVnd(p.amount)}</span>}
                    description={[formatDate(p.date), PAYMENT_METHOD_LABEL[p.method], p.note].filter(Boolean).join(" · ")}
                  />
                </ListItem>
              )}
            />
          )}
          <div className="mt-2 text-xs text-muted">Phiếu thu chung của khách được trừ vào đơn nợ cũ nhất trước, không hiện ở đây.</div>
        </Card>
      )}

      {!voided && (
        <Card title="Gửi khách">
          <pre ref={summaryRef} className="whitespace-pre-wrap rounded-xl bg-brand-soft p-3 font-sans text-sm text-brand-dark">
            {summary}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            {canShare && <Button type="primary" icon={<SendOutlined />} onClick={() => void share()}>Gửi cho khách</Button>}
            <Button type={canShare ? "default" : "primary"} icon={<CopyOutlined />} onClick={() => void copy()}>Sao chép tóm tắt</Button>
            {saleSummary && <InvoiceButton sale={saleSummary} defaultAmount={s.debt > 0 ? remaining : s.total} />}
          </div>
        </Card>
      )}

      {!voided && (
        <div className="text-center">
          <Button type="text" danger onClick={() => setVoiding(true)}>Hủy đơn này</Button>
        </div>
      )}

      {customer && <PaymentModal customer={customer} sales={customerSales.data} request={paying} onClose={() => setPaying(null)} />}

      <VoidModal
        open={voiding}
        description="Hàng sẽ được trả lại kho, doanh thu và công nợ của đơn này bị trừ đi. Đơn vẫn được giữ trong lịch sử."
        onCancel={() => setVoiding(false)}
        onConfirm={async (reason) => {
          const ok = await run(voidSaleAction(shop.id, { id: s.id, reason }), { success: "Đã hủy đơn" });
          if (ok) setVoiding(false);
          return !!ok;
        }}
      />
    </div>
  );
}
