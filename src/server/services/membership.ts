import type { Firestore } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";

export function shopRef(db: Firestore, shopId: string) {
  return db.collection("shops").doc(shopId);
}

export async function assertMember(db: Firestore, shopId: string, uid: string): Promise<void> {
  const snap = await shopRef(db, shopId).get();
  const memberUids = snap.get("memberUids") as string[] | undefined;
  if (!snap.exists || !memberUids?.includes(uid)) {
    throw new AppError("FORBIDDEN", "Bạn không thuộc cửa hàng này.");
  }
}
