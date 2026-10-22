"use client";

import { onSnapshot, type DocumentReference, type Firestore, type Query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useShop } from "@/components/shop/shop-provider";
import { getClientDb } from "@/lib/firebase/client";

export interface LiveQueryState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

/**
 * Lắng nghe realtime một truy vấn trong cửa hàng hiện tại. `key` phải đổi
 * mỗi khi truy vấn đổi, vì hàm build không được đưa vào deps.
 */
export function useLiveQuery<T extends { id: string }>(
  key: string,
  build: (db: Firestore, shopId: string) => Query,
): LiveQueryState<T> {
  const { shop } = useShop();
  const [state, setState] = useState<LiveQueryState<T>>({ data: [], loading: true, error: null });

  useEffect(() => {
    return onSnapshot(
      build(getClientDb(), shop.id),
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T), loading: false, error: null }),
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop.id, key]);

  return state;
}

/** Lắng nghe realtime một document trong cửa hàng hiện tại; data = null khi chưa có. */
export function useLiveDoc<T extends { id: string }>(
  key: string,
  build: (db: Firestore, shopId: string) => DocumentReference,
): { data: T | null; loading: boolean } {
  const { shop } = useShop();
  const [state, setState] = useState<{ data: T | null; loading: boolean }>({ data: null, loading: true });

  useEffect(() => {
    return onSnapshot(
      build(getClientDb(), shop.id),
      (snap) => setState({ data: snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null, loading: false }),
      () => setState({ data: null, loading: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop.id, key]);

  return state;
}
