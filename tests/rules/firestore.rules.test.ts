import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";

const SHOP = "shop_rules_01";
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-so-yen",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "shops", SHOP), { name: "Yến", ownerUid: "u1", memberUids: ["u1"] });
    await setDoc(doc(db, "shops", SHOP, "products", "p1"), { name: "Yến thô", stockQty: 10 });
    await setDoc(doc(db, "shops", SHOP, "suppliers", "s1"), {
      name: "Anh Ba", createdBy: "u1", createdAt: new Date(0), updatedAt: new Date(0),
    });
  });
});

const member = () => env.authenticatedContext("u1").firestore();
const outsider = () => env.authenticatedContext("u9").firestore();

describe("đọc", () => {
  test("thành viên đọc được cửa hàng và dữ liệu con", async () => {
    await assertSucceeds(getDoc(doc(member(), "shops", SHOP)));
    await assertSucceeds(getDoc(doc(member(), "shops", SHOP, "products", "p1")));
    await assertSucceeds(getDocs(query(collection(member(), "shops"), where("memberUids", "array-contains", "u1"))));
  });

  test("người ngoài và khách chưa đăng nhập không đọc được", async () => {
    await assertFails(getDoc(doc(outsider(), "shops", SHOP)));
    await assertFails(getDoc(doc(outsider(), "shops", SHOP, "products", "p1")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "shops", SHOP, "products", "p1")));
  });
});

describe("ghi", () => {
  test("client không ghi được cửa hàng, sản phẩm, chứng từ, movements", async () => {
    await assertFails(updateDoc(doc(member(), "shops", SHOP), { memberUids: ["u1", "u9"] }));
    await assertFails(updateDoc(doc(member(), "shops", SHOP, "products", "p1"), { stockQty: 999 }));
    await assertFails(setDoc(doc(member(), "shops", SHOP, "receipts", "r1"), { total: 1 }));
    await assertFails(setDoc(doc(member(), "shops", SHOP, "movements", "m1"), { qtyDelta: 1 }));
    await assertFails(setDoc(doc(member(), "shops", SHOP, "invites", "a@b.com"), { email: "a@b.com" }));
  });

  test("thành viên tạo và sửa được nhà cung cấp hợp lệ", async () => {
    await assertSucceeds(
      setDoc(doc(member(), "shops", SHOP, "suppliers", "s2"), {
        name: "Chị Tư", phone: "0900000000", note: "", createdBy: "u1",
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(member(), "shops", SHOP, "suppliers", "s1"), { name: "Anh Ba Sóc Trăng", updatedAt: serverTimestamp() }),
    );
  });

  test("chặn nhà cung cấp sai dữ liệu, giả createdBy, xóa, hoặc người ngoài", async () => {
    await assertFails(
      setDoc(doc(member(), "shops", SHOP, "suppliers", "s3"), {
        name: "", createdBy: "u1", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(member(), "shops", SHOP, "suppliers", "s3"), {
        name: "X", debt: 1, createdBy: "u1", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(member(), "shops", SHOP, "suppliers", "s3"), {
        name: "X", createdBy: "u2", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(updateDoc(doc(member(), "shops", SHOP, "suppliers", "s1"), { createdBy: "u2", updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(member(), "shops", SHOP, "suppliers", "s1")));
    await assertFails(
      setDoc(doc(outsider(), "shops", SHOP, "suppliers", "s3"), {
        name: "X", createdBy: "u9", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }),
    );
  });
});

describe("khách hàng", () => {
  const valid = () => ({
    name: "Chị Lan", phone: "0900000000", type: "agent", note: "",
    createdBy: "u1", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });

  test("thành viên tạo và sửa thông tin khách", async () => {
    await assertSucceeds(setDoc(doc(member(), "shops", SHOP, "customers", "c1"), valid()));
    await assertSucceeds(
      updateDoc(doc(member(), "shops", SHOP, "customers", "c1"), { phone: "0911111111", updatedAt: serverTimestamp() }),
    );
  });

  test("client không tự ghi công nợ hay doanh số", async () => {
    await assertFails(setDoc(doc(member(), "shops", SHOP, "customers", "c2"), { ...valid(), debtBalance: 0 }));
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "shops", SHOP, "customers", "c3"), {
        name: "Anh Ba", type: "retail", createdBy: "u1", createdAt: new Date(0), updatedAt: new Date(0), debtBalance: 1_000_000,
      });
    });
    await assertFails(
      updateDoc(doc(member(), "shops", SHOP, "customers", "c3"), { debtBalance: 0, updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(
      updateDoc(doc(member(), "shops", SHOP, "customers", "c3"), { name: "Anh Ba Bến Tre", updatedAt: serverTimestamp() }),
    );
  });

  test("chặn loại khách lạ, người ngoài, xóa", async () => {
    await assertFails(setDoc(doc(member(), "shops", SHOP, "customers", "c4"), { ...valid(), type: "vip" }));
    await assertFails(setDoc(doc(outsider(), "shops", SHOP, "customers", "c4"), { ...valid(), createdBy: "u9" }));
    await assertSucceeds(setDoc(doc(member(), "shops", SHOP, "customers", "c5"), valid()));
    await assertFails(deleteDoc(doc(member(), "shops", SHOP, "customers", "c5")));
  });

  test("client không ghi được đơn bán, phiếu thu, stats", async () => {
    await assertFails(setDoc(doc(member(), "shops", SHOP, "sales", "s1"), { total: 1 }));
    await assertFails(setDoc(doc(member(), "shops", SHOP, "payments", "p1"), { amount: 1 }));
    await assertFails(setDoc(doc(member(), "shops", SHOP, "stats", "2026-10"), { revenue: 1 }));
  });
});
