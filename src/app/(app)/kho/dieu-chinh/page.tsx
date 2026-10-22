"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, InputNumber } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/common/date-field";
import { useRunAction } from "@/components/common/use-run-action";
import { ProductSelect } from "@/components/inventory/product-select";
import { useShop } from "@/components/shop/shop-provider";
import { useProducts } from "@/hooks/use-shop-data";
import { todayVN } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { PRODUCT_KINDS } from "@/lib/domain/models";
import { createAdjustmentAction } from "@/server/actions/inventory";

interface Values {
  date: string;
  reason: string;
  lines: { productId?: string; qtyDelta?: number }[];
}

export default function AdjustmentPage() {
  const { shop } = useShop();
  const router = useRouter();
  const run = useRunAction();
  const products = useProducts();
  const [form] = Form.useForm<Values>();
  const [id] = useState(newId);
  const [saving, setSaving] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Điều chỉnh kho</h1>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ date: todayVN(), lines: [{}] }}
        onFinish={async (values) => {
          setSaving(true);
          const ok = await run(createAdjustmentAction(shop.id, { id, ...values }), { success: "Đã điều chỉnh kho", form });
          setSaving(false);
          if (ok) router.push("/kho");
        }}
      >
        <Card>
          <Form.Item name="date" label="Ngày">
            <DateField />
          </Form.Item>
          <Form.Item name="reason" label="Lý do" rules={[{ required: true, whitespace: true, message: "Nhập lý do" }]}>
            <Input placeholder="VD: Kiểm kho cuối tháng thiếu" />
          </Form.Item>
        </Card>
        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <Card title="Sản phẩm" className="mt-4!" extra={<span className="text-xs text-muted">Số âm là giảm kho</span>}>
              <div className="space-y-3">
                {fields.map((field) => (
                  <div key={field.key} className="flex gap-2">
                    <Form.Item className="flex-1" name={[field.name, "productId"]} rules={[{ required: true, message: "Chọn sản phẩm" }]}>
                      <ProductSelect products={products.data} kinds={[...PRODUCT_KINDS]} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "qtyDelta"]}
                      rules={[{ required: true, message: "Nhập số" }, { validator: async (_, v) => { if (v === 0) throw new Error("Khác 0"); } }]}
                    >
                      <InputNumber className="w-28!" precision={0} placeholder="-20" />
                    </Form.Item>
                    {fields.length > 1 && <Button type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />}
                  </div>
                ))}
                <Button block icon={<PlusOutlined />} onClick={() => add({})}>Thêm dòng</Button>
              </div>
            </Card>
          )}
        </Form.List>
        <Button className="mt-4!" type="primary" htmlType="submit" size="large" block loading={saving}>
          Lưu điều chỉnh
        </Button>
      </Form>
    </div>
  );
}
