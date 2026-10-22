import { beforeEach, describe, expect, test } from "vitest";
import {
  assertMember,
  cancelInvite,
  createShop,
  findMyShop,
  inviteMember,
  removeMember,
} from "@/server/services/membership";
import { clearFirestore, db, owner, seedShop, SHOP_ID, sister, stranger } from "./helpers";

beforeEach(clearFirestore);

describe("createShop", () => {
  test("tạo cửa hàng, người tạo là chủ và thành viên", async () => {
    const shop = await createShop(db(), owner, { name: "Yến Nhà Mình" });
    expect(shop.name).toBe("Yến Nhà Mình");
    const snap = await db().collection("shops").doc(shop.id).get();
    expect(snap.data()).toMatchObject({ ownerUid: owner.uid, memberUids: [owner.uid], counters: { sale: 0 } });
    const member = await db().collection("shops").doc(shop.id).collection("members").doc(owner.uid).get();
    expect(member.get("email")).toBe(owner.email);
  });

  test("không tạo được cửa hàng thứ hai", async () => {
    await createShop(db(), owner, { name: "A" });
    await expect(createShop(db(), owner, { name: "B" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("findMyShop", () => {
  test("null khi chưa có cửa hàng và lời mời", async () => {
    expect(await findMyShop(db(), stranger)).toBeNull();
  });

  test("tìm theo memberUids", async () => {
    await seedShop();
    expect(await findMyShop(db(), owner)).toEqual({ id: SHOP_ID, name: "Yến Test" });
  });

  test("tự vào cửa hàng khi có lời mời khớp email đã xác minh", async () => {
    await seedShop();
    await inviteMember(db(), SHOP_ID, owner, { email: "EM@example.com" });
    expect(await findMyShop(db(), sister)).toEqual({ id: SHOP_ID, name: "Yến Test" });
    const shop = await db().collection("shops").doc(SHOP_ID).get();
    expect(shop.get("memberUids")).toEqual([owner.uid, sister.uid]);
    const invite = await db().collection("shops").doc(SHOP_ID).collection("invites").doc("em@example.com").get();
    expect(invite.exists).toBe(false);
  });

  test("bỏ qua lời mời khi email chưa xác minh", async () => {
    await seedShop();
    await inviteMember(db(), SHOP_ID, owner, { email: sister.email });
    expect(await findMyShop(db(), { ...sister, emailVerified: false })).toBeNull();
  });
});

describe("inviteMember / cancelInvite / removeMember", () => {
  test("không mời người đã là thành viên", async () => {
    await seedShop();
    await createMemberDoc(owner.uid, owner.email!);
    await expect(inviteMember(db(), SHOP_ID, owner, { email: owner.email })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  test("hủy lời mời", async () => {
    await seedShop();
    await inviteMember(db(), SHOP_ID, owner, { email: sister.email });
    await cancelInvite(db(), SHOP_ID, { email: sister.email });
    expect(await findMyShop(db(), sister)).toBeNull();
  });

  test("gỡ thành viên, không gỡ được chủ", async () => {
    await seedShop([owner.uid, sister.uid]);
    await removeMember(db(), SHOP_ID, { uid: sister.uid });
    await expect(assertMember(db(), SHOP_ID, sister.uid)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(removeMember(db(), SHOP_ID, { uid: owner.uid })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("assertMember chặn người ngoài", async () => {
    await seedShop();
    await expect(assertMember(db(), SHOP_ID, stranger.uid)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(assertMember(db(), "no_such_shop", owner.uid)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

async function createMemberDoc(uid: string, email: string) {
  await db().collection("shops").doc(SHOP_ID).collection("members").doc(uid).set({ email, displayName: email });
}
