"use client";

import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Input, Segmented, Select, Tag } from "antd";
import Link from "next/link";
import { useState } from "react";
import { ItemList, ListItem, ListItemMeta } from "@/components/common/item-list";
import { DateRangeFilter, LoadMore, thisMonthRange, type DateRange } from "@/components/common/list-filters";
import { useRunAction } from "@/components/common/use-run-action";
import { VoidModal } from "@/components/common/void-modal";
import { DebtTag } from "@/components/sales/debt-tag";
import { useShop } from "@/components/shop/shop-provider";
import { useCustomers, useDocsInRange, useProducts, useRemainingDebts } from "@/hooks/use-shop-data";
import { formatDate, todayVN } from "@/lib/domain/dates";
import { SALE_CHANNEL_LABEL, SALE_CHANNELS, type SaleChannel, type SaleDoc } from "@/lib/domain/models";
import { formatQty, formatVnd } from "@/lib/domain/money";
import { voidSaleAction } from "@/server/actions/sales";

type Status = "all" | "debt" | "voided";
/** Giá trị đặc biệt của bộ lọc khách: đơn không gắn khách. */
const WALK_IN = "__walk_in__";

export default function SalesPage() {
  const { shop } = useShop();
  const run = useRunAction();
  const [range, setRange] = useState<DateRange>(() => thisMonthRange(todayVN()));
  const [status, setStatus] = useState<Status>("all");
  const [channel, setChannel] = useState<SaleChannel | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const sales = useDocsInRange("sales", range[0], range[1]);
  const products = useProducts();
  const customers = useCustomers();
  const debts = useRemainingDebts();
  const remainingOf = (s: SaleDoc) => (s.status === "active" ? (debts.bySale.get(s.id) ?? 0) : 0);
  const [voiding, setVoiding] = useState<SaleDoc | null>(null);

  const term = search.trim().toLowerCase();
  const shown = sales.data.filter((s) => {
    if (status === "voided" ? s.status !== "voided" : status === "debt" ? remainingOf(s) <= 0 : false) return false;
    if (channel && s.channel !== channel) return false;
    if (customerId && (customerId === WALK_IN ? s.customerId !== null : s.customerId !== customerId)) return false;
    if (term) {
      const name = s.customerId ? (customers.byId.get(s.customerId)?.name ?? "") : "khách lẻ";
      if (!s.code.toLowerCase().includes(term) && !name.toLowerCase().includes(term)) return false;
    }
    return true;
  });
  const active = shown.filter((s) => s.status === "active");
  const revenue = active.reduce((sum, s) => sum + s.total, 0);
  const debt = active.reduce((sum, s) => sum + remainingOf(s), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Đơn bán</h1>
        <Link href="/ban-hang/moi"><Button type="primary" icon={<PlusOutlined />}>Bán hàng</Button></Link>
      </div>

      <Card size="small">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <DateRangeFilter value={range} onChange={setRange} />
            <Input
              allowClear
              className="sm:w-56!"
              prefix={<SearchOutlined className="text-muted" />}
              placeholder="Mã đơn hoặc tên khách"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select<SaleChannel>
              allowClear
              className="sm:w-40"
              placeholder="Mọi kênh"
              value={channel ?? undefined}
              onChange={(v) => setChannel(v ?? null)}
              options={SALE_CHANNELS.map((c) => ({ value: c, label: SALE_CHANNEL_LABEL[c] }))}
            />
            <Select<string>
              allowClear
              showSearch={{ optionFilterProp: "label" }}
              className="sm:w-56"
              placeholder="Mọi khách"
              value={customerId ?? undefined}
              onChange={(v) => setCustomerId(v ?? null)}
              options={[{ value: WALK_IN, label: "Khách lẻ (không lưu)" }, ...customers.data.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
          <Segmented<Status>
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "Tất cả" },
              { value: "debt", label: "Còn nợ" },
              { value: "voided", label: "Đã hủy" },
            ]}
          />
        </div>
      </Card>

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-sm text-muted">
        <span>{shown.length} đơn</span>
        <span>Doanh thu <b className="text-ink">{formatVnd(revenue)}</b></span>
        {debt > 0 && <span>Còn nợ <b className="text-debt">{formatVnd(debt)}</b></span>}
      </div>

      <Card loading={sales.loading}>
        {shown.length === 0 ? (
          <Empty description="Không có đơn nào khớp bộ lọc" />
        ) : (
          <ItemList
            dataSource={shown}
            renderItem={(s) => {
              const customer = s.customerId ? customers.byId.get(s.customerId) : undefined;
              return (
                <ListItem
                  actions={
                    s.status === "active"
                      ? [<Button key="void" danger size="small" onClick={() => setVoiding(s)}>Hủy</Button>]
                      : [<Tag key="voided">Đã hủy</Tag>]
                  }
                >
                  <ListItemMeta
                    title={
                      <span className={s.status === "voided" ? "line-through opacity-60" : ""}>
                        {s.code} · {customer ? <Link href={`/khach-hang/${customer.id}`}>{customer.name}</Link> : "Khách lẻ"}
                      </span>
                    }
                    description={
                      <div className="space-y-0.5">
                        <div>
                          {formatDate(s.date)} · {SALE_CHANNEL_LABEL[s.channel]} · <b>{formatVnd(s.total)}</b>
                          <DebtTag sale={s} remaining={remainingOf(s)} loading={debts.loading} />
                        </div>
                        {s.lines.map((l, i) => {
                          const p = products.byId.get(l.productId);
                          return <div key={i}>{p ? `${p.name} ${formatQty(l.qty, p.unit)}` : l.productId}</div>;
                        })}
                        {s.voidReason && <div className="text-debt">Lý do hủy: {s.voidReason}</div>}
                      </div>
                    }
                  />
                </ListItem>
              );
            }}
          />
        )}
        <LoadMore loaded={sales.data.length} hasMore={sales.hasMore} onLoadMore={sales.loadMore} noun="đơn" />
      </Card>
      <VoidModal
        key={voiding?.id ?? "none"}
        open={!!voiding}
        description="Hàng sẽ được trả lại kho, doanh thu và công nợ của đơn này bị trừ đi. Đơn vẫn được giữ trong lịch sử."
        onCancel={() => setVoiding(null)}
        onConfirm={async (reason) => {
          if (!voiding) return false;
          const ok = await run(voidSaleAction(shop.id, { id: voiding.id, reason }), { success: "Đã hủy đơn" });
          if (ok) setVoiding(null);
          return !!ok;
        }}
      />
    </div>
  );
}
