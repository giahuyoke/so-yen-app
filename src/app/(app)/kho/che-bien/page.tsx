"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Descriptions, Form, Input, InputNumber, Result, Segmented } from "antd";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DateField } from "@/components/common/date-field";
import { blurActiveField, SubmitBar } from "@/components/common/submit-bar";
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
import { formatCostPer, formatPercent, formatQty, formatVnd } from "@/lib/domain/money";
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

/** Bước thường làm tiếp theo sau mỗi kiểu chế biến. */
const NEXT_KIND: Partial<Record<ProductionKind, ProductionKind>> = { clean: "steam", steam: "pack" };

export default function ProductionPage() {
  const { shop } = useShop();
  const run = useRunAction();
  const products = useProducts();
  const [form] = Form.useForm<Values>();
  const [id, setId] = useState(newId);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ kind: ProductionKind; summary: string } | null>(null);
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

  const restart = (next: ProductionKind) => {
    form.resetFields();
    form.setFieldsValue({ kind: next });
    setId(newId());
    setDone(null);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Chế biến</h1>
      {done && (
        <Card>
          <Result
            status="success"
            title={`Đã lưu phiếu ${PRODUCTION_KIND_LABEL[done.kind].toLowerCase()}`}
            subTitle={done.summary}
            extra={[
              ...(NEXT_KIND[done.kind]
                ? [
                    <Button key="next" type="primary" onClick={() => restart(NEXT_KIND[done.kind]!)}>
                      {PRODUCTION_KIND_LABEL[NEXT_KIND[done.kind]!]} tiếp
                    </Button>,
                  ]
                : []),
              <Button key="again" type={NEXT_KIND[done.kind] ? "default" : "primary"} onClick={() => restart(done.kind)}>
                Phiếu {PRODUCTION_KIND_LABEL[done.kind].toLowerCase()} khác
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
        initialValues={{ kind: "clean", date: todayVN(), inputs: [{}], outputs: [{}] }}
        onValuesChange={(changed: Partial<Values>) => {
          if (changed.kind) form.setFieldsValue({ inputs: [{}], outputs: [{}] });
          // Chọn thành phẩm tính theo cái thì điền sẵn số gram yến mỗi cái đã lưu ở sản phẩm.
          changed.outputs?.forEach((line, index) => {
            const product = line?.productId ? products.byId.get(line.productId) : undefined;
            if (product?.gramPerUnit) form.setFieldValue(["outputs", index, "gramPerUnit"], product.gramPerUnit);
          });
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
          if (ok && preview) {
            blurActiveField();
            const loss = values.kind === "clean" ? ` · hao hụt ${formatQty(preview.result.lossQty, "g")} (${formatPercent(preview.result.lossRate)})` : "";
            setDone({ kind: values.kind, summary: `Giá vốn ${formatVnd(preview.result.totalInputCost)}${loss}` });
          }
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
                  {formatQty(preview.result.lossQty, "g")} ({formatPercent(preview.result.lossRate)})
                </Descriptions.Item>
              )}
              {preview.outs.map((o, i) => (
                <Descriptions.Item key={o.product.id} label={o.product.name}>
                  {formatCostPer(preview.result.outputCosts[i], o.qty, o.unit)} · tổng {formatVnd(preview.result.outputCosts[i])}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        )}

        <Card className="mt-4!">
          <Form.Item name="note" label="Ghi chú" className="mb-0!">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Card>

        <SubmitBar
          summary={
            preview ? (
              <>
                <div className="text-muted">{kind === "clean" ? "Hao hụt" : "Giá vốn đầu vào"}</div>
                <div className={`text-base font-semibold whitespace-nowrap ${shortages.length > 0 ? "text-debt" : ""}`}>
                  {shortages.length > 0
                    ? "Thiếu hàng"
                    : kind === "clean"
                      ? `${formatQty(preview.result.lossQty, "g")} · ${formatPercent(preview.result.lossRate)}`
                      : formatVnd(preview.result.totalInputCost)}
                </div>
              </>
            ) : (
              <div className="text-muted">Nhập đầu vào và đầu ra để xem trước</div>
            )
          }
        >
          <Button type="primary" htmlType="submit" size="large" loading={saving} disabled={shortages.length > 0}>
            Lưu phiếu
          </Button>
        </SubmitBar>
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
                <div key={field.key} className="rounded-xl border border-line p-3">
                  <div className="flex gap-2">
                    <Form.Item className="min-w-0 flex-1" name={[field.name, "productId"]} rules={[{ required: true, message: "Chọn sản phẩm" }]}>
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
