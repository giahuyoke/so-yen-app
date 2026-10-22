"use client";

import { App, Button, Drawer, Form, Input, Segmented } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useShop } from "@/components/shop/shop-provider";
import { CUSTOMER_TYPE_LABEL, CUSTOMER_TYPES, type Customer, type CustomerType } from "@/lib/domain/models";
import { saveCustomer, type CustomerValues } from "@/lib/firebase/customers";

interface CustomerDrawerProps {
  open: boolean;
  customer: Customer | null;
  /** Tên gợi ý khi tạo nhanh từ form bán hàng. */
  initialName?: string;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

export function CustomerDrawer({ open, customer, initialName, onClose, onSaved }: CustomerDrawerProps) {
  const { shop } = useShop();
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm<CustomerValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: customer?.name ?? initialName ?? "",
      phone: customer?.phone ?? "",
      type: customer?.type ?? "retail",
      note: customer?.note ?? "",
    });
  }, [customer, form, initialName, open]);

  return (
    <Drawer open={open} onClose={onClose} title={customer ? "Sửa khách hàng" : "Khách hàng mới"}>
      <Form
        form={form}
        layout="vertical"
        onFinish={async (values) => {
          if (!user) return;
          setSaving(true);
          try {
            const id = await saveCustomer(shop.id, user.uid, customer?.id ?? null, values);
            void message.success("Đã lưu khách hàng");
            onSaved?.(id);
            onClose();
          } catch {
            void message.error("Không lưu được. Kiểm tra lại thông tin.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Form.Item name="name" label="Tên" rules={[{ required: true, whitespace: true, max: 100, message: "Nhập tên khách" }]}>
          <Input placeholder="VD: Chị Lan Quận 7" />
        </Form.Item>
        <Form.Item name="phone" label="Số điện thoại" rules={[{ max: 20 }]}>
          <Input inputMode="tel" />
        </Form.Item>
        <Form.Item name="type" label="Loại khách">
          <Segmented<CustomerType> block options={CUSTOMER_TYPES.map((t) => ({ value: t, label: CUSTOMER_TYPE_LABEL[t] }))} />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú" rules={[{ max: 500 }]}>
          <Input.TextArea rows={3} placeholder="VD: thích yến tổ đẹp, mua dịp Tết" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={saving}>Lưu</Button>
      </Form>
    </Drawer>
  );
}
