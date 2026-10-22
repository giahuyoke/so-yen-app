"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Form, Input, Modal, Select, Tag } from "antd";
import { useState } from "react";
import { DateField } from "@/components/common/date-field";
import { ItemList, ListItem, ListItemMeta } from "@/components/common/item-list";
import { DateRangeFilter, LoadMore, thisMonthRange, type DateRange } from "@/components/common/list-filters";
import { MoneyInput } from "@/components/common/money-input";
import { useRunAction } from "@/components/common/use-run-action";
import { VoidModal } from "@/components/common/void-modal";
import { useShop } from "@/components/shop/shop-provider";
import { useDocsInRange } from "@/hooks/use-shop-data";
import { formatDate, todayVN } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL, type ExpenseCategory, type ExpenseDoc } from "@/lib/domain/models";
import { formatVnd } from "@/lib/domain/money";
import { createExpenseAction, voidExpenseAction } from "@/server/actions/expenses";

interface ExpenseValues {
  category: ExpenseCategory;
  amount: number | null;
  date: string;
  note?: string;
}

export default function ExpensesPage() {
  const { shop } = useShop();
  const run = useRunAction();
  const [range, setRange] = useState<DateRange>(() => thisMonthRange(todayVN()));
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const expenses = useDocsInRange("expenses", range[0], range[1]);
  const [creating, setCreating] = useState<string | null>(null);
  const [voiding, setVoiding] = useState<ExpenseDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<ExpenseValues>();

  const shown = expenses.data.filter((e) => !category || e.category === category);
  const byCategory: Partial<Record<ExpenseCategory, number>> = {};
  let total = 0;
  for (const e of shown) {
    if (e.status !== "active") continue;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    total += e.amount;
  }
  const openForm = () => {
    form.resetFields();
    form.setFieldsValue({ category: "shipping", amount: null, date: todayVN(), note: "" });
    setCreating(newId());
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chi phí</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openForm}>Thêm khoản chi</Button>
      </div>

      <Card size="small">
        <div className="grid gap-2 sm:flex">
          <DateRangeFilter value={range} onChange={setRange} />
          <Select<ExpenseCategory>
            allowClear
            className="sm:w-44"
            placeholder="Mọi danh mục"
            value={category ?? undefined}
            onChange={(v) => setCategory(v ?? null)}
            options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABEL[c] }))}
          />
        </div>
      </Card>

      <section className="rounded-3xl bg-brand p-5 text-white">
        <div className="text-sm text-brand-tint">
          Chi phí từ {formatDate(range[0])} đến {formatDate(range[1])}
        </div>
        <div className="text-3xl font-semibold">{formatVnd(total)}</div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {EXPENSE_CATEGORIES.filter((c) => (byCategory[c] ?? 0) !== 0).map((c) => (
            <span key={c} className="rounded-full bg-brand-dark px-3 py-1">
              {EXPENSE_CATEGORY_LABEL[c]} {formatVnd(byCategory[c] ?? 0)}
            </span>
          ))}
        </div>
      </section>

      <Card title={`${shown.length} khoản chi`} loading={expenses.loading}>
        {shown.length === 0 ? (
          <Empty description="Không có khoản chi nào khớp bộ lọc" />
        ) : (
          <ItemList
            dataSource={shown}
            renderItem={(e) => (
              <ListItem
                actions={
                  e.status === "active"
                    ? [<Button key="void" danger size="small" onClick={() => setVoiding(e)}>Hủy</Button>]
                    : [<Tag key="voided">Đã hủy</Tag>]
                }
              >
                <ListItemMeta
                  title={
                    <span className={e.status === "voided" ? "line-through opacity-60" : ""}>
                      {EXPENSE_CATEGORY_LABEL[e.category]} · {formatVnd(e.amount)}
                    </span>
                  }
                  description={[formatDate(e.date), e.note, e.voidReason && `Lý do hủy: ${e.voidReason}`].filter(Boolean).join(" · ")}
                />
              </ListItem>
            )}
          />
        )}
        <LoadMore loaded={expenses.data.length} hasMore={expenses.hasMore} onLoadMore={expenses.loadMore} noun="khoản chi" />
      </Card>

      <Modal
        open={!!creating}
        title="Thêm khoản chi"
        okText="Lưu"
        cancelText="Đóng"
        okButtonProps={{ loading: saving }}
        forceRender
        onCancel={() => setCreating(null)}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (!creating) return;
            setSaving(true);
            const ok = await run(createExpenseAction(shop.id, { id: creating, ...values, note: values.note ?? "" }), {
              success: "Đã ghi khoản chi",
              form,
            });
            setSaving(false);
            if (ok) setCreating(null);
          }}
        >
          <Form.Item name="category" label="Danh mục">
            <Select options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABEL[c] }))} />
          </Form.Item>
          <Form.Item name="amount" label="Số tiền" rules={[{ required: true, type: "number", min: 1, message: "Nhập số tiền" }]}>
            <MoneyInput />
          </Form.Item>
          <Form.Item name="date" label="Ngày">
            <DateField />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input placeholder="VD: Ship đơn đi Hà Nội" />
          </Form.Item>
        </Form>
      </Modal>

      <VoidModal
        key={voiding?.id ?? "none"}
        open={!!voiding}
        description="Khoản chi sẽ bị trừ khỏi báo cáo lãi lỗ. Chứng từ vẫn được giữ trong lịch sử."
        onCancel={() => setVoiding(null)}
        onConfirm={async (reason) => {
          if (!voiding) return false;
          const ok = await run(voidExpenseAction(shop.id, { id: voiding.id, reason }), { success: "Đã hủy khoản chi" });
          if (ok) setVoiding(null);
          return !!ok;
        }}
      />
    </div>
  );
}
