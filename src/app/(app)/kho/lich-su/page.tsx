"use client";

import { Card, Empty, Select, Tabs, Tag } from "antd";
import { useState } from "react";
import { VoidMenu } from "@/components/common/row-menu";
import { ItemList, ListItem, ListItemMeta } from "@/components/common/item-list";
import { DateRangeFilter, LoadMore, thisMonthRange, type DateRange } from "@/components/common/list-filters";
import { useRunAction } from "@/components/common/use-run-action";
import { VoidModal } from "@/components/common/void-modal";
import { useShop } from "@/components/shop/shop-provider";
import { useDocsInRange, useProducts, useSuppliers } from "@/hooks/use-shop-data";
import type { ActionResult } from "@/lib/domain/errors";
import { formatDate, todayVN } from "@/lib/domain/dates";
import {
  PRODUCTION_KIND_LABEL,
  PRODUCTION_KINDS,
  RECEIPT_KIND_LABEL,
  type DocStatus,
  type ProductionKind,
} from "@/lib/domain/models";
import { formatPercent, formatQty, formatVnd } from "@/lib/domain/money";
import { voidAdjustmentAction, voidProductionAction, voidReceiptAction } from "@/server/actions/inventory";

type VoidFn = (shopId: string, input: unknown) => Promise<ActionResult<{ id: string }>>;
type TabKey = "receipts" | "productions" | "adjustments";
/** Giá trị đặc biệt của bộ lọc nguồn: phiếu thu hoạch. */
const HARVEST = "__harvest__";

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
  const [tab, setTab] = useState<TabKey>("receipts");
  const [range, setRange] = useState<DateRange>(() => thisMonthRange(todayVN()));
  const [productId, setProductId] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [productionKind, setProductionKind] = useState<ProductionKind | null>(null);
  const receipts = useDocsInRange("receipts", range[0], range[1]);
  const productions = useDocsInRange("productions", range[0], range[1]);
  const adjustments = useDocsInRange("adjustments", range[0], range[1]);
  const [voiding, setVoiding] = useState<{ id: string; fn: VoidFn } | null>(null);

  const describe = (id: string, qty: number) => {
    const p = products.byId.get(id);
    return p ? `${p.name} ${formatQty(qty, p.unit)}` : `(đã xóa) ${qty}`;
  };
  const hasProduct = (lines: { productId: string }[]) => !productId || lines.some((l) => l.productId === productId);

  const receiptRows: Row[] = receipts.data
    .filter((r) => hasProduct(r.lines))
    .filter((r) => !source || (source === HARVEST ? r.kind === "harvest" : r.supplierId === source))
    .map((r) => ({
      id: r.id,
      title: `${RECEIPT_KIND_LABEL[r.kind]}${r.supplierId ? ` · ${suppliers.byId.get(r.supplierId)?.name ?? ""}` : ""}`,
      date: r.date,
      status: r.status,
      lines: r.lines.map((l) => describe(l.productId, l.qty)),
      amount: r.kind === "purchase" ? formatVnd(r.total) : undefined,
      voidReason: r.voidReason,
    }));
  const productionRows: Row[] = productions.data
    .filter((p) => hasProduct([...p.inputs, ...p.outputs]))
    .filter((p) => !productionKind || p.kind === productionKind)
    .map((p) => ({
      id: p.id,
      title: `${PRODUCTION_KIND_LABEL[p.kind]}${p.kind === "clean" ? ` · hao hụt ${formatPercent(p.lossRate)}` : ""}`,
      date: p.date,
      status: p.status,
      lines: [
        ...p.inputs.map((l) => `− ${describe(l.productId, l.qty)}`),
        ...p.outputs.map((l) => `+ ${describe(l.productId, l.qty)}`),
      ],
      amount: formatVnd(p.totalCost),
      voidReason: p.voidReason,
    }));
  const adjustmentRows: Row[] = adjustments.data
    .filter((a) => hasProduct(a.lines))
    .map((a) => ({
      id: a.id,
      title: `Điều chỉnh · ${a.reason}`,
      date: a.date,
      status: a.status,
      lines: a.lines.map((l) => `${l.qtyDelta > 0 ? "+" : "−"} ${describe(l.productId, Math.abs(l.qtyDelta))}`),
      voidReason: a.voidReason,
    }));

  const renderList = (rows: Row[], state: ReturnType<typeof useDocsInRange>, fn: VoidFn) => (
    <Card loading={state.loading}>
      {rows.length === 0 ? (
        <Empty description="Không có chứng từ nào khớp bộ lọc" />
      ) : (
        <ItemList
          dataSource={rows}
          renderItem={(row) => (
            <ListItem
              actions={
                row.status === "active"
                  ? [<VoidMenu key="void" onVoid={() => setVoiding({ id: row.id, fn })} />]
                  : [<Tag key="voided">Đã hủy</Tag>]
              }
            >
              <ListItemMeta
                title={<span className={row.status === "voided" ? "line-through opacity-60" : ""}>{row.title}</span>}
                description={
                  <div className="space-y-0.5">
                    <div>{formatDate(row.date)}{row.amount ? ` · ${row.amount}` : ""}</div>
                    {row.lines.map((line, i) => <div key={i}>{line}</div>)}
                    {row.voidReason && <div className="text-debt">Lý do hủy: {row.voidReason}</div>}
                  </div>
                }
              />
            </ListItem>
          )}
        />
      )}
      <LoadMore loaded={state.data.length} hasMore={state.hasMore} onLoadMore={state.loadMore} noun="chứng từ" />
    </Card>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Chứng từ kho</h1>
      <Card size="small">
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <DateRangeFilter value={range} onChange={setRange} />
          <Select<string>
            allowClear
            showSearch={{ optionFilterProp: "label" }}
            className="sm:w-56"
            placeholder="Mọi sản phẩm"
            value={productId ?? undefined}
            onChange={(v) => setProductId(v ?? null)}
            options={products.data.map((p) => ({ value: p.id, label: p.name }))}
          />
          {tab === "receipts" && (
            <Select<string>
              allowClear
              className="sm:w-52"
              placeholder="Mọi nguồn hàng"
              value={source ?? undefined}
              onChange={(v) => setSource(v ?? null)}
              options={[{ value: HARVEST, label: "Thu hoạch nhà yến" }, ...suppliers.data.map((s) => ({ value: s.id, label: s.name }))]}
            />
          )}
          {tab === "productions" && (
            <Select<ProductionKind>
              allowClear
              className="sm:w-44"
              placeholder="Mọi kiểu chế biến"
              value={productionKind ?? undefined}
              onChange={(v) => setProductionKind(v ?? null)}
              options={PRODUCTION_KINDS.map((k) => ({ value: k, label: PRODUCTION_KIND_LABEL[k] }))}
            />
          )}
        </div>
      </Card>
      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as TabKey)}
        items={[
          { key: "receipts", label: `Nhập kho (${receiptRows.length})`, children: renderList(receiptRows, receipts, voidReceiptAction) },
          { key: "productions", label: `Chế biến (${productionRows.length})`, children: renderList(productionRows, productions, voidProductionAction) },
          { key: "adjustments", label: `Điều chỉnh (${adjustmentRows.length})`, children: renderList(adjustmentRows, adjustments, voidAdjustmentAction) },
        ]}
      />
      <VoidModal
        key={voiding?.id ?? "none"}
        open={!!voiding}
        description="Kho sẽ được trả lại như trước khi có chứng từ này. Chứng từ vẫn được giữ trong lịch sử."
        onCancel={() => setVoiding(null)}
        onConfirm={async (reason) => {
          if (!voiding) return false;
          const ok = await run(voiding.fn(shop.id, { id: voiding.id, reason }), { success: "Đã hủy chứng từ" });
          if (ok) setVoiding(null);
          return !!ok;
        }}
      />
    </div>
  );
}
