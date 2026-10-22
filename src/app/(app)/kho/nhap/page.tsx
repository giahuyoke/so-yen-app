"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, InputNumber, Result, Segmented, Select } from "antd";
import Link from "next/link";
import { useState } from "react";
import { DateField } from "@/components/common/date-field";
import { MoneyInput } from "@/components/common/money-input";
import { blurActiveField, SubmitBar } from "@/components/common/submit-bar";
import { useRunAction } from "@/components/common/use-run-action";
import { ProductSelect } from "@/components/inventory/product-select";
import { useShop } from "@/components/shop/shop-provider";
import { useProducts, useSuppliers } from "@/hooks/use-shop-data";
import { todayVN } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { RECEIPT_ALLOWED_KINDS, RECEIPT_KIND_LABEL, RECEIPT_KINDS, type ReceiptKind } from "@/lib/domain/models";
import { formatCostPer, formatVnd } from "@/lib/domain/money";
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
  const run = useRunAction();
  const products = useProducts();
  const suppliers = useSuppliers();
  const [form] = Form.useForm<Values>();
  const [id, setId] = useState(newId);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const kind = Form.useWatch("kind", form) ?? "harvest";
  const lines = Form.useWatch("lines", form) ?? [];
  const total = lines.reduce((sum, l) => sum + (l?.totalCost ?? 0), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Nhập kho</h1>
      {done && (
        <Card>
          <Result
            status="success"
            title="Đã nhập kho"
            subTitle={done}
            extra={[
              <Link key="process" href="/kho/che-bien"><Button type="primary">Chế biến ngay</Button></Link>,
              <Button
                key="again"
                onClick={() => {
                  form.resetFields();
                  setId(newId());
                  setDone(null);
                }}
              >
                Nhập phiếu khác
              </Button>,
              <Link key="stock" href="/kho"><Button>Về kho</Button></Link>,
            ]}
          />
        </Card>
      )}
      <Form
        className={done ? "hidden" : undefined}
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
          if (ok) {
            blurActiveField();
            const kindLabel = RECEIPT_KIND_LABEL[values.kind].toLowerCase();
            setDone(`${values.lines.length} dòng · ${kindLabel}${values.kind === "purchase" ? ` · ${formatVnd(total)}` : ""}`);
          }
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
                          extra={line?.qty && line?.totalCost ? `≈ ${formatCostPer(line.totalCost, line.qty, product?.unit ?? "g")}` : undefined}
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
          <Form.Item name="note" label="Ghi chú" className="mb-0!">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Card>

        <SubmitBar
          summary={
            kind === "purchase" ? (
              <>
                <div className="text-muted">Tổng tiền</div>
                <div className="text-base font-semibold whitespace-nowrap">{formatVnd(total)}</div>
              </>
            ) : (
              <div className="text-muted">{lines.filter((l) => l?.productId).length} sản phẩm</div>
            )
          }
        >
          <Button type="primary" htmlType="submit" size="large" loading={saving}>Lưu phiếu nhập</Button>
        </SubmitBar>
      </Form>
    </div>
  );
}
