"use client";

import { EditOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Form, Input, Modal, Result, Segmented, Select, Tabs, Tag } from "antd";
import { ItemList, ListItem, ListItemMeta } from "@/components/common/item-list";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/common/date-field";
import { MoneyInput } from "@/components/common/money-input";
import { useRunAction } from "@/components/common/use-run-action";
import { VoidModal } from "@/components/common/void-modal";
import { DebtTag } from "@/components/sales/debt-tag";
import { CustomerDrawer } from "@/components/customers/customer-drawer";
import { useShop } from "@/components/shop/shop-provider";
import { useCustomerPayments, useCustomers, useCustomerSales } from "@/hooks/use-shop-data";
import { formatDate, todayVN } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { CUSTOMER_TYPE_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_METHODS, type PaymentDoc, type PaymentMethod } from "@/lib/domain/models";
import { remainingDebtBySale } from "@/lib/domain/debt";
import { formatVnd } from "@/lib/domain/money";
import { createPaymentAction, voidPaymentAction } from "@/server/actions/sales";

/** Giá trị "Thu chung" của ô chọn đơn (Select của antd không nhận null). */
const GENERAL = "";

interface PaymentValues {
  saleId: string;
  amount: number | null;
  method: PaymentMethod;
  date: string;
  note?: string;
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { shop } = useShop();
  const run = useRunAction();
  const customers = useCustomers();
  const sales = useCustomerSales(id);
  const payments = useCustomerPayments(id);
  const [editOpen, setEditOpen] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [voiding, setVoiding] = useState<PaymentDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<PaymentValues>();
  const paySaleId = Form.useWatch("saleId", form) || null;

  const customer = customers.byId.get(id);
  if (customers.loading) return <Card loading />;
  if (!customer) {
    return <Result status="404" title="Không tìm thấy khách hàng" extra={<Link href="/khach-hang"><Button>Về danh sách</Button></Link>} />;
  }
  const debt = customer.debtBalance ?? 0;
  const remaining = remainingDebtBySale(sales.data, debt);
  const payMax = paySaleId ? (remaining.get(paySaleId) ?? 0) : debt;
  const saleCode = new Map(sales.data.map((s) => [s.id, s.code]));
  // Đơn còn nợ, cũ nhất trước: thứ tự mà phiếu thu chung sẽ trừ vào.
  const owing = sales.data.filter((s) => remaining.has(s.id)).reverse();

  const openPayment = (saleId: string | null) => {
    form.setFieldsValue({
      saleId: saleId ?? GENERAL,
      amount: saleId ? (remaining.get(saleId) ?? 0) : debt,
      method: "transfer",
      date: todayVN(),
      note: "",
    });
    setPaying(newId());
  };

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
          <Button
            className="mt-4 border-none! bg-white! text-brand!"
            size="large"
            block
            onClick={() => openPayment(null)}
          >
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
                        extra={s.status === "voided" ? <Tag>Đã hủy</Tag> : undefined}
                        actions={remaining.has(s.id) ? [<Button key="pay" size="small" onClick={() => openPayment(s.id)}>Thu</Button>] : undefined}
                      >
                        <ListItemMeta
                          title={<span className={s.status === "voided" ? "line-through opacity-60" : ""}>{s.code}</span>}
                          description={
                            <>
                              {formatDate(s.date)} · {formatVnd(s.total)}
                              <DebtTag sale={s} remaining={remaining.get(s.id) ?? 0} loading={sales.loading} />
                            </>
                          }
                        />
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
                            ? [<Button key="void" danger size="small" onClick={() => setVoiding(p)}>Hủy</Button>]
                            : [<Tag key="voided">Đã hủy</Tag>]
                        }
                      >
                        <ListItemMeta
                          title={<span className={p.status === "voided" ? "line-through opacity-60" : ""}>{formatVnd(p.amount)}</span>}
                          description={[
                            formatDate(p.date),
                            PAYMENT_METHOD_LABEL[p.method],
                            p.saleId ? `cho đơn ${saleCode.get(p.saleId) ?? p.saleId}` : "thu chung",
                            p.note, p.voidReason && `Lý do hủy: ${p.voidReason}`]
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

      <Modal
        open={!!paying}
        title={`Thu nợ ${customer.name}`}
        okText="Lưu phiếu thu"
        cancelText="Đóng"
        okButtonProps={{ loading: saving }}
        forceRender
        onCancel={() => setPaying(null)}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (!paying) return;
            setSaving(true);
            const ok = await run(
              createPaymentAction(shop.id, { id: paying, customerId: customer.id, ...values, saleId: values.saleId || null, note: values.note ?? "" }),
              { success: "Đã ghi phiếu thu", form },
            );
            setSaving(false);
            if (ok) setPaying(null);
          }}
        >
          <Form.Item
            name="saleId"
            label="Trả cho đơn"
            extra={paySaleId ? undefined : "Thu chung được trừ vào đơn nợ cũ nhất trước."}
          >
            <Select<string>
              options={[
                { value: GENERAL, label: "Thu chung" },
                ...owing.map((s) => ({ value: s.id, label: `${s.code} · ${formatDate(s.date)} · còn nợ ${formatVnd(remaining.get(s.id) ?? 0)}` })),
              ]}
              onChange={(saleId) => form.setFieldValue("amount", saleId ? (remaining.get(saleId) ?? 0) : debt)}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Số tiền"
            rules={[
              { required: true, type: "number", min: 1, message: "Nhập số tiền" },
              {
                type: "number",
                max: payMax,
                message: paySaleId ? `Đơn này chỉ còn nợ ${formatVnd(payMax)}` : `Khách chỉ còn nợ ${formatVnd(payMax)}`,
              },
            ]}
          >
            <MoneyInput />
          </Form.Item>
          <Form.Item name="method" label="Hình thức">
            <Segmented<PaymentMethod> block options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))} />
          </Form.Item>
          <Form.Item name="date" label="Ngày">
            <DateField />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

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
