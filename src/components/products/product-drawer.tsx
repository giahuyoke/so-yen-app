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
} from "@/lib/domain/models";
import { createProductAction, updateProductAction } from "@/server/actions/inventory";

interface ProductDrawerProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}

type Values = Pick<Product, "name" | "kind" | "unit" | "suggestedPrice" | "lowStockThreshold" | "taxGroup" | "archived">;

export function ProductDrawer({ open, product, onClose }: ProductDrawerProps) {
  const { shop } = useShop();
  const run = useRunAction();
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);
  // Trang cha đổi `key` mỗi lần mở, nên mỗi lần mở có ID mới; ID giữ nguyên khi bấm Lưu lại sau lỗi mạng.
  const [draftId] = useState(newId);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (product) form.setFieldsValue(product);
  }, [form, open, product]);

  const onKindChange = (kind: ProductKind) => {
    form.setFieldsValue({ unit: DEFAULT_UNIT[kind], taxGroup: DEFAULT_TAX_GROUP[kind] });
  };

  return (
    <Drawer open={open} onClose={onClose} title={product ? "Sửa sản phẩm" : "Sản phẩm mới"} destroyOnHidden>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ kind: "raw", unit: "g", suggestedPrice: 0, lowStockThreshold: 0, taxGroup: "self_raw", archived: false }}
        onFinish={async (values) => {
          setSaving(true);
          const pending = product
            ? updateProductAction(shop.id, {
                id: product.id,
                name: values.name,
                suggestedPrice: values.suggestedPrice,
                lowStockThreshold: values.lowStockThreshold,
                taxGroup: values.taxGroup,
                archived: values.archived,
              })
            : createProductAction(shop.id, { ...values, id: draftId });
          const ok = await run(pending, { success: "Đã lưu sản phẩm", form });
          setSaving(false);
          if (ok) onClose();
        }}
      >
        <Form.Item name="name" label="Tên" rules={[{ required: true, message: "Nhập tên sản phẩm" }]}>
          <Input placeholder="VD: Yến tinh chế tổ đẹp" />
        </Form.Item>
        <Form.Item name="kind" label="Loại">
          <Select
            disabled={!!product}
            onChange={onKindChange}
            options={PRODUCT_KINDS.map((k) => ({ value: k, label: PRODUCT_KIND_LABEL[k] }))}
          />
        </Form.Item>
        <Form.Item name="unit" label="Đơn vị" extra={product ? "Không đổi được đơn vị sau khi tạo." : undefined}>
          <Select disabled={!!product} options={UNITS.map((u) => ({ value: u, label: UNIT_LABEL[u] }))} />
        </Form.Item>
        <Form.Item
          name="suggestedPrice"
          label="Giá bán gợi ý (cho 1 đơn vị)"
          rules={[{ required: true, type: "number", min: 0, message: "Nhập giá hợp lệ" }]}
        >
          <MoneyInput />
        </Form.Item>
        <Form.Item name="lowStockThreshold" label="Cảnh báo khi tồn còn" extra="Để 0 nếu không cần cảnh báo.">
          <InputNumber className="w-full!" min={0} precision={0} />
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
