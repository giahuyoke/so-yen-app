"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, InputNumber, Segmented, Select } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/common/date-field";
import { MoneyInput } from "@/components/common/money-input";
import { useRunAction } from "@/components/common/use-run-action";
import { ProductSelect } from "@/components/inventory/product-select";
import { useShop } from "@/components/shop/shop-provider";
import { useProducts, useSuppliers } from "@/hooks/use-shop-data";
import { unitCostOf } from "@/lib/domain/costing";
import { todayVN } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { RECEIPT_ALLOWED_KINDS, RECEIPT_KIND_LABEL, RECEIPT_KINDS, type ReceiptKind } from "@/lib/domain/models";
import { formatVnd } from "@/lib/domain/money";
import { createReceiptAction } from "@/server/actions/inventory";

interface Values {
  kind: ReceiptKind;
  date: string;
  supplierId?: string;
  note?: string;
  lines: { productId?: string; qty?: number; totalCost?: number | null }[];
}

export default function ReceiptPage() {
  const { shop } = useShop();
  const router = useRouter();
  const run = useRunAction();
  const products = useProducts();
  const suppliers = useSuppliers();
  const [form] = Form.useForm<Values>();
  const [id] = useState(newId);
  const [saving, setSaving] = useState(false);
  const kind = Form.useWatch("kind", form) ?? "harvest";
  const lines = Form.useWatch("lines", form) ?? [];
  const total = lines.reduce((sum, l) => sum + (l?.totalCost ?? 0), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Nhập kho</h1>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ kind: "harvest", date: todayVN(), lines: [{}] }}
        onFinish={async (values) => {
          setSaving(true);
          const ok = await run(
            createReceiptAction(shop.id, {
              id,
              kind: values.kind,
              date: values.date,
              supplierId: values.kind === "purchase" ? (values.supplierId ?? null) : null,
              note: values.note ?? "",
              lines: values.lines.map((l) => ({
                productId: l.productId,
                qty: l.qty,
                totalCost: values.kind === "purchase" ? (l.totalCost ?? 0) : 0,
              })),
            }),
            { success: "Đã nhập kho", form },
          );
          setSaving(false);
          if (ok) router.push("/kho");
        }}
      >
        <Card>
          <Form.Item name="kind">
            <Segmented<ReceiptKind> block options={RECEIPT_KINDS.map((k) => ({ value: k, label: RECEIPT_KIND_LABEL[k] }))} />
          </Form.Item>
          <Form.Item name="date" label="Ngày">
            <DateField />
          </Form.Item>
          {kind === "purchase" && (
            <Form.Item name="supplierId" label="Nhà cung cấp">
              <Select
                allowClear
                placeholder="Chọn (không bắt buộc)"
                options={suppliers.data.map((s) => ({ value: s.id, label: s.name }))}
                showSearch={{ optionFilterProp: "label" }}
              />
            </Form.Item>
          )}
        </Card>

        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <div className="mt-4 space-y-3">
              {fields.map((field) => {
                const line = lines[field.name];
                const product = line?.productId ? products.byId.get(line.productId) : undefined;
                return (
                  <Card
                    key={field.key}
                    size="small"
                    extra={fields.length > 1 && <Button type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />}
                  >
                    <Form.Item name={[field.name, "productId"]} label="Sản phẩm" rules={[{ required: true, message: "Chọn sản phẩm" }]}>
                      <ProductSelect products={products.data} kinds={RECEIPT_ALLOWED_KINDS[kind]} />
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-3">
                      <Form.Item name={[field.name, "qty"]} label="Số lượng" rules={[{ required: true, message: "Nhập số lượng" }]}>
                        <InputNumber className="w-full!" min={1} precision={0} suffix={product?.unit === "piece" ? "cái" : "g"} />
                      </Form.Item>
                      {kind === "purchase" && (
                        <Form.Item
                          name={[field.name, "totalCost"]}
                          label="Thành tiền"
                          rules={[{ required: true, type: "number", min: 0, message: "Nhập số tiền" }]}
                          extra={line?.qty && line?.totalCost ? `≈ ${formatVnd(unitCostOf(line.totalCost, line.qty))}/${product?.unit === "piece" ? "cái" : "g"}` : undefined}
                        >
                          <MoneyInput />
                        </Form.Item>
                      )}
                    </div>
                  </Card>
                );
              })}
              <Button block icon={<PlusOutlined />} onClick={() => add({})}>Thêm dòng</Button>
            </div>
          )}
        </Form.List>

        <Card className="mt-4!">
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          {kind === "purchase" && <div className="mb-3 text-lg font-semibold">Tổng: {formatVnd(total)}</div>}
          <Button type="primary" htmlType="submit" size="large" block loading={saving}>Lưu phiếu nhập</Button>
        </Card>
      </Form>
    </div>
  );
}
