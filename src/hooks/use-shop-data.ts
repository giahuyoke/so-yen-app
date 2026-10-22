"use client";

import { collection, doc, documentId, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useShop } from "@/components/shop/shop-provider";
import { useLiveDoc, useLiveQuery } from "@/hooks/use-live-query";
import { getClientDb } from "@/lib/firebase/client";
import { remainingDebtBySale } from "@/lib/domain/debt";
import { todayVN } from "@/lib/domain/dates";
import { resolveTaxConfig, type TaxConfig } from "@/lib/domain/tax";
import type { BankAccount } from "@/lib/domain/vietqr";
import type {
  AdjustmentDoc,
  Customer,
  ExpenseDoc,
  Invite,
  Member,
  MonthStats,
  PaymentDoc,
  Product,
  ProductionDoc,
  ReceiptDoc,
  SaleDoc,
  Supplier,
} from "@/lib/domain/models";

// Firestore sắp theo byte nên "Đường" rơi xuống cuối; sắp lại theo tiếng Việt ở client.
const byVietnameseName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "vi");

export function useProducts() {
  const state = useLiveQuery<Product>("products", (db, shopId) => query(collection(db, "shops", shopId, "products")));
  const data = useMemo(() => [...state.data].sort(byVietnameseName), [state.data]);
  const byId = useMemo(() => new Map(data.map((p) => [p.id, p])), [data]);
  return { ...state, data, byId };
}

export function useSuppliers() {
  const state = useLiveQuery<Supplier>("suppliers", (db, shopId) => query(collection(db, "shops", shopId, "suppliers")));
  const data = useMemo(() => [...state.data].sort(byVietnameseName), [state.data]);
  const byId = useMemo(() => new Map(data.map((s) => [s.id, s])), [data]);
  return { ...state, data, byId };
}

export function useMembers() {
  return useLiveQuery<Member>("members", (db, shopId) => query(collection(db, "shops", shopId, "members")));
}

export function useInvites() {
  return useLiveQuery<Invite>("invites", (db, shopId) => query(collection(db, "shops", shopId, "invites")));
}

export function useCustomers() {
  const state = useLiveQuery<Customer>("customers", (db, shopId) => query(collection(db, "shops", shopId, "customers")));
  const data = useMemo(() => [...state.data].sort(byVietnameseName), [state.data]);
  const byId = useMemo(() => new Map(data.map((c) => [c.id, c])), [data]);
  return { ...state, data, byId };
}

export function useTodaySales() {
  const today = todayVN();
  return useLiveQuery<SaleDoc>(`sales-${today}`, (db, shopId) =>
    query(collection(db, "shops", shopId, "sales"), where("date", "==", today)),
  );
}

export function useMonthStats(month: string) {
  return useLiveDoc<MonthStats>(`stats-${month}`, (db, shopId) => doc(db, "shops", shopId, "stats", month));
}

export function useTopDebtors() {
  return useLiveQuery<Customer>("top-debtors", (db, shopId) =>
    query(collection(db, "shops", shopId, "customers"), where("debtBalance", ">", 0), orderBy("debtBalance", "desc"), limit(5)),
  );
}

export function useCustomerSales(customerId: string) {
  return useLiveQuery<SaleDoc>(`customer-sales-${customerId}`, (db, shopId) =>
    query(collection(db, "shops", shopId, "sales"), where("customerId", "==", customerId), orderBy("createdAt", "desc"), limit(50)),
  );
}

export function useSale(id: string) {
  return useLiveDoc<SaleDoc>(`sale-${id}`, (db, shopId) => doc(db, "shops", shopId, "sales", id));
}

/** Phiếu thu gắn với một đơn, mới nhất trước. */
export function useSalePayments(saleId: string) {
  const state = useLiveQuery<PaymentDoc>(`sale-payments-${saleId}`, (db, shopId) =>
    query(collection(db, "shops", shopId, "payments"), where("saleId", "==", saleId)),
  );
  const data = useMemo(() => [...state.data].sort((a, b) => b.date.localeCompare(a.date)), [state.data]);
  return { ...state, data };
}

export function useCustomerPayments(customerId: string) {
  return useLiveQuery<PaymentDoc>(`customer-payments-${customerId}`, (db, shopId) =>
    query(collection(db, "shops", shopId, "payments"), where("customerId", "==", customerId), orderBy("createdAt", "desc"), limit(50)),
  );
}

/** Stats các tháng từ `from` đến `to` (dạng YYYY-MM), chỉ gồm tháng đã có dữ liệu. */
export function useStatsRange(from: string, to: string) {
  return useLiveQuery<MonthStats>(`stats-${from}-${to}`, (db, shopId) =>
    query(collection(db, "shops", shopId, "stats"), where(documentId(), ">=", from), where(documentId(), "<=", to)),
  );
}

export function useTaxConfig(): { data: TaxConfig; loading: boolean } {
  const shop = useLiveDoc<{ id: string; taxConfig?: Partial<TaxConfig> }>("shop", (db, shopId) => doc(db, "shops", shopId));
  const data = useMemo(() => resolveTaxConfig(shop.data?.taxConfig), [shop.data?.taxConfig]);
  return { data, loading: shop.loading };
}

/** Tài khoản nhận chuyển khoản in trên hóa đơn; null khi chưa cài. */
export function useBankAccount(): { data: BankAccount | null; loading: boolean } {
  const shop = useLiveDoc<{ id: string; bankAccount?: BankAccount }>("shop", (db, shopId) => doc(db, "shops", shopId));
  return { data: shop.data?.bankAccount ?? null, loading: shop.loading };
}

/** Chế biến trong khoảng ngày (YYYY-MM-DD). */
export function useProductionsInRange(from: string, to: string) {
  return useLiveQuery<ProductionDoc>(`productions-${from}-${to}`, (db, shopId) =>
    query(collection(db, "shops", shopId, "productions"), where("date", ">=", from), where("date", "<=", to)),
  );
}

/** Phiếu nhập đến hết ngày `to`, mới nhất trước; dùng để tìm nguồn hàng cho báo cáo hao hụt. */
export function useReceiptsUpTo(to: string) {
  return useLiveQuery<ReceiptDoc>(`receipts-to-${to}`, (db, shopId) =>
    query(collection(db, "shops", shopId, "receipts"), where("date", "<=", to), orderBy("date", "desc"), limit(500)),
  );
}

export function useDebtors() {
  return useLiveQuery<Customer>("debtors", (db, shopId) =>
    query(collection(db, "shops", shopId, "customers"), where("debtBalance", ">", 0), orderBy("debtBalance", "desc")),
  );
}

type RangeCollection = "sales" | "expenses" | "receipts" | "productions" | "adjustments";
type RangeDocOf<C extends RangeCollection> = C extends "sales"
  ? SaleDoc
  : C extends "expenses"
    ? ExpenseDoc
    : C extends "receipts"
      ? ReceiptDoc
      : C extends "productions"
        ? ProductionDoc
        : AdjustmentDoc;

const PAGE_SIZE = 100;

/**
 * Chứng từ có ngày nghiệp vụ trong [from, to] (YYYY-MM-DD), mới nhất trước.
 * Lọc ngày ở Firestore; "Tải thêm" tăng giới hạn thêm một trang.
 */
export function useDocsInRange<C extends RangeCollection>(name: C, from: string, to: string) {
  const [pages, setPages] = useState({ key: "", count: 1 });
  const rangeKey = `${from}_${to}`;
  // Đổi khoảng ngày thì quay về trang đầu.
  const count = pages.key === rangeKey ? pages.count : 1;
  const max = count * PAGE_SIZE;
  const state = useLiveQuery<RangeDocOf<C> & { createdAt?: { toMillis(): number } }>(
    `range-${name}-${rangeKey}-${max}`,
    (db, shopId) =>
      query(
        collection(db, "shops", shopId, name),
        where("date", ">=", from),
        where("date", "<=", to),
        orderBy("date", "desc"),
        limit(max),
      ),
  );
  // Trong cùng một ngày, chứng từ tạo sau đứng trước.
  const data = useMemo(
    () =>
      [...state.data].sort(
        (a, b) => b.date.localeCompare(a.date) || (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
      ),
    [state.data],
  );
  return {
    ...state,
    data,
    hasMore: state.data.length >= max,
    loadMore: () => setPages({ key: rangeKey, count: count + 1 }),
  };
}

/**
 * Số còn nợ của từng đơn (saleId → số tiền), cho mọi khách đang nợ. Đọc các
 * đơn của khách đang nợ theo nhóm 30 khách (giới hạn của truy vấn "in").
 */
export function useRemainingDebts(): { bySale: Map<string, number>; loading: boolean } {
  const { shop } = useShop();
  const debtors = useDebtors();
  const ids = debtors.data.map((c) => c.id).sort();
  const idsKey = ids.join(",");
  const [salesByChunk, setSalesByChunk] = useState<{ key: string; chunks: Record<number, SaleDoc[]> }>({ key: "", chunks: {} });

  useEffect(() => {
    if (!idsKey) return;
    const all = idsKey.split(",");
    const unsubscribes: (() => void)[] = [];
    for (let i = 0; i < all.length; i += 30) {
      const chunk = all.slice(i, i + 30);
      unsubscribes.push(
        onSnapshot(
          query(collection(getClientDb(), "shops", shop.id, "sales"), where("customerId", "in", chunk), orderBy("createdAt", "desc")),
          (snap) =>
            setSalesByChunk((prev) => ({
              key: idsKey,
              chunks: { ...(prev.key === idsKey ? prev.chunks : {}), [i]: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SaleDoc) },
            })),
        ),
      );
    }
    return () => unsubscribes.forEach((u) => u());
  }, [shop.id, idsKey]);

  const chunkCount = Math.ceil(ids.length / 30);
  const current = salesByChunk.key === idsKey ? salesByChunk.chunks : null;
  const loading = debtors.loading || Object.keys(current ?? {}).length < chunkCount;
  const bySale = useMemo(() => {
    const result = new Map<string, number>();
    const sales = Object.values(current ?? {}).flat();
    for (const customer of debtors.data) {
      const own = sales.filter((s) => s.customerId === customer.id);
      for (const [id, amount] of remainingDebtBySale(own, customer.debtBalance ?? 0)) result.set(id, amount);
    }
    return result;
  }, [current, debtors.data]);
  return { bySale, loading };
}
