"use client";

import { EditOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Form, Input, List, Modal, Result, Segmented, Tabs, Tag } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/common/date-field";
import { MoneyInput } from "@/components/common/money-input";
import { useRunAction } from "@/components/common/use-run-action";
import { VoidModal } from "@/components/common/void-modal";
import { CustomerDrawer } from "@/components/customers/customer-drawer";
import { useShop } from "@/components/shop/shop-provider";
import { useCustomerPayments, useCustomers, useCustomerSales } from "@/hooks/use-shop-data";
import { formatDate, todayVN } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { CUSTOMER_TYPE_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_METHODS, type PaymentDoc, type PaymentMethod } from "@/lib/domain/models";
import { formatVnd } from "@/lib/domain/money";
import { createPaymentAction, voidPaymentAction } from "@/server/actions/sales";

interface PaymentValues {
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

  const customer = customers.byId.get(id);
  if (customers.loading) return <Card loading />;
  if (!customer) {
    return <Result status="404" title="Không tìm thấy khách hàng" extra={<Link href="/khach-hang"><Button>Về danh sách</Button></Link>} />;
  }
  const debt = customer.debtBalance ?? 0;

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

      <div className="rounded-3xl bg-brand p-5 text-white">
        <div className="text-sm text-brand-tint">Đang nợ</div>
        <div className="text-3xl font-semibold">{formatVnd(debt)}</div>
        <div className="mt-1 text-sm text-brand-tint">Đã mua {formatVnd(customer.totalSpent ?? 0)}</div>
        {debt > 0 && (
          <Button
            className="mt-4 border-none! bg-white! text-brand!"
            size="large"
            block
            onClick={() => {
              form.setFieldsValue({ amount: debt, method: "transfer", date: todayVN(), note: "" });
              setPaying(newId());
            }}
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
                  <List
                    dataSource={sales.data}
                    renderItem={(s) => (
                      <List.Item extra={s.status === "voided" ? <Tag>Đã hủy</Tag> : s.debt > 0 ? <Tag color="error">nợ {formatVnd(s.debt)}</Tag> : null}>
                        <List.Item.Meta
                          title={<span className={s.status === "voided" ? "line-through opacity-60" : ""}>{s.code}</span>}
                          description={`${formatDate(s.date)} · ${formatVnd(s.total)}`}
                        />
                      </List.Item>
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
                  <List
                    dataSource={payments.data}
                    renderItem={(p) => (
                      <List.Item
                        actions={
                          p.status === "active"
                            ? [<Button key="void" danger size="small" onClick={() => setVoiding(p)}>Hủy</Button>]
                            : [<Tag key="voided">Đã hủy</Tag>]
                        }
                      >
                        <List.Item.Meta
                          title={<span className={p.status === "voided" ? "line-through opacity-60" : ""}>{formatVnd(p.amount)}</span>}
                          description={[formatDate(p.date), PAYMENT_METHOD_LABEL[p.method], p.note, p.voidReason && `Lý do hủy: ${p.voidReason}`]
                            .filter(Boolean)
                            .join(" · ")}
                        />
                      </List.Item>
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
              createPaymentAction(shop.id, { id: paying, customerId: customer.id, ...values, note: values.note ?? "" }),
              { success: "Đã ghi phiếu thu", form },
            );
            setSaving(false);
            if (ok) setPaying(null);
          }}
        >
          <Form.Item name="amount" label="Số tiền" rules={[{ required: true, type: "number", min: 1, message: "Nhập số tiền" }]}>
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
