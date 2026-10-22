"use client";

import { Alert, Button, Card, Form, InputNumber, Switch } from "antd";
import { useEffect, useState } from "react";
import { MoneyInput } from "@/components/common/money-input";
import { useRunAction } from "@/components/common/use-run-action";
import { useShop } from "@/components/shop/shop-provider";
import { useTaxConfig } from "@/hooks/use-shop-data";
import { TAX_GROUP_LABEL, TAX_GROUPS } from "@/lib/domain/models";
import { DEFAULT_TAX_CONFIG, type TaxConfig } from "@/lib/domain/tax";
import { updateTaxConfigAction } from "@/server/actions/shop";

function PercentInput(props: { value?: number; onChange?: (v: number | null) => void }) {
  return <InputNumber {...props} className="w-full!" min={0} max={100} step={0.1} precision={2} suffix="%" inputMode="decimal" />;
}

export default function SettingsPage() {
  const { shop } = useShop();
  const run = useRunAction();
  const config = useTaxConfig();
  const [form] = Form.useForm<TaxConfig>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!config.loading) form.setFieldsValue(config.data);
  }, [config.loading, config.data, form]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Cài đặt</h1>
      <Card title="Cấu hình thuế" loading={config.loading}>
        <Alert
          className="mb-4!"
          type="warning"
          showIcon
          title="Cần xác nhận với cơ quan thuế"
          description="Giá trị mặc định điền theo quy định hộ kinh doanh từ năm 2026 (miễn thuế khi doanh thu năm không quá 500 triệu; GTGT và TNCN tính theo tỷ lệ trên doanh thu từng ngành). Hãy kiểm tra lại trước khi dùng số ước tính."
        />
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            setSaving(true);
            await run(updateTaxConfigAction(shop.id, values), { success: "Đã lưu cấu hình thuế", form });
            setSaving(false);
          }}
        >
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item
              name="exemptThreshold"
              label="Mốc miễn thuế (doanh thu năm)"
              rules={[{ required: true, type: "number", min: 1, message: "Nhập mốc doanh thu" }]}
            >
              <MoneyInput />
            </Form.Item>
            <Form.Item
              name="invoiceThreshold"
              label="Mốc bắt buộc hóa đơn điện tử"
              rules={[{ required: true, type: "number", min: 1, message: "Nhập mốc doanh thu" }]}
            >
              <MoneyInput />
            </Form.Item>
          </div>
          <Form.Item name="pitOnExcessOnly" label="Chỉ tính thuế TNCN trên phần doanh thu vượt mốc miễn thuế" valuePropName="checked">
            <Switch />
          </Form.Item>

          <div className="mb-2 font-medium">Tỷ lệ thuế trên doanh thu</div>
          {TAX_GROUPS.map((g) => (
            <div key={g} className="grid grid-cols-[1fr_6.5rem_6.5rem] items-start gap-2">
              <div className="pt-1">{TAX_GROUP_LABEL[g]}</div>
              <Form.Item name={["rates", g, "vat"]} label="GTGT" rules={[{ required: true, message: "Nhập tỷ lệ" }]}>
                <PercentInput />
              </Form.Item>
              <Form.Item name={["rates", g, "pit"]} label="TNCN" rules={[{ required: true, message: "Nhập tỷ lệ" }]}>
                <PercentInput />
              </Form.Item>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button type="primary" htmlType="submit" loading={saving}>Lưu</Button>
            <Button onClick={() => form.setFieldsValue(DEFAULT_TAX_CONFIG)}>Điền giá trị mặc định</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
