"use client";

import { EditOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Result, Tabs, Tag } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ItemList, ListItem, ListItemMeta } from "@/components/common/item-list";
import { VoidMenu } from "@/components/common/row-menu";
import { useRunAction } from "@/components/common/use-run-action";
import { VoidModal } from "@/components/common/void-modal";
import { CustomerDrawer } from "@/components/customers/customer-drawer";
import { PaymentModal, type PaymentRequest } from "@/components/customers/payment-modal";
import { DebtTag } from "@/components/sales/debt-tag";
import { useShop } from "@/components/shop/shop-provider";
import { useCustomerPayments, useCustomers, useCustomerSales } from "@/hooks/use-shop-data";
import { formatDate } from "@/lib/domain/dates";
import { remainingDebtBySale } from "@/lib/domain/debt";
import { CUSTOMER_TYPE_LABEL, PAYMENT_METHOD_LABEL, type PaymentDoc } from "@/lib/domain/models";
import { formatVnd } from "@/lib/domain/money";
import { voidPaymentAction } from "@/server/actions/sales";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { shop } = useShop();
  const run = useRunAction();
  const customers = useCustomers();
  const sales = useCustomerSales(id);
  const payments = useCustomerPayments(id);
  const [editOpen, setEditOpen] = useState(false);
  const [paying, setPaying] = useState<PaymentRequest | null>(null);
  const [voiding, setVoiding] = useState<PaymentDoc | null>(null);

  const customer = customers.byId.get(id);
  if (customers.loading) return <Card loading />;
  if (!customer) {
    return <Result status="404" title="Không tìm thấy khách hàng" extra={<Link href="/khach-hang"><Button>Về danh sách</Button></Link>} />;
  }
  const debt = customer.debtBalance ?? 0;
  const remaining = remainingDebtBySale(sales.data, debt);
  const saleCode = new Map(sales.data.map((s) => [s.id, s.code]));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <div className="text-muted">
            {[CUSTOMER_TYPE_LABEL[customer.type], customer.phone].filter(Boolean).join(" · ")}
          </div>
          {customer.note && <div className="mt-1">{customer.note}</div>}
        </div>
        <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>Sửa</Button>
      </div>

      <div className="hero-card">
        <div className="text-sm text-brand-tint">Đang nợ</div>
        <div className="text-3xl font-semibold">{formatVnd(debt)}</div>
        <div className="mt-1 text-sm text-brand-tint">Đã mua {formatVnd(customer.totalSpent ?? 0)}</div>
        {debt > 0 && (
          <Button className="mt-4 border-none! bg-white! text-brand!" size="large" block onClick={() => setPaying({ saleId: null })}>
            Thu nợ
          </Button>
        )}
      </div>

      <Tabs
        items={[
          {
            key: "sales",
            label: "Đơn hàng",
            children: (
              <Card loading={sales.loading}>
                {sales.data.length === 0 ? (
                  <Empty description="Chưa có đơn" />
                ) : (
                  <ItemList
                    dataSource={sales.data}
                    renderItem={(s) => (
                      <ListItem
                        actions={[
                          ...(remaining.has(s.id)
                            ? [<Button key="pay" size="small" onClick={() => setPaying({ saleId: s.id })}>Thu</Button>]
                            : []),
                          <Link key="open" href={`/ban-hang/${s.id}`} aria-label={`Xem đơn ${s.code}`} className="px-1 text-muted!">
                            <RightOutlined />
                          </Link>,
                        ]}
                      >
                        <Link href={`/ban-hang/${s.id}`} className="block text-ink!">
                          <ListItemMeta
                            title={
                              <span className={s.status === "voided" ? "line-through opacity-60" : ""}>
                                {s.code}
                                {s.status === "voided" && <Tag className="ml-2!">Đã hủy</Tag>}
                              </span>
                            }
                            description={
                              <>
                                <div>{formatDate(s.date)} · {formatVnd(s.total)}</div>
                                <DebtTag className="mt-1! mx-0!" sale={s} remaining={remaining.get(s.id) ?? 0} loading={sales.loading} />
                              </>
                            }
                          />
                        </Link>
                      </ListItem>
                    )}
                  />
                )}
              </Card>
            ),
          },
          {
            key: "payments",
            label: "Thu nợ",
            children: (
              <Card loading={payments.loading}>
                {payments.data.length === 0 ? (
                  <Empty description="Chưa có phiếu thu" />
                ) : (
                  <ItemList
                    dataSource={payments.data}
                    renderItem={(p) => (
                      <ListItem
                        actions={
                          p.status === "active"
                            ? [<VoidMenu key="void" label="Hủy phiếu thu" onVoid={() => setVoiding(p)} />]
                            : [<Tag key="voided">Đã hủy</Tag>]
                        }
                      >
                        <ListItemMeta
                          title={<span className={p.status === "voided" ? "line-through opacity-60" : ""}>{formatVnd(p.amount)}</span>}
                          description={[
                            formatDate(p.date),
                            PAYMENT_METHOD_LABEL[p.method],
                            p.saleId ? `cho đơn ${saleCode.get(p.saleId) ?? p.saleId}` : "thu chung",
                            p.note,
                            p.voidReason && `Lý do hủy: ${p.voidReason}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        />
                      </ListItem>
                    )}
                  />
                )}
              </Card>
            ),
          },
        ]}
      />

      <PaymentModal customer={customer} sales={sales.data} request={paying} onClose={() => setPaying(null)} />

      <VoidModal
        key={voiding?.id ?? "none"}
        open={!!voiding}
        description="Số tiền của phiếu này sẽ được cộng lại vào công nợ của khách."
        onCancel={() => setVoiding(null)}
        onConfirm={async (reason) => {
          if (!voiding) return false;
          const ok = await run(voidPaymentAction(shop.id, { id: voiding.id, reason }), { success: "Đã hủy phiếu thu" });
          if (ok) setVoiding(null);
          return !!ok;
        }}
      />

      <CustomerDrawer open={editOpen} customer={customer} onClose={() => setEditOpen(false)} />
    </div>
  );
}
