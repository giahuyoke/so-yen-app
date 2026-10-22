import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";
import { inviteInput, removeMemberInput, shopNameInput, taxConfigInput } from "@/lib/domain/schemas";
import type { Actor } from "@/server/actor";

export interface MyShop {
  id: string;
  name: string;
  ownerUid: string;
}

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

function memberData(actor: Actor) {
  return {
    email: actor.email?.toLowerCase() ?? "",
    displayName: actor.name ?? actor.email ?? actor.uid,
    joinedAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Cửa hàng của người dùng. Nếu chưa thuộc cửa hàng nào mà có lời mời khớp
 * email đã xác minh thì tự thêm vào cửa hàng đó và xóa lời mời.
 */
export async function findMyShop(db: Firestore, actor: Actor): Promise<MyShop | null> {
  const owned = await db.collection("shops").where("memberUids", "array-contains", actor.uid).limit(1).get();
  if (!owned.empty) {
    const doc = owned.docs[0];
    return { id: doc.id, name: doc.get("name") as string, ownerUid: doc.get("ownerUid") as string };
  }

  if (!actor.email || !actor.emailVerified) return null;
  const invites = await db
    .collectionGroup("invites")
    .where("email", "==", actor.email.toLowerCase())
    .limit(1)
    .get();
  if (invites.empty) return null;

  const inviteRef = invites.docs[0].ref;
  const shop = inviteRef.parent.parent;
  if (!shop) return null;

  const joined = await db.runTransaction(async (tx) => {
    const [shopSnap, inviteSnap] = await tx.getAll(shop, inviteRef);
    if (!shopSnap.exists || !inviteSnap.exists) return null;
    tx.update(shop, { memberUids: FieldValue.arrayUnion(actor.uid) });
    tx.set(shop.collection("members").doc(actor.uid), memberData(actor));
    tx.delete(inviteRef);
    return { id: shop.id, name: shopSnap.get("name") as string, ownerUid: shopSnap.get("ownerUid") as string };
  });
  return joined;
}

export async function createShop(db: Firestore, actor: Actor, input: unknown): Promise<MyShop> {
  const { name } = shopNameInput.parse(input);
  if (await findMyShop(db, actor)) {
    throw new AppError("CONFLICT", "Bạn đã thuộc một cửa hàng.");
  }
  const ref = db.collection("shops").doc();
  const batch = db.batch();
  batch.set(ref, {
    name,
    ownerUid: actor.uid,
    memberUids: [actor.uid],
    counters: { sale: 0 },
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(ref.collection("members").doc(actor.uid), memberData(actor));
  await batch.commit();
  return { id: ref.id, name, ownerUid: actor.uid };
}

export async function inviteMember(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const { email } = inviteInput.parse(input);
  const shop = shopRef(db, shopId);
  const existing = await shop.collection("members").where("email", "==", email).limit(1).get();
  if (!existing.empty) throw new AppError("CONFLICT", "Người này đã là thành viên.");
  await shop.collection("invites").doc(email).set({
    email,
    invitedBy: actor.uid,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { email };
}

export async function cancelInvite(db: Firestore, shopId: string, input: unknown) {
  const { email } = inviteInput.parse(input);
  await shopRef(db, shopId).collection("invites").doc(email).delete();
  return { email };
}

export async function removeMember(db: Firestore, shopId: string, input: unknown) {
  const { uid } = removeMemberInput.parse(input);
  const shop = shopRef(db, shopId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(shop);
    if (snap.get("ownerUid") === uid) throw new AppError("FORBIDDEN", "Không thể gỡ chủ cửa hàng.");
    tx.update(shop, { memberUids: FieldValue.arrayRemove(uid) });
    tx.delete(shop.collection("members").doc(uid));
  });
  return { uid };
}

export async function updateTaxConfig(db: Firestore, shopId: string, input: unknown) {
  const taxConfig = taxConfigInput.parse(input);
  await shopRef(db, shopId).update({ taxConfig });
  return taxConfig;
}
