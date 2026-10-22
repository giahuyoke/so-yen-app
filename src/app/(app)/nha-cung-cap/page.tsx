"use client";

import { PlusOutlined } from "@ant-design/icons";
import { App, Button, Card, Drawer, Empty, Form, Input, List } from "antd";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useShop } from "@/components/shop/shop-provider";
import { useSuppliers } from "@/hooks/use-shop-data";
import type { Supplier } from "@/lib/domain/models";
import { saveSupplier, type SupplierValues } from "@/lib/firebase/suppliers";

export default function SuppliersPage() {
  const { shop } = useShop();
  const { user } = useAuth();
  const { message } = App.useApp();
  const { data: suppliers, loading } = useSuppliers();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<SupplierValues>();

  const openDrawer = (supplier: Supplier | null) => {
    setEditing(supplier);
    form.setFieldsValue({ name: supplier?.name ?? "", phone: supplier?.phone ?? "", note: supplier?.note ?? "" });
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nhà cung cấp</h1>
        <Button icon={<PlusOutlined />} onClick={() => openDrawer(null)}>Thêm</Button>
      </div>

      <Card loading={loading}>
        {suppliers.length === 0 ? (
          <Empty description="Chưa có nhà cung cấp" />
        ) : (
          <List
            dataSource={suppliers}
            renderItem={(s) => (
              <List.Item className="cursor-pointer" onClick={() => openDrawer(s)}>
                <List.Item.Meta title={s.name} description={[s.phone, s.note].filter(Boolean).join(" · ")} />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Drawer open={open} onClose={() => setOpen(false)} title={editing ? "Sửa nhà cung cấp" : "Nhà cung cấp mới"}>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (!user) return;
            setSaving(true);
            try {
              await saveSupplier(shop.id, user.uid, editing?.id ?? null, values);
              void message.success("Đã lưu");
              setOpen(false);
            } catch {
              void message.error("Không lưu được. Kiểm tra lại thông tin.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <Form.Item name="name" label="Tên" rules={[{ required: true, whitespace: true, max: 100, message: "Nhập tên" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ max: 20 }]}>
            <Input inputMode="tel" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú" rules={[{ max: 500 }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={saving}>Lưu</Button>
        </Form>
      </Drawer>
    </div>
  );
}
