"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Descriptions, Form, Input, InputNumber, Segmented } from "antd";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DateField } from "@/components/common/date-field";
import { useRunAction } from "@/components/common/use-run-action";
import { ProductSelect } from "@/components/inventory/product-select";
import { useShop } from "@/components/shop/shop-provider";
import { useProducts } from "@/hooks/use-shop-data";
import { todayVN } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import {
  PRODUCTION_INPUT_KINDS,
  PRODUCTION_KIND_LABEL,
  PRODUCTION_KINDS,
  PRODUCTION_OUTPUT_KIND,
  type ProductionKind,
} from "@/lib/domain/models";
import { formatQty, formatVnd } from "@/lib/domain/money";
import { computeProduction } from "@/lib/domain/production";
import { createProductionAction } from "@/server/actions/inventory";

interface Line {
  productId?: string;
  qty?: number;
  gramPerUnit?: number;
}

interface Values {
  kind: ProductionKind;
  date: string;
  note?: string;
  inputs: Line[];
  outputs: Line[];
}

export default function ProductionPage() {
  const { shop } = useShop();
  const router = useRouter();
  const run = useRunAction();
  const products = useProducts();
  const [form] = Form.useForm<Values>();
  const [id] = useState(newId);
  const [saving, setSaving] = useState(false);
  const kind = Form.useWatch("kind", form) ?? "clean";
  const inputs = Form.useWatch("inputs", form);
  const outputs = Form.useWatch("outputs", form);

  const preview = useMemo(() => {
    const ins = (inputs ?? []).flatMap((l) => {
      const p = l?.productId ? products.byId.get(l.productId) : undefined;
      return p && l.qty ? [{ qty: l.qty, totalCost: l.qty * p.avgCost, unit: p.unit, product: p }] : [];
    });
    const outs = (outputs ?? []).flatMap((l) => {
      const p = l?.productId ? products.byId.get(l.productId) : undefined;
      return p && l.qty ? [{ qty: l.qty, unit: p.unit, gramPerUnit: p.unit === "g" ? 1 : (l.gramPerUnit ?? 0), product: p }] : [];
    });
    if (!ins.length || !outs.length || outs.some((o) => o.gramPerUnit < 1)) return null;
    return { ins, outs, result: computeProduction(kind, ins, outs) };
  }, [inputs, kind, outputs, products.byId]);

  const shortages = preview?.ins.filter((i) => i.qty > i.product.stockQty) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Chế biến</h1>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ kind: "clean", date: todayVN(), inputs: [{}], outputs: [{}] }}
        onValuesChange={(changed: Partial<Values>) => {
          if (changed.kind) form.setFieldsValue({ inputs: [{}], outputs: [{}] });
        }}
        onFinish={async (values) => {
          setSaving(true);
          const ok = await run(
            createProductionAction(shop.id, {
              id,
              kind: values.kind,
              date: values.date,
              note: values.note ?? "",
              inputs: values.inputs.map((l) => ({ productId: l.productId, qty: l.qty })),
              outputs: values.outputs.map((l) => {
                const unit = l.productId ? products.byId.get(l.productId)?.unit : undefined;
                return { productId: l.productId, qty: l.qty, gramPerUnit: unit === "g" ? 1 : l.gramPerUnit };
              }),
            }),
            { success: "Đã lưu phiếu chế biến", form },
          );
          setSaving(false);
          if (ok) router.push("/kho");
        }}
      >
        <Card>
          <Form.Item name="kind">
            <Segmented<ProductionKind> block options={PRODUCTION_KINDS.map((k) => ({ value: k, label: PRODUCTION_KIND_LABEL[k] }))} />
          </Form.Item>
          <Form.Item name="date" label="Ngày">
            <DateField />
          </Form.Item>
        </Card>

        <LineList title="Nguyên liệu đầu vào" name="inputs" kinds={PRODUCTION_INPUT_KINDS[kind]} products={products} lines={inputs} />
        <LineList title="Thành phẩm đầu ra" name="outputs" kinds={[PRODUCTION_OUTPUT_KIND[kind]]} products={products} lines={outputs} isOutput />

        {preview && (
          <Card title="Xem trước" className="mt-4!">
            {shortages.map((s) => (
              <Alert
                key={s.product.id}
                className="mb-3!"
                type="error"
                showIcon
                title={`${s.product.name} chỉ còn ${formatQty(s.product.stockQty, s.product.unit)}`}
              />
            ))}
            {kind === "clean" && preview.result.lossQty < 0 && (
              <Alert className="mb-3!" type="error" showIcon title="Khối lượng sau làm sạch lớn hơn trước khi làm sạch." />
            )}
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Tổng giá vốn đầu vào">{formatVnd(preview.result.totalInputCost)}</Descriptions.Item>
              {kind === "clean" && (
                <Descriptions.Item label="Hao hụt">
                  {formatQty(preview.result.lossQty, "g")} ({(preview.result.lossRate * 100).toFixed(1)}%)
                </Descriptions.Item>
              )}
              {preview.outs.map((o, i) => (
                <Descriptions.Item key={o.product.id} label={o.product.name}>
                  {formatVnd(preview.result.unitCosts[i])}/{o.unit === "g" ? "g" : "cái"} · tổng {formatVnd(preview.result.outputCosts[i])}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        )}

        <Card className="mt-4!">
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={saving} disabled={shortages.length > 0}>
            Lưu phiếu chế biến
          </Button>
        </Card>
      </Form>
    </div>
  );
}

function LineList({
  title,
  name,
  kinds,
  products,
  lines,
  isOutput = false,
}: {
  title: string;
  name: "inputs" | "outputs";
  kinds: Parameters<typeof ProductSelect>[0]["kinds"];
  products: ReturnType<typeof useProducts>;
  lines: Line[] | undefined;
  isOutput?: boolean;
}) {
  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <Card title={title} className="mt-4!">
          <div className="space-y-3">
            {fields.map((field) => {
              const line = lines?.[field.name];
              const product = line?.productId ? products.byId.get(line.productId) : undefined;
              const unitLabel = product?.unit === "piece" ? "cái" : "g";
              return (
                <div key={field.key} className="rounded-xl border border-[#e9e0ce] p-3">
                  <div className="flex gap-2">
                    <Form.Item className="flex-1" name={[field.name, "productId"]} rules={[{ required: true, message: "Chọn sản phẩm" }]}>
                      <ProductSelect products={products.data} kinds={kinds} />
                    </Form.Item>
                    {fields.length > 1 && <Button type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Form.Item name={[field.name, "qty"]} label="Số lượng" rules={[{ required: true, message: "Nhập số lượng" }]}>
                      <InputNumber className="w-full!" min={1} precision={0} suffix={unitLabel} />
                    </Form.Item>
                    {isOutput && product?.unit === "piece" && (
                      <Form.Item
                        name={[field.name, "gramPerUnit"]}
                        label="Gram yến mỗi cái"
                        rules={[{ required: true, message: "Nhập số gram" }]}
                      >
                        <InputNumber className="w-full!" min={1} precision={0} suffix="g" />
                      </Form.Item>
                    )}
                  </div>
                </div>
              );
            })}
            <Button block icon={<PlusOutlined />} onClick={() => add({})}>Thêm dòng</Button>
          </div>
        </Card>
      )}
    </Form.List>
  );
}
