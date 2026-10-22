"use client";

import { collection, limit, orderBy, query } from "firebase/firestore";
import { useMemo } from "react";
import { useLiveQuery } from "@/hooks/use-live-query";
import type { AdjustmentDoc, Invite, Member, Product, ProductionDoc, ReceiptDoc, Supplier } from "@/lib/domain/models";

export function useProducts() {
  const state = useLiveQuery<Product>("products", (db, shopId) =>
    query(collection(db, "shops", shopId, "products"), orderBy("name")),
  );
  const byId = useMemo(() => new Map(state.data.map((p) => [p.id, p])), [state.data]);
  return { ...state, byId };
}

export function useSuppliers() {
  const state = useLiveQuery<Supplier>("suppliers", (db, shopId) =>
    query(collection(db, "shops", shopId, "suppliers"), orderBy("name")),
  );
  const byId = useMemo(() => new Map(state.data.map((s) => [s.id, s])), [state.data]);
  return { ...state, byId };
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
