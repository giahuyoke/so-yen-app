"use client";

import { Form, Input, Modal, Segmented, Select } from "antd";
import { useEffect, useRef, useState } from "react";
import { DateField } from "@/components/common/date-field";
import { MoneyInput } from "@/components/common/money-input";
import { useRunAction } from "@/components/common/use-run-action";
import { useShop } from "@/components/shop/shop-provider";
import { formatDate, todayVN } from "@/lib/domain/dates";
import { remainingDebtBySale } from "@/lib/domain/debt";
import { newId } from "@/lib/domain/ids";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHODS, type Customer, type PaymentMethod, type SaleDoc } from "@/lib/domain/models";
import { formatVnd } from "@/lib/domain/money";
import { createPaymentAction } from "@/server/actions/sales";

/** Giá trị "Thu chung" của ô chọn đơn (Select của antd không nhận null). */
const GENERAL = "";

interface PaymentValues {
  saleId: string;
  amount: number | null;
  method: PaymentMethod;
  date: string;
  note?: string;
}

/** Yêu cầu mở form thu nợ; `saleId` null là thu chung. */
export interface PaymentRequest {
  saleId: string | null;
}

/**
 * Form thu nợ của một khách. `sales` là các đơn gần đây của khách, dùng để tính
 * số còn nợ từng đơn và cho chọn đơn được trả.
 */
export function PaymentModal({
  customer,
  sales,
  request,
  onClose,
}: {
  customer: Customer;
  sales: SaleDoc[];
  request: PaymentRequest | null;
  onClose: () => void;
}) {
  const { shop } = useShop();
  const run = useRunAction();
  const [form] = Form.useForm<PaymentValues>();
  // Mã phiếu mới mỗi lần mở form; gửi lại cùng mã (bấm Lưu hai lần) không thu hai lần.
  const id = useRef(newId());
  const [saving, setSaving] = useState(false);
  const paySaleId = Form.useWatch("saleId", form) || null;

  const debt = customer.debtBalance ?? 0;
  const remaining = remainingDebtBySale(sales, debt);
  // Đơn còn nợ, cũ nhất trước: thứ tự mà phiếu thu chung sẽ trừ vào.
  const owing = sales.filter((s) => remaining.has(s.id)).sort((a, b) => a.date.localeCompare(b.date));
  const payMax = paySaleId ? (remaining.get(paySaleId) ?? 0) : debt;
  const amountFor = (saleId: string | null) => (saleId ? (remaining.get(saleId) ?? 0) : debt);

  // Mỗi lần mở: phiếu mới, điền sẵn đơn được chọn và số tiền còn nợ.
  useEffect(() => {
    if (!request) return;
    id.current = newId();
    form.setFieldsValue({
      saleId: request.saleId ?? GENERAL,
      amount: amountFor(request.saleId),
      method: "transfer",
      date: todayVN(),
      note: "",
    });
    // Chỉ chạy khi mở form; số liệu nợ đổi sau đó không được ghi đè lên ô người dùng đang sửa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  return (
    <Modal
      open={!!request}
      title={`Thu nợ ${customer.name}`}
      okText="Lưu phiếu thu"
      cancelText="Đóng"
      okButtonProps={{ loading: saving }}
      forceRender
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={async (values) => {
          setSaving(true);
          const ok = await run(
            createPaymentAction(shop.id, {
              id: id.current,
              customerId: customer.id,
              ...values,
              saleId: values.saleId || null,
              note: values.note ?? "",
            }),
            { success: "Đã ghi phiếu thu", form },
          );
          setSaving(false);
          if (ok) onClose();
        }}
      >
        <Form.Item name="saleId" label="Trả cho đơn" extra={paySaleId ? undefined : "Thu chung được trừ vào đơn nợ cũ nhất trước."}>
          <Select<string>
            options={[
              { value: GENERAL, label: "Thu chung" },
              ...owing.map((s) => ({ value: s.id, label: `${s.code} · ${formatDate(s.date)} · còn nợ ${formatVnd(remaining.get(s.id) ?? 0)}` })),
            ]}
            onChange={(saleId) => form.setFieldValue("amount", amountFor(saleId || null))}
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
  );
}
