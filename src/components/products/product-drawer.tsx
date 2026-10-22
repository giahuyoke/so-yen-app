"use client";

import { Button, Drawer, Form, Input, InputNumber, Select, Switch } from "antd";
import { useEffect, useState } from "react";
import { MoneyInput } from "@/components/common/money-input";
import { useRunAction } from "@/components/common/use-run-action";
import { useShop } from "@/components/shop/shop-provider";
import { newId } from "@/lib/domain/ids";
import {
  DEFAULT_TAX_GROUP,
  DEFAULT_UNIT,
  PRODUCT_KIND_LABEL,
  PRODUCT_KINDS,
  TAX_GROUP_LABEL,
  TAX_GROUPS,
  UNIT_LABEL,
  UNITS,
  type Product,
  type ProductKind,
  type Unit,
} from "@/lib/domain/models";
import { fromDisplayPrice, priceUnitLabel, toDisplayPrice } from "@/lib/domain/money";
import { createProductAction, updateProductAction } from "@/server/actions/inventory";

interface ProductDrawerProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  /** Loại được chọn khi tạo mới; mặc định mọi loại, chọn sẵn loại đầu tiên. */
  kinds?: ProductKind[];
  /** Gọi với ID sản phẩm sau khi lưu thành công. */
  onSaved?: (id: string) => void;
}

/** `suggestedPrice` trong form là giá hiển thị: ₫/100g với hàng tính theo gram. */
type Values = Pick<Product, "name" | "kind" | "unit" | "suggestedPrice" | "lowStockThreshold" | "taxGroup" | "archived"> & {
  gramPerUnit?: number | null;
};

/** Hũ chưng và hộp quà tính theo cái nhưng cần biết số gram yến khi chế biến. */
const needsGramPerUnit = (kind?: ProductKind, unit?: Unit) => unit === "piece" && (kind === "steamed" || kind === "combo");

export function ProductDrawer({ open, product, onClose, kinds = [...PRODUCT_KINDS], onSaved }: ProductDrawerProps) {
  const { shop } = useShop();
  const run = useRunAction();
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);
  // Trang cha đổi `key` mỗi lần mở, nên mỗi lần mở có ID mới; ID giữ nguyên khi bấm Lưu lại sau lỗi mạng.
  const [draftId] = useState(newId);
  const kind = Form.useWatch("kind", form);
  const unit = Form.useWatch("unit", form) ?? "g";

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (product) {
      form.setFieldsValue({ ...product, suggestedPrice: toDisplayPrice(product.suggestedPrice, product.unit) });
    } else {
      const first = kinds[0];
      form.setFieldsValue({ kind: first, unit: DEFAULT_UNIT[first], taxGroup: DEFAULT_TAX_GROUP[first] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, open, product]);

  const onKindChange = (next: ProductKind) => {
    form.setFieldsValue({ unit: DEFAULT_UNIT[next], taxGroup: DEFAULT_TAX_GROUP[next] });
  };

  return (
    <Drawer open={open} onClose={onClose} title={product ? "Sửa sản phẩm" : "Sản phẩm mới"} destroyOnHidden>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ kind: "raw", unit: "g", suggestedPrice: 0, lowStockThreshold: 0, taxGroup: "self_raw", archived: false }}
        onFinish={async (values) => {
          const suggestedPrice = fromDisplayPrice(values.suggestedPrice, values.unit) ?? 0;
          const gramPerUnit = needsGramPerUnit(values.kind, values.unit) ? (values.gramPerUnit ?? null) : null;
          setSaving(true);
          const pending = product
            ? updateProductAction(shop.id, {
                id: product.id,
                name: values.name,
                suggestedPrice,
                lowStockThreshold: values.lowStockThreshold,
                taxGroup: values.taxGroup,
                gramPerUnit,
                archived: values.archived,
              })
            : createProductAction(shop.id, {
                id: draftId,
                name: values.name,
                kind: values.kind,
                unit: values.unit,
                suggestedPrice,
                lowStockThreshold: values.lowStockThreshold,
                taxGroup: values.taxGroup,
                gramPerUnit,
              });
          const ok = await run(pending, { success: "Đã lưu sản phẩm", form });
          setSaving(false);
          if (ok) {
            onSaved?.(ok.id);
            onClose();
          }
        }}
      >
        <Form.Item name="name" label="Tên" rules={[{ required: true, message: "Nhập tên sản phẩm" }]}>
          <Input placeholder="VD: Yến tinh chế tổ đẹp" />
        </Form.Item>
        <Form.Item name="kind" label="Loại">
          <Select
            disabled={!!product}
            onChange={onKindChange}
            options={(product ? PRODUCT_KINDS : kinds).map((k) => ({ value: k, label: PRODUCT_KIND_LABEL[k] }))}
          />
        </Form.Item>
        <Form.Item name="unit" label="Đơn vị" extra={product ? "Không đổi được đơn vị sau khi tạo." : undefined}>
          <Select disabled={!!product} options={UNITS.map((u) => ({ value: u, label: UNIT_LABEL[u] }))} />
        </Form.Item>
        <Form.Item
          name="suggestedPrice"
          label={`Giá bán gợi ý (₫/${priceUnitLabel(unit)})`}
          rules={[
            { required: true, type: "number", min: 0, message: "Nhập giá hợp lệ" },
            {
              validator: async (_, value: number | null) => {
                if (value != null && fromDisplayPrice(value, unit) === null) throw new Error("Giá cho 100g phải tròn tới 100 ₫");
              },
            },
          ]}
        >
          <MoneyInput />
        </Form.Item>
        {needsGramPerUnit(kind, unit) && (
          <Form.Item
            name="gramPerUnit"
            label="Gram yến mỗi cái"
            extra="Điền sẵn khi chưng hoặc đóng hộp. VD: hũ 70ml = 3g, hộp 6 hũ = 18g."
          >
            <InputNumber className="w-full!" min={1} precision={0} suffix="g" />
          </Form.Item>
        )}
        <Form.Item name="lowStockThreshold" label="Cảnh báo khi tồn còn" extra="Để 0 nếu không cần cảnh báo.">
          <InputNumber className="w-full!" min={0} precision={0} suffix={unit === "g" ? "g" : "cái"} />
        </Form.Item>
        <Form.Item name="taxGroup" label="Nhóm thuế">
          <Select options={TAX_GROUPS.map((g) => ({ value: g, label: TAX_GROUP_LABEL[g] }))} />
        </Form.Item>
        {product && (
          <Form.Item name="archived" label="Ngừng sử dụng" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
        <Button type="primary" htmlType="submit" block loading={saving}>
          Lưu
        </Button>
      </Form>
    </Drawer>
  );
}
