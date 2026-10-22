"use client";

import { collection, limit, orderBy, query } from "firebase/firestore";
import { useMemo } from "react";
import { useLiveQuery } from "@/hooks/use-live-query";
import type { AdjustmentDoc, Invite, Member, Product, ProductionDoc, ReceiptDoc, Supplier } from "@/lib/domain/models";

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
