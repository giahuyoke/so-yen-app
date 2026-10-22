"use client";

import { Button, Card, Empty, Input, List, Modal, Tabs, Tag } from "antd";
import { useState } from "react";
import { useRunAction } from "@/components/common/use-run-action";
import { useShop } from "@/components/shop/shop-provider";
import { useProducts, useRecentDocs, useSuppliers } from "@/hooks/use-shop-data";
import type { ActionResult } from "@/lib/domain/errors";
import { formatDate } from "@/lib/domain/dates";
import { PRODUCTION_KIND_LABEL, RECEIPT_KIND_LABEL, type DocStatus } from "@/lib/domain/models";
import { formatQty, formatVnd } from "@/lib/domain/money";
import { voidAdjustmentAction, voidProductionAction, voidReceiptAction } from "@/server/actions/inventory";

type VoidFn = (shopId: string, input: unknown) => Promise<ActionResult<{ id: string }>>;

interface Row {
  id: string;
  title: string;
  date: string;
  status: DocStatus;
  lines: string[];
  amount?: string;
  voidReason?: string;
}

export default function DocumentsPage() {
  const { shop } = useShop();
  const run = useRunAction();
  const products = useProducts();
  const suppliers = useSuppliers();
  const receipts = useRecentDocs("receipts");
  const productions = useRecentDocs("productions");
  const adjustments = useRecentDocs("adjustments");
  const [voiding, setVoiding] = useState<{ id: string; fn: VoidFn } | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const describe = (productId: string, qty: number) => {
    const p = products.byId.get(productId);
    return p ? `${p.name} ${formatQty(qty, p.unit)}` : `(đã xóa) ${qty}`;
  };

  const receiptRows: Row[] = receipts.data.map((r) => ({
    id: r.id,
    title: `${RECEIPT_KIND_LABEL[r.kind]}${r.supplierId ? ` · ${suppliers.byId.get(r.supplierId)?.name ?? ""}` : ""}`,
    date: r.date,
    status: r.status,
    lines: r.lines.map((l) => describe(l.productId, l.qty)),
    amount: r.kind === "purchase" ? formatVnd(r.total) : undefined,
    voidReason: r.voidReason,
  }));
  const productionRows: Row[] = productions.data.map((p) => ({
    id: p.id,
    title: `${PRODUCTION_KIND_LABEL[p.kind]}${p.kind === "clean" ? ` · hao hụt ${(p.lossRate * 100).toFixed(1)}%` : ""}`,
    date: p.date,
    status: p.status,
    lines: [
      ...p.inputs.map((l) => `− ${describe(l.productId, l.qty)}`),
      ...p.outputs.map((l) => `+ ${describe(l.productId, l.qty)}`),
    ],
    amount: formatVnd(p.totalCost),
    voidReason: p.voidReason,
  }));
  const adjustmentRows: Row[] = adjustments.data.map((a) => ({
    id: a.id,
    title: `Điều chỉnh · ${a.reason}`,
    date: a.date,
    status: a.status,
    lines: a.lines.map((l) => `${l.qtyDelta > 0 ? "+" : "−"} ${describe(l.productId, Math.abs(l.qtyDelta))}`),
    voidReason: a.voidReason,
  }));

  const renderList = (rows: Row[], loading: boolean, fn: VoidFn) => (
    <Card loading={loading}>
      {rows.length === 0 ? (
        <Empty description="Chưa có chứng từ" />
      ) : (
        <List
          dataSource={rows}
          renderItem={(row) => (
            <List.Item
              actions={
                row.status === "active"
                  ? [<Button key="void" danger size="small" onClick={() => { setReason(""); setVoiding({ id: row.id, fn }); }}>Hủy</Button>]
                  : [<Tag key="voided">Đã hủy</Tag>]
              }
            >
              <List.Item.Meta
                title={<span className={row.status === "voided" ? "line-through opacity-60" : ""}>{row.title}</span>}
                description={
                  <div className="space-y-0.5">
                    <div>{formatDate(row.date)}{row.amount ? ` · ${row.amount}` : ""}</div>
                    {row.lines.map((line, i) => <div key={i}>{line}</div>)}
                    {row.voidReason && <div className="text-red-500">Lý do hủy: {row.voidReason}</div>}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Chứng từ kho</h1>
      <Tabs
        items={[
          { key: "receipts", label: "Nhập kho", children: renderList(receiptRows, receipts.loading, voidReceiptAction) },
          { key: "productions", label: "Chế biến", children: renderList(productionRows, productions.loading, voidProductionAction) },
          { key: "adjustments", label: "Điều chỉnh", children: renderList(adjustmentRows, adjustments.loading, voidAdjustmentAction) },
        ]}
      />
      <Modal
        open={!!voiding}
        title="Hủy chứng từ"
        okText="Hủy chứng từ"
        okButtonProps={{ danger: true, disabled: !reason.trim(), loading: submitting }}
        cancelText="Đóng"
        onCancel={() => setVoiding(null)}
        onOk={async () => {
          if (!voiding) return;
          setSubmitting(true);
          const ok = await run(voiding.fn(shop.id, { id: voiding.id, reason }), { success: "Đã hủy chứng từ" });
          setSubmitting(false);
          if (ok) setVoiding(null);
        }}
      >
        <p className="mb-2">Kho sẽ được trả lại như trước khi có chứng từ này. Chứng từ vẫn được giữ trong lịch sử.</p>
        <Input.TextArea rows={3} placeholder="Lý do hủy" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </div>
  );
}
