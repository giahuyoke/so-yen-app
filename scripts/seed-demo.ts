/**
 * Nạp bộ dữ liệu mẫu vào Emulator để thử app: khoảng 15 tháng nhập kho, chế
 * biến, bán hàng, thu nợ, chi phí, có cả chứng từ đã hủy.
 *
 *   npm run emulators   # terminal 1
 *   npm run seed:demo   # terminal 2; chạy lại thì xóa cửa hàng mẫu và nạp lại
 *
 * Đăng nhập: bấm "Tiếp tục với Google" rồi chọn tài khoản "Chủ Demo" trong
 * màn hình của Auth Emulator. Script chỉ chạy với Emulator, không bao giờ ghi
 * vào Firebase thật.
 */
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
process.env.GCLOUD_PROJECT ||= "demo-so-yen";

import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { todayVN } from "@/lib/domain/dates";
import type { ExpenseCategory, SaleChannel } from "@/lib/domain/models";
import type { Actor } from "@/server/actor";
import { getAdminDb } from "@/server/firebase-admin";
import { createAdjustment } from "@/server/services/adjustments";
import { createExpense, voidExpense } from "@/server/services/expenses";
import { createPayment } from "@/server/services/payments";
import { createProduction } from "@/server/services/productions";
import { createReceipt } from "@/server/services/receipts";
import { createSale, voidSale } from "@/server/services/sales";

const SHOP_ID = "demo_shop_000001";
const OWNER = { sub: "demo-owner-google", email: "chu.demo@example.com", name: "Chủ Demo" };
const MONTHS = 16;

const P = {
  rawHome: "demo_raw_home",
  rawBuy: "demo_raw_buy1",
  dep: "demo_clean_dep",
  soi: "demo_clean_soi",
  vun: "demo_clean_vun",
  jar70: "demo_steam_70ml",
  combo: "demo_combo_6hu",
  sugar: "demo_sup_sugar",
  jar: "demo_sup_jar70",
  box: "demo_sup_box01",
} as const;

const PRODUCTS = [
  { id: P.rawHome, name: "Yến thô nhà nuôi", kind: "raw", unit: "g", taxGroup: "self_raw", suggestedPrice: 27_000, lowStockThreshold: 300 },
  { id: P.rawBuy, name: "Yến thô mua về", kind: "raw", unit: "g", taxGroup: "resale", suggestedPrice: 30_000, lowStockThreshold: 0 },
  { id: P.dep, name: "Yến tinh tổ đẹp", kind: "clean", unit: "g", taxGroup: "processed", suggestedPrice: 45_000, lowStockThreshold: 300 },
  { id: P.soi, name: "Yến tinh sợi", kind: "clean", unit: "g", taxGroup: "processed", suggestedPrice: 38_000, lowStockThreshold: 0 },
  { id: P.vun, name: "Yến vụn", kind: "clean", unit: "g", taxGroup: "processed", suggestedPrice: 25_000, lowStockThreshold: 0 },
  { id: P.jar70, name: "Yến chưng đường phèn 70ml", kind: "steamed", unit: "piece", taxGroup: "processed", suggestedPrice: 75_000, lowStockThreshold: 10, gramPerUnit: 3 },
  { id: P.combo, name: "Hộp quà 6 hũ yến chưng", kind: "combo", unit: "piece", taxGroup: "processed", suggestedPrice: 480_000, lowStockThreshold: 2, gramPerUnit: 18 },
  { id: P.sugar, name: "Đường phèn (gói 1 hũ)", kind: "supply", unit: "piece", taxGroup: "processed", suggestedPrice: 0, lowStockThreshold: 20 },
  { id: P.jar, name: "Hũ thủy tinh 70ml", kind: "supply", unit: "piece", taxGroup: "processed", suggestedPrice: 0, lowStockThreshold: 20 },
  { id: P.box, name: "Hộp quà cao cấp", kind: "supply", unit: "piece", taxGroup: "processed", suggestedPrice: 0, lowStockThreshold: 5 },
] as const;

const SUPPLIERS = [
  { id: "demo_supp_ba", name: "Anh Ba - Khánh Hòa", phone: "0905111222", note: "Yến thô đảo, ít lông" },
  { id: "demo_supp_tu", name: "Chị Tư - Kiên Giang", phone: "0918333444", note: "Giá mềm, hao hụt cao hơn" },
];

const CUSTOMERS = [
  { id: "demo_cust_lan", name: "Chị Lan (đại lý Q.3)", phone: "0903555666", type: "agent", note: "Lấy hàng đầu tháng, trả góp" },
  { id: "demo_cust_hung", name: "Anh Hùng (đại lý Biên Hòa)", phone: "0937777888", type: "agent", note: "" },
  { id: "demo_cust_anan", name: "Shop Mẹ Bầu An An", phone: "0981222333", type: "agent", note: "Chỉ lấy yến chưng, hộp quà" },
  { id: "demo_cust_mai", name: "Cô Mai", phone: "0909123456", type: "retail", note: "Khách quen, thích tổ đẹp" },
  { id: "demo_cust_bay", name: "Chú Bảy", phone: "0912654321", type: "retail", note: "" },
  { id: "demo_cust_thao", name: "Thảo (Facebook)", phone: "", type: "retail", note: "Giao hàng Hà Nội" },
] as const;
const AGENTS = CUSTOMERS.filter((c) => c.type === "agent").map((c) => c.id);
const RETAIL = CUSTOMERS.filter((c) => c.type === "retail").map((c) => c.id);

// PRNG cố định để mỗi lần nạp ra cùng một bộ số.
let seed = 20261022;
function rand() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min: number, max: number) => Math.floor(min + rand() * (max - min + 1));
const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

let seq = 0;
const nextId = (prefix: string) => `demo_${prefix}_${String(++seq).padStart(5, "0")}`;
const pad = (n: number) => String(n).padStart(2, "0");

async function signInOwner(): Promise<Actor> {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const idToken = JSON.stringify({ sub: OWNER.sub, email: OWNER.email, email_verified: true, name: OWNER.name });
  const res = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`,
      requestUri: "http://localhost",
      returnSecureToken: true,
    }),
  });
  if (!res.ok) throw new Error(`Auth Emulator trả lỗi ${res.status}. Đã chạy \`npm run emulators\` chưa?`);
  const { localId } = (await res.json()) as { localId: string };
  return { uid: localId, email: OWNER.email, emailVerified: true, name: OWNER.name };
}

async function resetShop(db: Firestore, actor: Actor) {
  // Tài khoản demo chỉ được thuộc một cửa hàng; xóa mọi cửa hàng nó đang ở.
  const owned = await db.collection("shops").where("memberUids", "array-contains", actor.uid).get();
  for (const doc of owned.docs) await db.recursiveDelete(doc.ref);
  await db.recursiveDelete(db.collection("shops").doc(SHOP_ID));

  const shop = db.collection("shops").doc(SHOP_ID);
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(shop, { name: "Yến Sào Demo", ownerUid: actor.uid, memberUids: [actor.uid], counters: { sale: 0 }, createdAt: now });
  batch.set(shop.collection("members").doc(actor.uid), { email: OWNER.email, displayName: OWNER.name, joinedAt: now });
  for (const { id, ...p } of PRODUCTS) {
    batch.set(shop.collection("products").doc(id), { ...p, stockQty: 0, avgCost: 0, archived: false, createdAt: now });
  }
  for (const { id, ...s } of SUPPLIERS) {
    batch.set(shop.collection("suppliers").doc(id), { ...s, createdBy: actor.uid, createdAt: now, updatedAt: now });
  }
  for (const { id, ...c } of CUSTOMERS) {
    batch.set(shop.collection("customers").doc(id), { ...c, createdBy: actor.uid, createdAt: now, updatedAt: now });
  }
  await batch.commit();
}

async function stockOf(db: Firestore): Promise<Map<string, number>> {
  const snap = await db.collection("shops").doc(SHOP_ID).collection("products").get();
  return new Map(snap.docs.map((d) => [d.id, d.get("stockQty") as number]));
}

/** Tháng cao điểm (cận Tết, Trung thu) bán nhiều hơn. */
function seasonFactor(month: number) {
  return month === 1 || month === 2 || month === 12 ? 1.4 : month === 9 ? 1.2 : 1;
}

async function seedMonth(db: Firestore, actor: Actor, year: number, month: number, lastDay: number) {
  const date = (day: number) => `${year}-${pad(month)}-${pad(Math.min(day, lastDay))}`;
  const supplier = month % 2 === 0 ? SUPPLIERS[0] : SUPPLIERS[1];
  const season = seasonFactor(month);

  // Nhập kho đầu tháng.
  await createReceipt(db, SHOP_ID, actor, {
    id: nextId("rcpt"), kind: "harvest", date: date(1), note: "Thu hoạch nhà yến",
    lines: [{ productId: P.rawHome, qty: roundTo(between(1800, 2400) * season, 10), totalCost: 0 }],
  });
  if (lastDay < 2) return;
  const buyQty = roundTo(between(900, 1200) * season, 50);
  await createReceipt(db, SHOP_ID, actor, {
    id: nextId("rcpt"), kind: "purchase", date: date(2), supplierId: supplier.id, note: "",
    lines: [{ productId: P.rawBuy, qty: buyQty, totalCost: buyQty * between(23, 27) * 1000 }],
  });
  await createReceipt(db, SHOP_ID, actor, {
    id: nextId("rcpt"), kind: "purchase", date: date(2), supplierId: null, note: "Vật tư chưng, đóng hộp",
    lines: [
      { productId: P.sugar, qty: 60, totalCost: 60 * 3_000 },
      { productId: P.jar, qty: 60, totalCost: 60 * 5_500 },
      { productId: P.box, qty: 6, totalCost: 6 * 35_000 },
    ],
  });
  if (lastDay < 4) return;

  // Làm sạch: hàng nhà hao khoảng 26%, hàng mua tùy nhà cung cấp.
  const cleanRun = async (productId: string, qty: number, lossRate: number, day: number) => {
    const out = qty * (1 - lossRate);
    await createProduction(db, SHOP_ID, actor, {
      id: nextId("prod"), kind: "clean", date: date(day), note: "",
      inputs: [{ productId, qty }],
      outputs: [
        { productId: P.dep, qty: Math.round(out * 0.82), gramPerUnit: 1 },
        { productId: P.soi, qty: Math.round(out * 0.12), gramPerUnit: 1 },
        { productId: P.vun, qty: Math.round(out * 0.06), gramPerUnit: 1 },
      ],
    });
  };
  await cleanRun(P.rawHome, roundTo(1300 * season, 10), 0.24 + rand() * 0.04, 4);
  const buyLoss = supplier.id === SUPPLIERS[0].id ? 0.29 : 0.35;
  await cleanRun(P.rawBuy, roundTo(buyQty * 0.85, 10), buyLoss + rand() * 0.04, 5);
  if (lastDay < 6) return;

  // Chưng yến sợi thành hũ 70ml (3g/hũ), rồi đóng hộp quà 6 hũ.
  const stock = await stockOf(db);
  const jars = Math.min(50, Math.floor((stock.get(P.soi) ?? 0) / 3), stock.get(P.sugar) ?? 0, stock.get(P.jar) ?? 0);
  if (jars > 0) {
    await createProduction(db, SHOP_ID, actor, {
      id: nextId("prod"), kind: "steam", date: date(6), note: "",
      inputs: [{ productId: P.soi, qty: jars * 3 }, { productId: P.sugar, qty: jars }, { productId: P.jar, qty: jars }],
      outputs: [{ productId: P.jar70, qty: jars, gramPerUnit: 3 }],
    });
  }
  const combos = Math.min(Math.round(4 * season), Math.floor(((stock.get(P.jar70) ?? 0) + jars) / 6), stock.get(P.box) ?? 0);
  if (combos > 0) {
    await createProduction(db, SHOP_ID, actor, {
      id: nextId("prod"), kind: "pack", date: date(7), note: "",
      inputs: [{ productId: P.jar70, qty: combos * 6 }, { productId: P.box, qty: combos }],
      outputs: [{ productId: P.combo, qty: combos, gramPerUnit: 18 }],
    });
  }

  // Bán hàng rải từ ngày 8, mỗi đơn lấy theo tồn thực tế nên không bao giờ âm kho.
  const saleCount = Math.round(between(9, 12) * season);
  const days = Array.from({ length: saleCount }, () => between(8, 28)).sort((a, b) => a - b);
  for (const day of days) {
    if (day > lastDay) break;
    await randomSale(db, actor, date(day));
  }

  // Thu nợ cuối tháng.
  if (lastDay >= 25) {
    for (const id of AGENTS) {
      const debt = ((await db.collection("shops").doc(SHOP_ID).collection("customers").doc(id).get()).get("debtBalance") as number) ?? 0;
      if (debt <= 0 || rand() < 0.25) continue;
      const amount = Math.min(debt, roundTo(debt * (0.5 + rand() * 0.5), 100_000)) || debt;
      await createPayment(db, SHOP_ID, actor, {
        id: nextId("pay"), customerId: id, date: date(25), amount, method: pick(["cash", "transfer", "transfer"] as const), note: "",
      });
    }
  }

  // Chi phí.
  const expenses: [number, ExpenseCategory, number, string][] = [
    [1, "nest", roundTo(between(2_500_000, 3_500_000), 50_000), "Điện, nước, công chăm nhà yến"],
    [10, "ads", roundTo(between(1_200_000, 2_800_000) * season, 50_000), "Quảng cáo Facebook"],
    [15, "shipping", roundTo(between(300_000, 900_000), 10_000), "Ship đơn tỉnh"],
    [27, "shipping", roundTo(between(200_000, 700_000), 10_000), "Ship đơn Hà Nội"],
    [28, "platform_fee", roundTo(between(400_000, 1_200_000), 10_000), "Phí sàn Shopee"],
  ];
  if (month % 3 === 0) expenses.push([20, "other", roundTo(between(500_000, 1_500_000), 50_000), "Mua cân điện tử, dụng cụ nhặt lông"]);
  for (const [day, category, amount, note] of expenses) {
    if (day > lastDay) continue;
    await createExpense(db, SHOP_ID, actor, { id: nextId("exp"), date: date(day), category, amount, note });
  }
}

const CHANNELS: SaleChannel[] = ["zalo", "zalo", "zalo", "facebook", "facebook", "shopee", "store", "other"];

async function randomSale(db: Firestore, actor: Actor, date: string, forceRetail = false) {
  const stock = await stockOf(db);
  const agent = !forceRetail && rand() < 0.35;
  const want: [string, number][] = agent
    ? [
        [P.dep, roundTo(between(200, 400), 50)],
        [pick([P.rawHome, P.rawBuy, P.jar70, P.combo]), 0],
      ]
    : [[pick([P.dep, P.dep, P.vun, P.jar70, P.jar70, P.combo, P.rawHome]), 0]];
  const lines: { productId: string; qty: number; price: number }[] = [];
  for (const [productId, wanted] of want) {
    const product = PRODUCTS.find((p) => p.id === productId)!;
    const defaultQty =
      productId === P.jar70 ? between(agent ? 10 : 2, agent ? 20 : 6)
      : productId === P.combo ? between(1, agent ? 3 : 1)
      : productId === P.vun ? roundTo(between(50, 100), 10)
      : productId === P.rawHome || productId === P.rawBuy ? roundTo(between(agent ? 300 : 100, agent ? 500 : 200), 50)
      : roundTo(between(50, 150), 10);
    const qty = Math.min(wanted || defaultQty, stock.get(productId) ?? 0);
    if (qty <= 0 || lines.some((l) => l.productId === productId)) continue;
    // Đại lý được giá sỉ thấp hơn khoảng 10%.
    const price = roundTo(product.suggestedPrice * (agent ? 0.9 : 1), 1_000);
    lines.push({ productId, qty, price });
  }
  if (lines.length === 0) return;
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const discount = !agent && subtotal > 1_000_000 && rand() < 0.3 ? 50_000 : 0;
  const total = subtotal - discount;
  const customerId = agent ? pick(AGENTS) : rand() < 0.6 ? pick(RETAIL) : null;
  const paid = agent && rand() < 0.7 ? roundTo(total * (0.3 + rand() * 0.4), 100_000) : total;
  await createSale(db, SHOP_ID, actor, {
    id: nextId("sale"), date, customerId, channel: agent ? "zalo" : pick(CHANNELS), note: "", lines, discount, paid,
  });
}

async function main() {
  if (!process.env.GCLOUD_PROJECT!.startsWith("demo-")) {
    throw new Error("Chỉ nạp dữ liệu mẫu vào project demo-* trên Emulator.");
  }
  const db = getAdminDb();
  const actor = await signInOwner();
  await resetShop(db, actor);

  const today = todayVN();
  const [ty, tm, td] = today.split("-").map(Number);
  for (let i = MONTHS - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const lastDay = i === 0 ? td : new Date(Date.UTC(year, month, 0)).getUTCDate();
    process.stdout.write(`Tháng ${month}/${year}… `);
    await seedMonth(db, actor, year, month, lastDay);
  }
  console.log();

  // Vài đơn hôm nay để thẻ "Hôm nay" có số.
  for (let i = 0; i < 3; i++) await randomSale(db, actor, today, true);

  // Chứng từ đã hủy và một lần kiểm kho để thử các màn lịch sử.
  const shop = db.collection("shops").doc(SHOP_ID);
  const lastMonth = await shop.collection("sales").where("date", "<", today.slice(0, 8) + "01").orderBy("date", "desc").limit(10).get();
  const toVoid = lastMonth.docs.find((d) => d.get("customerId") === null) ?? lastMonth.docs[0];
  if (toVoid) await voidSale(db, SHOP_ID, actor, { id: toVoid.id, reason: "Khách đổi ý, trả hàng" });
  const someExpense = await shop.collection("expenses").where("category", "==", "ads").limit(1).get();
  if (!someExpense.empty) await voidExpense(db, SHOP_ID, actor, { id: someExpense.docs[0].id, reason: "Nhập trùng" });
  await createAdjustment(db, SHOP_ID, actor, {
    id: nextId("adj"), date: today, reason: "Kiểm kho cuối tháng, cân thiếu",
    lines: [{ productId: P.dep, qtyDelta: -15 }],
  });

  const [sales, stats] = await Promise.all([shop.collection("sales").count().get(), shop.collection("stats").get()]);
  const yearRevenue = stats.docs.filter((d) => d.id.startsWith(`${ty}-`)).reduce((s, d) => s + ((d.get("revenue") as number) ?? 0), 0);
  console.log(`Xong: ${sales.data().count} đơn bán, doanh thu ${ty} đến nay ${yearRevenue.toLocaleString("vi-VN")} ₫.`);
  console.log(`Đăng nhập bằng tài khoản "${OWNER.name}" (${OWNER.email}) trên màn hình Auth Emulator.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
