"use client";

import { FilterOutlined, PlusOutlined, RightOutlined, SearchOutlined } from "@ant-design/icons";
import { Badge, Button, Card, Empty, Input, Segmented, Select, Tag } from "antd";
import Link from "next/link";
import { useState } from "react";
import { ItemList, ListItem, ListItemMeta } from "@/components/common/item-list";
import { DateRangeFilter, LoadMore, thisMonthRange, type DateRange } from "@/components/common/list-filters";
import { DebtTag } from "@/components/sales/debt-tag";
import { useCustomers, useDocsInRange, useProducts, useRemainingDebts } from "@/hooks/use-shop-data";
import { formatDate, todayVN } from "@/lib/domain/dates";
import { SALE_CHANNEL_LABEL, SALE_CHANNELS, type SaleChannel, type SaleDoc } from "@/lib/domain/models";
import { formatQty, formatVnd } from "@/lib/domain/money";

type Status = "all" | "debt" | "voided";
/** Giá trị đặc biệt của bộ lọc khách: đơn không gắn khách. */
const WALK_IN = "__walk_in__";

export default function SalesPage() {
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const defaultRange = thisMonthRange(todayVN());
  const rangeChanged = range[0] !== defaultRange[0] || range[1] !== defaultRange[1];
  // Số bộ lọc đang khác mặc định, hiện trên nút "Bộ lọc" khi khung lọc đang đóng.
  const activeFilters = [rangeChanged, !!channel, !!customerId].filter(Boolean).length;

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

      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            allowClear
            prefix={<SearchOutlined className="text-muted" />}
            placeholder="Mã đơn hoặc tên khách"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Badge count={filtersOpen ? 0 : activeFilters} size="small" color="#0f6e56">
            <Button icon={<FilterOutlined />} type={filtersOpen ? "primary" : "default"} onClick={() => setFiltersOpen((o) => !o)}>
              Bộ lọc
            </Button>
          </Badge>
        </div>
        {filtersOpen && (
          <Card size="small">
            <div className="space-y-2">
              <DateRangeFilter value={range} onChange={setRange} />
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
              {activeFilters > 0 && (
                <Button
                  type="link"
                  className="px-0!"
                  onClick={() => {
                    setRange(defaultRange);
                    setChannel(null);
                    setCustomerId(null);
                  }}
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          </Card>
        )}
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

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-sm text-muted">
        <span>{formatDate(range[0])} – {formatDate(range[1])}</span>
        <span>{shown.length} đơn</span>
        <span>Doanh thu <b className="whitespace-nowrap text-ink">{formatVnd(revenue)}</b></span>
        {debt > 0 && <span>Còn nợ <b className="whitespace-nowrap text-debt">{formatVnd(debt)}</b></span>}
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
                <Link href={`/ban-hang/${s.id}`} className="block text-ink!">
                  <ListItem extra={<RightOutlined className="text-xs text-muted" />}>
                    <ListItemMeta
                      title={
                        <span className={s.status === "voided" ? "line-through opacity-60" : ""}>
                          <span className="whitespace-nowrap">{s.code}</span> · {customer?.name ?? "Khách lẻ"}
                          {s.status === "voided" && <Tag className="ml-2!">Đã hủy</Tag>}
                        </span>
                      }
                      description={
                        <div className="space-y-0.5">
                          <div>
                            {formatDate(s.date)} · {SALE_CHANNEL_LABEL[s.channel]} · <b className="whitespace-nowrap">{formatVnd(s.total)}</b>
                            <DebtTag sale={s} remaining={remainingOf(s)} loading={debts.loading} />
                          </div>
                          {s.lines.map((l, i) => {
                            const p = products.byId.get(l.productId);
                            return <div key={i}>{p ? `${p.name} ${formatQty(l.qty, p.unit)}` : l.productId}</div>;
                          })}
                        </div>
                      }
                    />
                  </ListItem>
                </Link>
              );
            }}
          />
        )}
        <LoadMore loaded={sales.data.length} hasMore={sales.hasMore} onLoadMore={sales.loadMore} noun="đơn" />
      </Card>
    </div>
  );
}
