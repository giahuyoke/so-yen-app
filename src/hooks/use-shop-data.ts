"use client";

import { collection, doc, limit, orderBy, query, where } from "firebase/firestore";
import { useMemo } from "react";
import { useLiveDoc, useLiveQuery } from "@/hooks/use-live-query";
import { todayVN } from "@/lib/domain/dates";
import type {
  AdjustmentDoc,
  Customer,
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

type DocCollection = "receipts" | "productions" | "adjustments";
type DocOf<C extends DocCollection> = C extends "receipts"
  ? ReceiptDoc
  : C extends "productions"
    ? ProductionDoc
    : AdjustmentDoc;

/** 50 chứng từ mới nhất của một loại. */
export function useRecentDocs<C extends DocCollection>(name: C) {
  return useLiveQuery<DocOf<C>>(`recent-${name}`, (db, shopId) =>
    query(collection(db, "shops", shopId, name), orderBy("createdAt", "desc"), limit(50)),
  );
}

export function useCustomers() {
  const state = useLiveQuery<Customer>("customers", (db, shopId) => query(collection(db, "shops", shopId, "customers")));
  const data = useMemo(() => [...state.data].sort(byVietnameseName), [state.data]);
  const byId = useMemo(() => new Map(data.map((c) => [c.id, c])), [data]);
  return { ...state, data, byId };
}

export function useRecentSales() {
  return useLiveQuery<SaleDoc>("recent-sales", (db, shopId) =>
    query(collection(db, "shops", shopId, "sales"), orderBy("createdAt", "desc"), limit(50)),
  );
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

export function useCustomerPayments(customerId: string) {
  return useLiveQuery<PaymentDoc>(`customer-payments-${customerId}`, (db, shopId) =>
    query(collection(db, "shops", shopId, "payments"), where("customerId", "==", customerId), orderBy("createdAt", "desc"), limit(50)),
  );
}
