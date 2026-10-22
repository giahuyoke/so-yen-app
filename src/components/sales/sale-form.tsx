"use client";

import { DeleteOutlined, PlusOutlined, UserAddOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, InputNumber, Select } from "antd";
import { useState } from "react";
import { DateField } from "@/components/common/date-field";
import { MoneyInput } from "@/components/common/money-input";
import { SubmitBar } from "@/components/common/submit-bar";
import { useRunAction } from "@/components/common/use-run-action";
import { CustomerDrawer } from "@/components/customers/customer-drawer";
import { ProductSelect } from "@/components/inventory/product-select";
import { SaleDone } from "@/components/sales/sale-done";
import { useShop } from "@/components/shop/shop-provider";
import { useCustomers, useProducts } from "@/hooks/use-shop-data";
import { todayVN } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { SALE_CHANNEL_LABEL, SALE_CHANNELS, SELLABLE_KINDS, type SaleChannel } from "@/lib/domain/models";
import { formatQty, formatVnd, fromDisplayPrice, GRAMS_PER_PRICE_UNIT, priceUnitLabel, toDisplayPrice } from "@/lib/domain/money";
import { computeSale, type SaleSummary } from "@/lib/domain/sale";
import { createSaleAction } from "@/server/actions/sales";

interface Line {
  productId?: string;
  qty?: number;
  /** Giá hiển thị: ₫/100g với hàng tính theo gram, ₫/cái với hàng tính theo cái. */
  price?: number | null;
}

interface Values {
  date: string;
  customerId?: string;
  channel: SaleChannel;
  note?: string;
  lines: Line[];
  discount?: number | null;
  paid?: number | null;
}

export function SaleForm({ onNew }: { onNew: () => void }) {
  const { shop } = useShop();
  const run = useRunAction();
  const products = useProducts();
  const customers = useCustomers();
  const [form] = Form.useForm<Values>();
  const [id] = useState(newId);
  const [saving, setSaving] = useState(false);
  const [customerDrawer, setCustomerDrawer] = useState(false);
  const [done, setDone] = useState<SaleSummary | null>(null);
  // "Khách trả" tự bằng tổng đơn cho tới khi người dùng tự sửa số tiền.
  const [paidTouched, setPaidTouched] = useState(false);

  const unitOf = (productId?: string) => (productId ? products.byId.get(productId)?.unit : undefined) ?? "g";
  /** Giá theo 1 đơn vị lưu kho (₫/g hoặc ₫/cái); có thể lẻ khi đang gõ, chỉ dùng để xem trước. */
  const perUnit = (l?: Line) => (unitOf(l?.productId) === "g" ? (l?.price ?? 0) / GRAMS_PER_PRICE_UNIT : (l?.price ?? 0));
  const totalOf = (v: Partial<Values>) =>
    computeSale((v.lines ?? []).map((l) => ({ qty: l?.qty ?? 0, price: perUnit(l) })), v.discount ?? 0, 0).total;

  const lines = Form.useWatch("lines", form) ?? [];
  const discount = Form.useWatch("discount", form) ?? 0;
  const paid = Form.useWatch("paid", form);
  const customerId = Form.useWatch("customerId", form);
  const totals = computeSale(
    lines.map((l) => ({ qty: l?.qty ?? 0, price: perUnit(l) })),
    discount ?? 0,
    paid ?? 0,
  );

  if (done) return <SaleDone id={id} sale={done} onNew={onNew} />;

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ date: todayVN(), channel: "zalo", lines: [{}], discount: 0 }}
        onValuesChange={(changed: Partial<Values>) => {
          // Chọn sản phẩm thì điền sẵn giá bán gợi ý.
          changed.lines?.forEach((line, index) => {
            const product = line?.productId ? products.byId.get(line.productId) : undefined;
            if (product) form.setFieldValue(["lines", index, "price"], toDisplayPrice(product.suggestedPrice, product.unit));
          });
          if ("paid" in changed) setPaidTouched(true);
          else if (!paidTouched) form.setFieldValue("paid", Math.max(0, totalOf(form.getFieldsValue())));
        }}
        onFinish={async (values) => {
          setSaving(true);
          const payload = {
            id,
            date: values.date,
            customerId: values.customerId ?? null,
            channel: values.channel,
            note: values.note ?? "",
            lines: values.lines.map((l) => ({
              productId: l.productId,
              qty: l.qty,
              price: fromDisplayPrice(l.price ?? 0, unitOf(l.productId)) ?? 0,
            })),
            discount: values.discount ?? 0,
            paid: values.paid ?? 0,
          };
          const result = await run(createSaleAction(shop.id, payload), { form });
          setSaving(false);
          if (!result) return;
          const t = computeSale(payload.lines.map((l) => ({ qty: l.qty ?? 0, price: l.price })), payload.discount, payload.paid);
          setDone({
            shopName: shop.name,
            customerName: payload.customerId ? customers.byId.get(payload.customerId)?.name : null,
            code: result.code,
            date: payload.date,
            lines: payload.lines.map((l) => {
              const p = products.byId.get(l.productId!)!;
              return { name: p.name, unit: p.unit, qty: l.qty!, price: l.price };
            }),
            subtotal: t.subtotal,
            discount: payload.discount,
            total: t.total,
            paid: payload.paid,
            debt: t.debt,
          });
        }}
      >
        <Card>
          <div className="flex items-end gap-2">
            <Form.Item className="mb-0! min-w-0 flex-1" name="customerId" label="Khách hàng">
              <Select
                allowClear
                placeholder="Khách lẻ"
                showSearch={{ optionFilterProp: "label" }}
                options={customers.data.map((c) => ({
                  value: c.id,
                  label: [c.name, c.phone].filter(Boolean).join(" · "),
                }))}
              />
            </Form.Item>
            <Button icon={<UserAddOutlined />} onClick={() => setCustomerDrawer(true)} aria-label="Khách mới" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Form.Item name="channel" label="Kênh bán">
              <Select options={SALE_CHANNELS.map((c) => ({ value: c, label: SALE_CHANNEL_LABEL[c] }))} />
            </Form.Item>
            <Form.Item name="date" label="Ngày">
              <DateField />
            </Form.Item>
          </div>
        </Card>

        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <div className="mt-4 space-y-3">
              {fields.map((field) => {
                const line = lines[field.name];
                const product = line?.productId ? products.byId.get(line.productId) : undefined;
                const unit = product?.unit === "piece" ? "cái" : "g";
                const priceUnit = priceUnitLabel(product?.unit ?? "g");
                return (
                  <Card
                    key={field.key}
                    size="small"
                    extra={fields.length > 1 && <Button type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />}
                  >
                    <Form.Item name={[field.name, "productId"]} label="Sản phẩm" rules={[{ required: true, message: "Chọn sản phẩm" }]}>
                      <ProductSelect products={products.data} kinds={SELLABLE_KINDS} />
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-3">
                      <Form.Item
                        name={[field.name, "qty"]}
                        label="Số lượng"
                        rules={[{ required: true, message: "Nhập số lượng" }]}
                        extra={product && line?.qty && line.qty > product.stockQty ? `Chỉ còn ${formatQty(product.stockQty, product.unit)}` : undefined}
                      >
                        <InputNumber className="w-full!" min={1} precision={0} suffix={unit} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "price"]}
                        label={`Đơn giá (₫/${priceUnit})`}
                        rules={[
                          { required: true, type: "number", min: 0, message: "Nhập giá" },
                          {
                            validator: async (_, value: number | null) => {
                              if (value != null && fromDisplayPrice(value, product?.unit ?? "g") === null) {
                                throw new Error("Giá cho 100g phải tròn tới 100 ₫");
                              }
                            },
                          },
                        ]}
                        extra={line?.qty && line?.price ? `= ${formatVnd(Math.round(line.qty * perUnit(line)))}` : undefined}
                      >
                        <MoneyInput />
                      </Form.Item>
                    </div>
                  </Card>
                );
              })}
              <Button block icon={<PlusOutlined />} onClick={() => add({})}>Thêm sản phẩm</Button>
            </div>
          )}
        </Form.List>

        <Card className="mt-4!">
          <div className="mb-3 flex justify-between"><span>Tạm tính</span><span>{formatVnd(totals.subtotal)}</span></div>
          <Form.Item name="discount" label="Giảm giá">
            <MoneyInput />
          </Form.Item>
          <div className="mb-3 flex justify-between text-lg font-semibold"><span>Tổng cộng</span><span>{formatVnd(totals.total)}</span></div>
          <div className="flex items-end gap-2">
            <Form.Item
              className="mb-0! flex-1"
              name="paid"
              label="Khách trả"
              rules={[{ required: true, type: "number", min: 0, message: "Nhập số tiền khách trả" }]}
            >
              <MoneyInput />
            </Form.Item>
            <Button
              onClick={() => {
                // Đọc form ngay lúc bấm: giá trị từ useWatch có thể chưa kịp cập nhật
                // khi vừa gõ số lượng xong là bấm luôn.
                form.setFieldValue("paid", Math.max(0, totalOf(form.getFieldsValue())));
                setPaidTouched(false);
              }}
            >
              Trả đủ
            </Button>
          </div>
          {paid != null && totals.debt > 0 && (
            <Alert
              className="mt-3!"
              type={customerId ? "warning" : "error"}
              showIcon
              title={`Còn nợ ${formatVnd(totals.debt)}${customerId ? "" : " — chọn khách hàng để ghi nợ"}`}
            />
          )}
          <Form.Item name="note" label="Ghi chú" className="mt-4! mb-0!">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Card>

        <SubmitBar
          summary={
            <>
              <div className="text-muted">Tổng cộng</div>
              <div className="text-base font-semibold whitespace-nowrap">{formatVnd(totals.total)}</div>
              {paid != null && totals.debt > 0 && <div className="text-xs whitespace-nowrap text-debt">Nợ {formatVnd(totals.debt)}</div>}
            </>
          }
        >
          <Button type="primary" htmlType="submit" size="large" loading={saving}>Lưu đơn</Button>
        </SubmitBar>
      </Form>

      <CustomerDrawer
        open={customerDrawer}
        customer={null}
        onClose={() => setCustomerDrawer(false)}
        onSaved={(newCustomerId) => form.setFieldValue("customerId", newCustomerId)}
      />
    </>
  );
}
