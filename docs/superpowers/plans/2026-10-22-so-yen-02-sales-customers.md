# Sổ Yến — Kế hoạch 2: Bán hàng, khách hàng, công nợ, thống kê tháng

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm đơn bán (trừ kho, chốt giá vốn, ghi công nợ), danh bạ khách hàng, thu nợ nhiều lần, hủy đơn hoặc phiếu thu, thống kê tháng `stats/{yyyy-mm}` và trang Tổng quan có doanh thu, lãi gộp, công nợ.

**Architecture:** Giữ nguyên kiến trúc của Kế hoạch 1. Phần tính toán là hàm thuần trong `src/lib/domain/` (`sale.ts`, `stats.ts`). Mỗi nghiệp vụ là một Firestore transaction trong `src/server/services/`, gọi qua Server Action. Đơn bán cập nhật cùng lúc: kho, movements, khách hàng (`debtBalance`, `totalSpent`, `lastPurchaseAt`) và `stats/{tháng}` bằng `FieldValue.increment`. Khách hàng do client tự ghi (tên, SĐT, loại, ghi chú); rules chặn client sửa các trường do server quản lý.

**Tech Stack:** như Kế hoạch 1 (Next.js 16.4, React 19.3, antd 6, Tailwind 4, Firebase 12, firebase-admin 14, zod 4, Vitest 4, Firebase Emulator).

**Spec:** `docs/superpowers/specs/2026-10-22-so-yen-design.md` (mục 2, 4, 5, 6, 7).

**Ngoài kế hoạch này (để Kế hoạch 3):** chi phí, báo cáo theo kỳ, thuế, xuất Excel, thay `List` (deprecated) bằng `Listy`.

**Quy ước:** như Kế hoạch 1. Mọi commit kết thúc bằng dòng trống rồi
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Lệnh cần Emulator chạy với Java trong PATH:
`PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:emulator`. Nếu `npm run emulators` đang chạy thì dừng trước, vì hai bên dùng cùng cổng.

**Quy tắc nghiệp vụ chốt trong kế hoạch này:**
- Bán được các loại `raw`, `clean`, `steamed`, `combo`. Không bán vật tư (`supply`).
- `subtotal = Σ qty × price`, `total = subtotal − discount`, `debt = total − paid`. Ràng buộc: `discount ≤ subtotal`, `paid ≤ total`. Đơn có `debt > 0` phải có khách.
- Giảm giá chia cho các dòng theo thành tiền (dòng giá 0 không nhận phần nào), để `Σ revenue dòng = total`. Doanh thu theo sản phẩm và theo nhóm thuế dùng con số này.
- Mỗi dòng chốt `totalCost` (giá vốn xuất kho), `unitCost` và `taxGroup` lúc bán. Hủy đơn dùng đúng các giá trị đã chốt.
- Mã đơn `DH-<năm>-<4 số>`, đánh lại từ 0001 mỗi năm theo năm của ngày đơn.
- Doanh thu tính theo ngày đơn. Thu nợ chỉ giảm `debtBalance`, không cộng doanh thu.
- Hủy đơn còn nợ bị chặn khi `debtBalance` của khách nhỏ hơn số nợ của đơn (tức là khách đã trả bớt). Khi đó phải hủy phiếu thu trước.
- Thu nợ không được vượt `debtBalance`.

---

## Cấu trúc file

```text
src/lib/domain/
  models.ts          (sửa) thêm kênh bán, loại khách, phương thức trả, Customer, SaleDoc, PaymentDoc, MonthStats
  schemas.ts         (sửa) thêm saleInput, paymentInput
  sale.ts            (mới) computeSale, allocateDiscount, nextSaleSeq, saleCode, saleSummaryText
  stats.ts           (mới) saleStatsDelta
src/server/services/
  inventory.ts       (sửa) SourceType thêm "sale"
  membership.ts      (sửa) MyShop có ownerUid
  stats.ts           (mới) writeSaleStats
  sales.ts           (mới) createSale, voidSale
  payments.ts        (mới) createPayment, voidPayment
src/server/actions/sales.ts            (mới)
src/lib/firebase/customers.ts          (mới) saveCustomer
src/hooks/use-live-query.ts            (sửa) thêm useLiveDoc
src/hooks/use-shop-data.ts             (sửa) thêm hook khách hàng, đơn bán, thu nợ, stats
src/components/common/void-modal.tsx   (mới) dùng chung cho mọi trang hủy chứng từ
src/components/customers/customer-drawer.tsx (mới)
src/components/sales/sale-form.tsx     (mới)
src/components/layout/app-shell.tsx    (viết lại) nút nổi "+ Bán", mục Đơn bán, Khách hàng
src/app/(app)/page.tsx                 (viết lại) Tổng quan
src/app/(app)/ban-hang/page.tsx        (mới) danh sách đơn + hủy
src/app/(app)/ban-hang/moi/page.tsx    (mới) tạo đơn
src/app/(app)/khach-hang/page.tsx      (mới)
src/app/(app)/khach-hang/[id]/page.tsx (mới) chi tiết, thu nợ, lịch sử
src/app/(app)/kho/lich-su/page.tsx     (sửa) dùng VoidModal
src/app/(app)/thanh-vien/page.tsx      (sửa) không hiện nút Gỡ cạnh chủ cửa hàng
firestore.rules, firestore.indexes.json (sửa)
tests/unit/sale.test.ts, tests/unit/stats.test.ts (mới)
tests/integration/helpers.ts (sửa), sales.test.ts, payments.test.ts (mới), membership.test.ts (sửa)
tests/rules/firestore.rules.test.ts (sửa)
```

---

### Task 1: Domain — models và schemas cho bán hàng

**Files:**
- Modify: `src/lib/domain/models.ts`, `src/lib/domain/schemas.ts`
- Test: `tests/unit/schemas.test.ts`

- [ ] **Step 1: Thêm test thất bại vào cuối `tests/unit/schemas.test.ts`**

Sửa dòng import đầu file thành:
```ts
import {
  adjustmentInput,
  inviteInput,
  paymentInput,
  productInput,
  productionInput,
  receiptInput,
  saleInput,
} from "@/lib/domain/schemas";
```

Nối vào cuối file:
```ts
describe("saleInput", () => {
  const line = { productId: ID, qty: 100, price: 45_000 };

  test("mặc định khách lẻ, không giảm giá, ghi chú trống", () => {
    const s = saleInput.parse({ id: ID, date: "2026-10-22", channel: "zalo", lines: [line], paid: 0 });
    expect(s).toMatchObject({ customerId: null, discount: 0, note: "" });
  });

  test("từ chối kênh lạ, thiếu dòng, giá âm", () => {
    expect(saleInput.safeParse({ id: ID, date: "2026-10-22", channel: "tiktok", lines: [line], paid: 0 }).success).toBe(false);
    expect(saleInput.safeParse({ id: ID, date: "2026-10-22", channel: "zalo", lines: [], paid: 0 }).success).toBe(false);
    expect(
      saleInput.safeParse({ id: ID, date: "2026-10-22", channel: "zalo", lines: [{ ...line, price: -1 }], paid: 0 }).success,
    ).toBe(false);
  });
});

describe("paymentInput", () => {
  test("số tiền phải dương, phương thức hợp lệ", () => {
    const base = { id: ID, customerId: ID, date: "2026-10-22", method: "cash" };
    expect(paymentInput.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(paymentInput.safeParse({ ...base, amount: 500_000, method: "card" }).success).toBe(false);
    expect(paymentInput.parse({ ...base, amount: 500_000 }).note).toBe("");
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `npm test -- tests/unit/schemas.test.ts`
Expected: FAIL, `saleInput` và `paymentInput` không tồn tại.

- [ ] **Step 3: Thêm models**

Nối vào cuối `src/lib/domain/models.ts`:
```ts
export const SALE_CHANNELS = ["zalo", "facebook", "shopee", "store", "other"] as const;
export type SaleChannel = (typeof SALE_CHANNELS)[number];

export const CUSTOMER_TYPES = ["retail", "agent"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const PAYMENT_METHODS = ["cash", "transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Loại sản phẩm được bán; vật tư chỉ dùng để chế biến. */
export const SELLABLE_KINDS: ProductKind[] = ["raw", "clean", "steamed", "combo"];

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  type: CustomerType;
  note?: string;
  /** Các trường dưới đây chỉ server ghi. */
  debtBalance?: number;
  totalSpent?: number;
  lastPurchaseAt?: string;
}

export interface SaleLine {
  productId: string;
  qty: number;
  price: number;
  /** Thành tiền sau khi chia giảm giá. */
  revenue: number;
  totalCost: number;
  unitCost: number;
  taxGroup: TaxGroup;
}

export interface SaleDoc extends DocBase {
  code: string;
  customerId: string | null;
  channel: SaleChannel;
  note: string;
  lines: SaleLine[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  debt: number;
}

export interface PaymentDoc extends DocBase {
  customerId: string;
  amount: number;
  method: PaymentMethod;
  note: string;
}

export interface MonthStats {
  id: string;
  revenue?: number;
  cogs?: number;
  saleCount?: number;
  byChannel?: Partial<Record<SaleChannel, { revenue: number; cogs: number; count: number }>>;
  byProduct?: Record<string, { qty: number; revenue: number; cogs: number }>;
  byTaxGroup?: Partial<Record<TaxGroup, number>>;
}

export const SALE_CHANNEL_LABEL: Record<SaleChannel, string> = {
  zalo: "Zalo",
  facebook: "Facebook",
  shopee: "Shopee",
  store: "Tại cửa hàng",
  other: "Khác",
};

export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  retail: "Khách lẻ",
  agent: "Đại lý / sỉ",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
};
```

- [ ] **Step 4: Thêm schemas**

Trong `src/lib/domain/schemas.ts`, sửa dòng import models thành:
```ts
import {
  PAYMENT_METHODS,
  PRODUCT_KINDS,
  PRODUCTION_KINDS,
  RECEIPT_KINDS,
  SALE_CHANNELS,
  TAX_GROUPS,
  UNITS,
} from "@/lib/domain/models";
```

Nối vào cuối file:
```ts
export const saleInput = z.object({
  id,
  date,
  customerId: id.nullable().default(null),
  channel: z.enum(SALE_CHANNELS),
  note,
  lines: z.array(z.object({ productId: id, qty, price: money })).min(1, "Thêm ít nhất một sản phẩm"),
  discount: money.default(0),
  paid: money,
});

export const paymentInput = z.object({
  id,
  customerId: id,
  date,
  amount: z
    .number("Nhập số tiền")
    .int("Số tiền phải là số nguyên")
    .positive("Số tiền phải lớn hơn 0")
    .max(100_000_000_000, "Số tiền quá lớn"),
  method: z.enum(PAYMENT_METHODS),
  note,
});
```

- [ ] **Step 5: Chạy test để thấy thành công**

Run: `npm test && npm run typecheck`
Expected: PASS toàn bộ, typecheck không lỗi.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(domain): sale, customer and payment models and schemas"
```

---

### Task 2: Domain — tính đơn bán, mã đơn, tóm tắt gửi khách

**Files:**
- Create: `src/lib/domain/sale.ts`
- Test: `tests/unit/sale.test.ts`

- [ ] **Step 1: Viết test thất bại**

`tests/unit/sale.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { allocateDiscount, computeSale, nextSaleSeq, saleCode, saleSummaryText } from "@/lib/domain/sale";

describe("computeSale", () => {
  test("tổng, giảm giá, công nợ và doanh thu từng dòng", () => {
    const r = computeSale(
      [
        { qty: 100, price: 45_000 },
        { qty: 2, price: 300_000 },
      ],
      100_000,
      3_000_000,
    );
    expect(r).toEqual({
      subtotal: 5_100_000,
      total: 5_000_000,
      debt: 2_000_000,
      lineRevenue: [4_411_765, 588_235],
    });
  });

  test("không giảm giá thì doanh thu dòng bằng thành tiền", () => {
    expect(computeSale([{ qty: 3, price: 1_000 }], 0, 3_000).lineRevenue).toEqual([3_000]);
  });
});

describe("allocateDiscount", () => {
  test("dòng tặng giá 0 không nhận giảm giá", () => {
    expect(allocateDiscount([0, 1_000], 100)).toEqual([0, 900]);
  });

  test("toàn bộ dòng giá 0 thì giữ nguyên", () => {
    expect(allocateDiscount([0, 0], 0)).toEqual([0, 0]);
  });
});

describe("mã đơn", () => {
  test("nextSaleSeq đánh lại theo năm", () => {
    expect(nextSaleSeq(undefined, 2026)).toBe(1);
    expect(nextSaleSeq({ sale: 0 }, 2026)).toBe(1);
    expect(nextSaleSeq({ sale: 5, saleYear: 2026 }, 2026)).toBe(6);
    expect(nextSaleSeq({ sale: 5, saleYear: 2025 }, 2026)).toBe(1);
  });

  test("saleCode", () => {
    expect(saleCode(2026, 7)).toBe("DH-2026-0007");
    expect(saleCode(2026, 12345)).toBe("DH-2026-12345");
  });
});

describe("saleSummaryText", () => {
  test("có dòng hàng, giảm giá, đã trả và còn nợ", () => {
    const text = saleSummaryText({
      shopName: "Yến sào Nhà Mình",
      code: "DH-2026-0001",
      date: "2026-10-22",
      lines: [
        { name: "Yến tinh tổ đẹp", unit: "g", qty: 100, price: 45_000 },
        { name: "Yến chưng 70ml", unit: "piece", qty: 2, price: 300_000 },
      ],
      subtotal: 5_100_000,
      discount: 100_000,
      total: 5_000_000,
      paid: 3_000_000,
      debt: 2_000_000,
    });
    expect(text).toContain("Yến sào Nhà Mình");
    expect(text).toContain("Đơn DH-2026-0001 · 22/10/2026");
    expect(text).toContain("- Yến tinh tổ đẹp: 100g × 45.000 ₫ = 4.500.000 ₫");
    expect(text).toContain("- Yến chưng 70ml: 2 cái × 300.000 ₫ = 600.000 ₫");
    expect(text).toContain("Giảm giá: 100.000 ₫");
    expect(text).toContain("Tổng cộng: 5.000.000 ₫");
    expect(text).toContain("Còn nợ: 2.000.000 ₫");
  });

  test("bỏ dòng giảm giá và còn nợ khi bằng 0", () => {
    const text = saleSummaryText({
      shopName: "A", code: "DH-2026-0002", date: "2026-10-22",
      lines: [{ name: "X", unit: "piece", qty: 1, price: 10_000 }],
      subtotal: 10_000, discount: 0, total: 10_000, paid: 10_000, debt: 0,
    });
    expect(text).not.toContain("Giảm giá");
    expect(text).not.toContain("Còn nợ");
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `npm test -- tests/unit/sale.test.ts`
Expected: FAIL, không tìm thấy module `@/lib/domain/sale`.

- [ ] **Step 3: Viết code**

`src/lib/domain/sale.ts`:
```ts
import { allocateCost } from "@/lib/domain/costing";
import { formatDate } from "@/lib/domain/dates";
import type { Unit } from "@/lib/domain/models";
import { formatQty, formatVnd } from "@/lib/domain/money";

export interface SaleLineInput {
  qty: number;
  price: number;
}

export interface SaleTotals {
  subtotal: number;
  total: number;
  debt: number;
  /** Thành tiền từng dòng sau khi chia giảm giá; tổng bằng `total`. */
  lineRevenue: number[];
}

/** Chia giảm giá theo thành tiền; dòng giá 0 (hàng tặng) không nhận phần nào. */
export function allocateDiscount(gross: number[], discount: number): number[] {
  const paidLines = gross.map((g, i) => (g > 0 ? i : -1)).filter((i) => i >= 0);
  if (discount === 0 || paidLines.length === 0) return [...gross];
  const shares = allocateCost(discount, paidLines.map((i) => gross[i]));
  const revenue = [...gross];
  paidLines.forEach((lineIndex, k) => {
    revenue[lineIndex] -= shares[k];
  });
  return revenue;
}

/** Không kiểm tra ràng buộc; service kiểm tra và báo lỗi tiếng Việt. */
export function computeSale(lines: SaleLineInput[], discount: number, paid: number): SaleTotals {
  const gross = lines.map((l) => l.qty * l.price);
  const subtotal = gross.reduce((sum, g) => sum + g, 0);
  const total = subtotal - discount;
  return { subtotal, total, debt: total - paid, lineRevenue: allocateDiscount(gross, discount) };
}

/** Số thứ tự đơn tiếp theo; đánh lại từ 1 khi sang năm mới. */
export function nextSaleSeq(counters: { sale?: number; saleYear?: number } | undefined, year: number): number {
  return counters?.saleYear === year ? (counters.sale ?? 0) + 1 : 1;
}

export function saleCode(year: number, seq: number): string {
  return `DH-${year}-${String(seq).padStart(4, "0")}`;
}

export interface SaleSummary {
  shopName: string;
  code: string;
  date: string;
  lines: { name: string; unit: Unit; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  debt: number;
}

/** Văn bản để dán gửi khách qua Zalo/Messenger. */
export function saleSummaryText(s: SaleSummary): string {
  const rows = [
    s.shopName,
    `Đơn ${s.code} · ${formatDate(s.date)}`,
    ...s.lines.map(
      (l) => `- ${l.name}: ${formatQty(l.qty, l.unit)} × ${formatVnd(l.price)} = ${formatVnd(l.qty * l.price)}`,
    ),
    `Tạm tính: ${formatVnd(s.subtotal)}`,
  ];
  if (s.discount > 0) rows.push(`Giảm giá: ${formatVnd(s.discount)}`);
  rows.push(`Tổng cộng: ${formatVnd(s.total)}`, `Đã trả: ${formatVnd(s.paid)}`);
  if (s.debt > 0) rows.push(`Còn nợ: ${formatVnd(s.debt)}`);
  rows.push("Cảm ơn quý khách!");
  return rows.join("\n");
}
```

- [ ] **Step 4: Chạy test để thấy thành công**

Run: `npm test`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): sale totals, discount allocation, order codes, summary text"
```

---

### Task 3: Domain — delta thống kê tháng

**Files:**
- Create: `src/lib/domain/stats.ts`
- Test: `tests/unit/stats.test.ts`

- [ ] **Step 1: Viết test thất bại**

`tests/unit/stats.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { saleStatsDelta } from "@/lib/domain/stats";

const sale = {
  channel: "zalo" as const,
  lines: [
    { productId: "a", qty: 100, revenue: 4_411_765, totalCost: 2_500_000, taxGroup: "processed" as const },
    { productId: "b", qty: 2, revenue: 588_235, totalCost: 514_000, taxGroup: "processed" as const },
    { productId: "a", qty: 10, revenue: 450_000, totalCost: 250_000, taxGroup: "processed" as const },
  ],
};

describe("saleStatsDelta", () => {
  test("cộng doanh thu, giá vốn, theo kênh, sản phẩm và nhóm thuế", () => {
    expect(saleStatsDelta(sale, 1)).toEqual({
      revenue: 5_450_000,
      cogs: 3_264_000,
      saleCount: 1,
      byChannel: { zalo: { revenue: 5_450_000, cogs: 3_264_000, count: 1 } },
      byProduct: {
        a: { qty: 110, revenue: 4_861_765, cogs: 2_750_000 },
        b: { qty: 2, revenue: 588_235, cogs: 514_000 },
      },
      byTaxGroup: { processed: 5_450_000 },
    });
  });

  test("sign -1 cho ra số âm để hủy đơn", () => {
    const d = saleStatsDelta(sale, -1);
    expect(d.revenue).toBe(-5_450_000);
    expect(d.saleCount).toBe(-1);
    expect(d.byProduct.a.qty).toBe(-110);
    expect(d.byChannel.zalo).toEqual({ revenue: -5_450_000, cogs: -3_264_000, count: -1 });
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `npm test -- tests/unit/stats.test.ts`
Expected: FAIL, không tìm thấy module `@/lib/domain/stats`.

- [ ] **Step 3: Viết code**

`src/lib/domain/stats.ts`:
```ts
import type { SaleChannel, SaleLine, TaxGroup } from "@/lib/domain/models";

export interface StatsDelta {
  revenue: number;
  cogs: number;
  saleCount: number;
  byChannel: Partial<Record<SaleChannel, { revenue: number; cogs: number; count: number }>>;
  byProduct: Record<string, { qty: number; revenue: number; cogs: number }>;
  byTaxGroup: Partial<Record<TaxGroup, number>>;
}

type StatsLine = Pick<SaleLine, "productId" | "qty" | "revenue" | "totalCost" | "taxGroup">;

/** Phần cộng vào stats tháng của một đơn; sign = -1 khi hủy đơn. */
export function saleStatsDelta(sale: { channel: SaleChannel; lines: StatsLine[] }, sign: 1 | -1): StatsDelta {
  const delta: StatsDelta = { revenue: 0, cogs: 0, saleCount: sign, byChannel: {}, byProduct: {}, byTaxGroup: {} };
  for (const line of sale.lines) {
    const revenue = sign * line.revenue;
    const cogs = sign * line.totalCost;
    delta.revenue += revenue;
    delta.cogs += cogs;
    const product = (delta.byProduct[line.productId] ??= { qty: 0, revenue: 0, cogs: 0 });
    product.qty += sign * line.qty;
    product.revenue += revenue;
    product.cogs += cogs;
    delta.byTaxGroup[line.taxGroup] = (delta.byTaxGroup[line.taxGroup] ?? 0) + revenue;
  }
  delta.byChannel[sale.channel] = { revenue: delta.revenue, cogs: delta.cogs, count: sign };
  return delta;
}
```

- [ ] **Step 4: Chạy test để thấy thành công**

Run: `npm test && npm run typecheck`
Expected: PASS, typecheck không lỗi.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): monthly stats delta for sales"
```

---

### Task 4: Service đơn bán (tạo đơn)

**Files:**
- Modify: `src/server/services/inventory.ts`, `tests/integration/helpers.ts`
- Create: `src/server/services/stats.ts`, `src/server/services/sales.ts`, `tests/integration/sales-fixtures.ts`
- Test: `tests/integration/sales.test.ts`

- [ ] **Step 1: Thêm helpers khách hàng cho test tích hợp**

Nối vào cuối `tests/integration/helpers.ts`:
```ts
export const C = { lan: "cust_00000001", ba: "cust_00000002" } as const;

export async function seedCustomer(id: string, overrides: Record<string, unknown> = {}) {
  await db().collection("shops").doc(SHOP_ID).collection("customers").doc(id).set({
    name: "Khách",
    type: "retail",
    ...overrides,
  });
}

export async function getDoc(collection: string, id: string) {
  const snap = await db().collection("shops").doc(SHOP_ID).collection(collection).doc(id).get();
  return snap.data();
}
```

- [ ] **Step 2: Viết fixture dùng chung cho test bán hàng**

`tests/integration/sales-fixtures.ts`:
```ts
import { C, clearFirestore, P, seedCustomer, seedProduct, seedShop } from "./helpers";

export const S1 = "sale_00000001";
export const S2 = "sale_00000002";
export const S3 = "sale_00000003";

export const baseSale = {
  id: S1,
  date: "2026-10-22",
  customerId: C.lan,
  channel: "zalo",
  lines: [
    { productId: P.clean, qty: 100, price: 45_000 },
    { productId: P.steamed, qty: 2, price: 300_000 },
  ],
  discount: 100_000,
  paid: 3_000_000,
};

export async function seedSalesData() {
  await clearFirestore();
  await seedShop();
  await seedProduct(P.clean, { name: "Yến tinh tổ đẹp", kind: "clean", taxGroup: "processed", stockQty: 1000, avgCost: 25_000 });
  await seedProduct(P.steamed, { name: "Yến chưng 70ml", kind: "steamed", unit: "piece", taxGroup: "processed", stockQty: 10, avgCost: 257_000 });
  await seedProduct(P.sugar, { name: "Đường phèn", kind: "supply", unit: "piece", stockQty: 100, avgCost: 2_000 });
  await seedCustomer(C.lan, { name: "Chị Lan", type: "agent" });
}
```

Tên file không kết thúc bằng `.test.ts` nên Vitest không chạy nó như một bộ test.

- [ ] **Step 3: Viết test thất bại**

`tests/integration/sales.test.ts`:
```ts
import { beforeEach, describe, expect, test } from "vitest";
import { createSale } from "@/server/services/sales";
import { C, db, getDoc, getProduct, listMovements, owner, P, SHOP_ID } from "./helpers";
import { baseSale, S1, S2, S3, seedSalesData } from "./sales-fixtures";

beforeEach(seedSalesData);

describe("createSale", () => {
  test("trừ kho, chốt giá vốn, ghi công nợ khách và stats tháng", async () => {
    expect(await createSale(db(), SHOP_ID, owner, baseSale)).toEqual({ id: S1, code: "DH-2026-0001" });

    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 900, avgCost: 25_000 });
    expect(await getProduct(P.steamed)).toMatchObject({ stockQty: 8 });

    expect(await getDoc("sales", S1)).toMatchObject({
      code: "DH-2026-0001",
      customerId: C.lan,
      channel: "zalo",
      subtotal: 5_100_000,
      discount: 100_000,
      total: 5_000_000,
      paid: 3_000_000,
      debt: 2_000_000,
      status: "active",
      lines: [
        { productId: P.clean, qty: 100, price: 45_000, revenue: 4_411_765, totalCost: 2_500_000, unitCost: 25_000, taxGroup: "processed" },
        { productId: P.steamed, qty: 2, price: 300_000, revenue: 588_235, totalCost: 514_000, unitCost: 257_000, taxGroup: "processed" },
      ],
    });

    expect(await getDoc("customers", C.lan)).toMatchObject({
      debtBalance: 2_000_000,
      totalSpent: 5_000_000,
      lastPurchaseAt: "2026-10-22",
    });

    expect(await getDoc("stats", "2026-10")).toMatchObject({
      revenue: 5_000_000,
      cogs: 3_014_000,
      saleCount: 1,
      byChannel: { zalo: { revenue: 5_000_000, cogs: 3_014_000, count: 1 } },
      byProduct: { [P.clean]: { qty: 100, revenue: 4_411_765, cogs: 2_500_000 } },
      byTaxGroup: { processed: 5_000_000 },
    });

    expect((await listMovements(S1)).map((m) => m.qtyDelta).sort((a, b) => a - b)).toEqual([-100, -2]);
  });

  test("mã đơn tăng dần và đánh lại theo năm", async () => {
    await createSale(db(), SHOP_ID, owner, baseSale);
    expect((await createSale(db(), SHOP_ID, owner, { ...baseSale, id: S2 })).code).toBe("DH-2026-0002");
    expect((await createSale(db(), SHOP_ID, owner, { ...baseSale, id: S3, date: "2027-01-02" })).code).toBe("DH-2027-0001");
  });

  test("gửi trùng ID không bán hai lần", async () => {
    await createSale(db(), SHOP_ID, owner, baseSale);
    expect(await createSale(db(), SHOP_ID, owner, baseSale)).toEqual({ id: S1, code: "DH-2026-0001" });
    expect((await getProduct(P.clean)).stockQty).toBe(900);
    expect((await getDoc("customers", C.lan))?.debtBalance).toBe(2_000_000);
  });

  test("khách lẻ trả đủ: không cần chọn khách", async () => {
    await createSale(db(), SHOP_ID, owner, { ...baseSale, customerId: null, paid: 5_000_000 });
    expect(await getDoc("sales", S1)).toMatchObject({ customerId: null, debt: 0 });
  });

  test("các ràng buộc", async () => {
    await expect(createSale(db(), SHOP_ID, owner, { ...baseSale, customerId: null })).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Đơn còn nợ phải chọn khách hàng.",
    });
    await expect(createSale(db(), SHOP_ID, owner, { ...baseSale, paid: 5_000_001 })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(createSale(db(), SHOP_ID, owner, { ...baseSale, discount: 5_100_001 })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createSale(db(), SHOP_ID, owner, { ...baseSale, lines: [{ productId: P.sugar, qty: 1, price: 1 }], discount: 0, paid: 1 }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createSale(db(), SHOP_ID, owner, { ...baseSale, lines: [{ productId: P.steamed, qty: 11, price: 1 }], discount: 0, paid: 0 }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    await expect(createSale(db(), SHOP_ID, owner, { ...baseSale, customerId: C.ba })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
```

- [ ] **Step 4: Chạy test để thấy thất bại**

Run: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:emulator`
Expected: FAIL, không tìm thấy module `@/server/services/sales`.

- [ ] **Step 5: Cho phép movements nguồn "sale"**

Trong `src/server/services/inventory.ts`, thay:
```ts
export type SourceType = "receipt" | "production" | "adjustment";
```
bằng:
```ts
export type SourceType = "receipt" | "production" | "adjustment" | "sale";
```

- [ ] **Step 6: Viết hàm ghi stats**

`src/server/services/stats.ts`:
```ts
import { FieldValue, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import type { StatsDelta } from "@/lib/domain/stats";

const inc = (n: number) => FieldValue.increment(n);

function mapValues<T, U>(record: Partial<Record<string, T>>, fn: (value: T) => U): Record<string, U> {
  return Object.fromEntries(
    Object.entries(record)
      .filter((entry): entry is [string, T] => entry[1] !== undefined)
      .map(([key, value]) => [key, fn(value)]),
  );
}

/** Cộng delta vào stats/{month} bằng increment, nên các đơn đồng thời không ghi đè nhau. */
export function writeSaleStats(tx: Transaction, shop: DocumentReference, month: string, delta: StatsDelta) {
  tx.set(
    shop.collection("stats").doc(month),
    {
      revenue: inc(delta.revenue),
      cogs: inc(delta.cogs),
      saleCount: inc(delta.saleCount),
      byChannel: mapValues(delta.byChannel, (c) => ({ revenue: inc(c.revenue), cogs: inc(c.cogs), count: inc(c.count) })),
      byProduct: mapValues(delta.byProduct, (p) => ({ qty: inc(p.qty), revenue: inc(p.revenue), cogs: inc(p.cogs) })),
      byTaxGroup: mapValues(delta.byTaxGroup, inc),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
```

- [ ] **Step 7: Viết service tạo đơn**

`src/server/services/sales.ts`:
```ts
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { unitCostOf } from "@/lib/domain/costing";
import { monthKey } from "@/lib/domain/dates";
import { AppError } from "@/lib/domain/errors";
import { SELLABLE_KINDS, type SaleLine } from "@/lib/domain/models";
import { computeSale, nextSaleSeq, saleCode } from "@/lib/domain/sale";
import { saleInput } from "@/lib/domain/schemas";
import { saleStatsDelta } from "@/lib/domain/stats";
import type { Actor } from "@/server/actor";
import { loadProducts, requireActive, takeStock, writeMovements, writeProducts } from "@/server/services/inventory";
import { shopRef } from "@/server/services/membership";
import { writeSaleStats } from "@/server/services/stats";

export async function createSale(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const s = saleInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("sales").doc(s.id);
  const customerRef = s.customerId ? shop.collection("customers").doc(s.customerId) : null;

  return db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) return { id: s.id, code: existing.get("code") as string };
    const shopSnap = await tx.get(shop);
    const customerSnap = customerRef ? await tx.get(customerRef) : null;
    if (customerSnap && !customerSnap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy khách hàng.");
    const products = await loadProducts(tx, shop, s.lines.map((l) => l.productId));

    const totals = computeSale(s.lines, s.discount, s.paid);
    if (s.discount > totals.subtotal) throw new AppError("VALIDATION", "Giảm giá không được lớn hơn tạm tính.");
    if (s.paid > totals.total) throw new AppError("VALIDATION", "Số tiền khách trả không được lớn hơn tổng đơn.");
    if (totals.debt > 0 && !customerRef) throw new AppError("VALIDATION", "Đơn còn nợ phải chọn khách hàng.");

    const lines: SaleLine[] = s.lines.map((line, i) => {
      const product = products.get(line.productId)!;
      requireActive(product);
      if (!SELLABLE_KINDS.includes(product.kind)) {
        throw new AppError("VALIDATION", `"${product.name}" là vật tư, không bán được.`);
      }
      const totalCost = takeStock(product, line.qty);
      return {
        productId: line.productId,
        qty: line.qty,
        price: line.price,
        revenue: totals.lineRevenue[i],
        totalCost,
        unitCost: unitCostOf(totalCost, line.qty),
        taxGroup: product.taxGroup,
      };
    });

    const year = Number(s.date.slice(0, 4));
    const seq = nextSaleSeq(shopSnap.get("counters"), year);
    const code = saleCode(year, seq);

    tx.update(shop, { "counters.sale": seq, "counters.saleYear": year });
    tx.set(ref, {
      code,
      date: s.date,
      customerId: s.customerId,
      channel: s.channel,
      note: s.note,
      lines,
      subtotal: totals.subtotal,
      discount: s.discount,
      total: totals.total,
      paid: s.paid,
      debt: totals.debt,
      status: "active",
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (customerRef && customerSnap) {
      const last = customerSnap.get("lastPurchaseAt") as string | undefined;
      tx.update(customerRef, {
        debtBalance: FieldValue.increment(totals.debt),
        totalSpent: FieldValue.increment(totals.total),
        lastPurchaseAt: !last || s.date > last ? s.date : last,
      });
    }
    writeProducts(tx, shop, products);
    writeMovements(
      tx,
      shop,
      { type: "sale", id: s.id, date: s.date },
      lines.map((l) => ({ productId: l.productId, qtyDelta: -l.qty, costDelta: -l.totalCost })),
    );
    writeSaleStats(tx, shop, monthKey(s.date), saleStatsDelta({ channel: s.channel, lines }, 1));
    return { id: s.id, code };
  });
}
```

- [ ] **Step 8: Chạy test để thấy thành công**

Run: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:emulator`
Expected: PASS toàn bộ, kể cả các test cũ.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(server): create sales with stock, customer debt and monthly stats"
```

---

### Task 5: Service hủy đơn bán

**Files:**
- Modify: `src/server/services/sales.ts`
- Test: `tests/integration/sales-void.test.ts`

- [ ] **Step 1: Viết test thất bại**

`tests/integration/sales-void.test.ts`:
```ts
import { beforeEach, describe, expect, test } from "vitest";
import { createSale, voidSale } from "@/server/services/sales";
import { C, db, getDoc, getProduct, listMovements, owner, P, SHOP_ID } from "./helpers";
import { baseSale, S1, seedSalesData } from "./sales-fixtures";

beforeEach(seedSalesData);

describe("voidSale", () => {
  test("trả lại kho, công nợ, doanh số khách và stats", async () => {
    await createSale(db(), SHOP_ID, owner, baseSale);
    await voidSale(db(), SHOP_ID, owner, { id: S1, reason: "Khách đổi ý" });

    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 1000, avgCost: 25_000 });
    expect(await getProduct(P.steamed)).toMatchObject({ stockQty: 10, avgCost: 257_000 });
    expect(await getDoc("sales", S1)).toMatchObject({ status: "voided", voidReason: "Khách đổi ý" });
    expect(await getDoc("customers", C.lan)).toMatchObject({ debtBalance: 0, totalSpent: 0 });
    expect(await getDoc("stats", "2026-10")).toMatchObject({
      revenue: 0,
      cogs: 0,
      saleCount: 0,
      byChannel: { zalo: { revenue: 0, cogs: 0, count: 0 } },
    });
    expect(await listMovements(S1)).toHaveLength(4);
  });

  test("hủy hai lần không trả hai lần", async () => {
    await createSale(db(), SHOP_ID, owner, baseSale);
    await voidSale(db(), SHOP_ID, owner, { id: S1, reason: "x" });
    await voidSale(db(), SHOP_ID, owner, { id: S1, reason: "x" });
    expect((await getProduct(P.clean)).stockQty).toBe(1000);
  });

  test("chặn khi khách đã trả bớt nợ của đơn", async () => {
    await createSale(db(), SHOP_ID, owner, baseSale);
    await db().collection("shops").doc(SHOP_ID).collection("customers").doc(C.lan).update({ debtBalance: 500_000 });
    await expect(voidSale(db(), SHOP_ID, owner, { id: S1, reason: "x" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  test("NOT_FOUND khi không có đơn", async () => {
    await expect(voidSale(db(), SHOP_ID, owner, { id: S1, reason: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:emulator`
Expected: `sales-void.test.ts` FAIL vì `voidSale` chưa được export.

- [ ] **Step 3: Viết code**

Trong `src/server/services/sales.ts`, thay toàn bộ khối import đầu file bằng:
```ts
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { unitCostOf } from "@/lib/domain/costing";
import { monthKey } from "@/lib/domain/dates";
import { AppError } from "@/lib/domain/errors";
import { SELLABLE_KINDS, type SaleDoc, type SaleLine } from "@/lib/domain/models";
import { formatVnd } from "@/lib/domain/money";
import { computeSale, nextSaleSeq, saleCode } from "@/lib/domain/sale";
import { saleInput, voidInput } from "@/lib/domain/schemas";
import { saleStatsDelta } from "@/lib/domain/stats";
import type { Actor } from "@/server/actor";
import {
  addStock,
  loadProducts,
  requireActive,
  takeStock,
  voidFields,
  writeMovements,
  writeProducts,
} from "@/server/services/inventory";
import { shopRef } from "@/server/services/membership";
import { writeSaleStats } from "@/server/services/stats";
```

Nối vào cuối file:
```ts
export async function voidSale(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const v = voidInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("sales").doc(v.id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy đơn bán.");
    const sale = snap.data() as Omit<SaleDoc, "id">;
    if (sale.status === "voided") return;
    const customerRef = sale.customerId ? shop.collection("customers").doc(sale.customerId) : null;
    const customerSnap = customerRef ? await tx.get(customerRef) : null;
    const products = await loadProducts(tx, shop, sale.lines.map((l) => l.productId));

    if (customerSnap?.exists && sale.debt > 0) {
      const balance = (customerSnap.get("debtBalance") as number | undefined) ?? 0;
      if (balance < sale.debt) {
        throw new AppError(
          "VALIDATION",
          `Không thể hủy: khách chỉ còn nợ ${formatVnd(balance)}, ít hơn số nợ ${formatVnd(sale.debt)} của đơn này. Hãy hủy các phiếu thu nợ liên quan trước.`,
        );
      }
    }

    for (const line of sale.lines) addStock(products.get(line.productId)!, line.qty, line.totalCost);

    tx.update(ref, voidFields(actor, v.reason));
    if (customerRef && customerSnap?.exists) {
      tx.update(customerRef, {
        debtBalance: FieldValue.increment(-sale.debt),
        totalSpent: FieldValue.increment(-sale.total),
      });
    }
    writeProducts(tx, shop, products);
    writeMovements(
      tx,
      shop,
      { type: "sale", id: v.id, date: sale.date },
      sale.lines.map((l) => ({ productId: l.productId, qtyDelta: l.qty, costDelta: l.totalCost })),
      "_void",
    );
    writeSaleStats(tx, shop, monthKey(sale.date), saleStatsDelta(sale, -1));
  });
  return { id: v.id };
}
```

`lastPurchaseAt` không được tính lại khi hủy, vì phải đọc lại toàn bộ đơn của khách. Ngày này chỉ dùng để tham khảo.

- [ ] **Step 4: Chạy test để thấy thành công**

Run: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:emulator && npm run typecheck`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): void sales, restoring stock, debt and stats"
```

---

### Task 6: Service thu nợ

**Files:**
- Create: `src/server/services/payments.ts`
- Test: `tests/integration/payments.test.ts`

- [ ] **Step 1: Viết test thất bại**

`tests/integration/payments.test.ts`:
```ts
import { beforeEach, describe, expect, test } from "vitest";
import { createPayment, voidPayment } from "@/server/services/payments";
import { C, clearFirestore, db, getDoc, owner, seedCustomer, seedShop, SHOP_ID } from "./helpers";

const PAY1 = "pay_000000001";
const pay = { id: PAY1, customerId: C.lan, date: "2026-10-22", amount: 500_000, method: "transfer" };

beforeEach(async () => {
  await clearFirestore();
  await seedShop();
  await seedCustomer(C.lan, { name: "Chị Lan", type: "agent", debtBalance: 2_000_000 });
});

describe("payments", () => {
  test("thu nợ giảm debtBalance và lưu phiếu", async () => {
    await createPayment(db(), SHOP_ID, owner, pay);
    expect((await getDoc("customers", C.lan))?.debtBalance).toBe(1_500_000);
    expect(await getDoc("payments", PAY1)).toMatchObject({ amount: 500_000, method: "transfer", status: "active", createdBy: owner.uid });
  });

  test("gửi trùng không thu hai lần", async () => {
    await createPayment(db(), SHOP_ID, owner, pay);
    await createPayment(db(), SHOP_ID, owner, pay);
    expect((await getDoc("customers", C.lan))?.debtBalance).toBe(1_500_000);
  });

  test("không thu quá số nợ", async () => {
    await expect(createPayment(db(), SHOP_ID, owner, { ...pay, amount: 2_000_001 })).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Khách chỉ còn nợ 2.000.000 ₫.",
    });
  });

  test("khách không tồn tại", async () => {
    await expect(createPayment(db(), SHOP_ID, owner, { ...pay, customerId: C.ba })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("hủy phiếu thu trả lại số nợ", async () => {
    await createPayment(db(), SHOP_ID, owner, pay);
    await voidPayment(db(), SHOP_ID, owner, { id: PAY1, reason: "Ghi nhầm" });
    expect((await getDoc("customers", C.lan))?.debtBalance).toBe(2_000_000);
    expect(await getDoc("payments", PAY1)).toMatchObject({ status: "voided", voidReason: "Ghi nhầm" });
    await voidPayment(db(), SHOP_ID, owner, { id: PAY1, reason: "Ghi nhầm" });
    expect((await getDoc("customers", C.lan))?.debtBalance).toBe(2_000_000);
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:emulator`
Expected: FAIL, không tìm thấy module `@/server/services/payments`.

- [ ] **Step 3: Viết code**

`src/server/services/payments.ts`:
```ts
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";
import { formatVnd } from "@/lib/domain/money";
import { paymentInput, voidInput } from "@/lib/domain/schemas";
import type { Actor } from "@/server/actor";
import { voidFields } from "@/server/services/inventory";
import { shopRef } from "@/server/services/membership";

export async function createPayment(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const p = paymentInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("payments").doc(p.id);
  const customerRef = shop.collection("customers").doc(p.customerId);

  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    const customer = await tx.get(customerRef);
    if (!customer.exists) throw new AppError("NOT_FOUND", "Không tìm thấy khách hàng.");
    const balance = (customer.get("debtBalance") as number | undefined) ?? 0;
    if (p.amount > balance) throw new AppError("VALIDATION", `Khách chỉ còn nợ ${formatVnd(balance)}.`);

    tx.set(ref, {
      customerId: p.customerId,
      date: p.date,
      amount: p.amount,
      method: p.method,
      note: p.note,
      status: "active",
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(customerRef, { debtBalance: FieldValue.increment(-p.amount) });
  });
  return { id: p.id };
}

export async function voidPayment(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const v = voidInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("payments").doc(v.id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy phiếu thu.");
    if (snap.get("status") === "voided") return;
    const customerRef = shop.collection("customers").doc(snap.get("customerId") as string);
    tx.update(ref, voidFields(actor, v.reason));
    tx.update(customerRef, { debtBalance: FieldValue.increment(snap.get("amount") as number) });
  });
  return { id: v.id };
}
```

- [ ] **Step 4: Chạy test để thấy thành công**

Run: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:emulator`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): customer debt payments with void"
```

---

### Task 7: Rules cho khách hàng và indexes

**Files:**
- Modify: `firestore.rules`, `firestore.indexes.json`
- Test: `tests/rules/firestore.rules.test.ts`

- [ ] **Step 1: Thêm test thất bại**

Nối vào cuối `tests/rules/firestore.rules.test.ts`:
```ts
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
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:emulator`
Expected: FAIL ở các `assertSucceeds` của khách hàng, vì rules chưa cho ghi `customers`.

- [ ] **Step 3: Viết rules**

Trong `firestore.rules`, thêm hàm sau ngay dưới hàm `validSupplier`:
```text
    function validCustomerFields(data) {
      return data.name is string && data.name.size() >= 1 && data.name.size() <= 100
        && optionalString(data, 'phone', 20)
        && optionalString(data, 'note', 500)
        && data.type in ['retail', 'agent']
        && data.updatedAt == request.time;
    }
```

Thêm khối sau ngay dưới khối `match /suppliers/{supplierId} { ... }`:
```text
      // debtBalance, totalSpent, lastPurchaseAt chỉ server ghi (qua đơn bán và thu nợ).
      match /customers/{customerId} {
        allow create: if isMember(shopId)
          && request.resource.data.keys().hasOnly(['name', 'phone', 'type', 'note', 'createdBy', 'createdAt', 'updatedAt'])
          && validCustomerFields(request.resource.data)
          && request.resource.data.createdBy == request.auth.uid
          && request.resource.data.createdAt == request.time;
        allow update: if isMember(shopId)
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name', 'phone', 'type', 'note', 'updatedAt'])
          && validCustomerFields(request.resource.data);
      }
```

- [ ] **Step 4: Thêm indexes cho lịch sử theo khách**

`firestore.indexes.json` (thay toàn bộ):
```json
{
  "indexes": [
    {
      "collectionGroup": "sales",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "customerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "payments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "customerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": [
    {
      "collectionGroup": "invites",
      "fieldPath": "email",
      "indexes": [
        { "order": "ASCENDING", "queryScope": "COLLECTION" },
        { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" }
      ]
    }
  ]
}
```

- [ ] **Step 5: Chạy test để thấy thành công**

Run: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:emulator`
Expected: PASS toàn bộ.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(rules): client-editable customers with server-only balances; history indexes"
```

---

### Task 8: MyShop có ownerUid

**Files:**
- Modify: `src/server/services/membership.ts`, `tests/integration/membership.test.ts`

- [ ] **Step 1: Sửa test cho thất bại**

Trong `tests/integration/membership.test.ts`, thay **cả hai** dòng
```ts
toEqual({ id: SHOP_ID, name: "Yến Test" });
```
bằng
```ts
toEqual({ id: SHOP_ID, name: "Yến Test", ownerUid: owner.uid });
```
và trong test "tạo cửa hàng, người tạo là chủ và thành viên", ngay sau `expect(shop.name).toBe("Yến Nhà Mình");` thêm:
```ts
    expect(shop.ownerUid).toBe(owner.uid);
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:emulator`
Expected: FAIL ở 3 chỗ vừa sửa.

- [ ] **Step 3: Viết code**

Trong `src/server/services/membership.ts`:

- Thay interface:
```ts
export interface MyShop {
  id: string;
  name: string;
  ownerUid: string;
}
```
- Trong `findMyShop`, thay `return { id: doc.id, name: doc.get("name") as string };` bằng:
```ts
    return { id: doc.id, name: doc.get("name") as string, ownerUid: doc.get("ownerUid") as string };
```
- Trong transaction của `findMyShop`, thay `return { id: shop.id, name: shopSnap.get("name") as string };` bằng:
```ts
    return { id: shop.id, name: shopSnap.get("name") as string, ownerUid: shopSnap.get("ownerUid") as string };
```
- Trong `createShop`, thay `return { id: ref.id, name };` bằng:
```ts
  return { id: ref.id, name, ownerUid: actor.uid };
```

- [ ] **Step 4: Chạy test để thấy thành công**

Run: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:emulator && npm run typecheck`
Expected: PASS, typecheck không lỗi.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): expose shop owner to the client"
```

---

### Task 9: Server Actions bán hàng

**Files:**
- Create: `src/server/actions/sales.ts`

- [ ] **Step 1: Viết actions**

`src/server/actions/sales.ts`:
```ts
"use server";

import { requireMember } from "@/server/auth";
import { getAdminDb } from "@/server/firebase-admin";
import { runAction } from "@/server/run-action";
import { createPayment, voidPayment } from "@/server/services/payments";
import { createSale, voidSale } from "@/server/services/sales";

export async function createSaleAction(shopId: string, input: unknown) {
  return runAction(async () => createSale(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function voidSaleAction(shopId: string, input: unknown) {
  return runAction(async () => voidSale(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function createPaymentAction(shopId: string, input: unknown) {
  return runAction(async () => createPayment(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function voidPaymentAction(shopId: string, input: unknown) {
  return runAction(async () => voidPayment(getAdminDb(), shopId, await requireMember(shopId), input));
}
```

- [ ] **Step 2: Kiểm tra**

Run: `npm run typecheck && npm run lint`
Expected: không lỗi.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(server): server actions for sales and payments"
```

---

### Task 10: Client — khách hàng, hooks, VoidModal

**Files:**
- Create: `src/lib/firebase/customers.ts`, `src/components/common/void-modal.tsx`, `src/components/customers/customer-drawer.tsx`
- Modify: `src/hooks/use-live-query.ts`, `src/hooks/use-shop-data.ts`, `src/app/(app)/kho/lich-su/page.tsx`, `src/app/(app)/thanh-vien/page.tsx`

- [ ] **Step 1: Ghi khách hàng từ client**

`src/lib/firebase/customers.ts`:
```ts
import { collection, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import type { CustomerType } from "@/lib/domain/models";
import { getClientDb } from "@/lib/firebase/client";

export interface CustomerValues {
  name: string;
  phone: string;
  type: CustomerType;
  note: string;
}

/** Client chỉ ghi thông tin liên hệ; công nợ và doanh số do server cập nhật. Trả về id khách. */
export async function saveCustomer(shopId: string, uid: string, id: string | null, values: CustomerValues): Promise<string> {
  const customers = collection(getClientDb(), "shops", shopId, "customers");
  const data = { name: values.name.trim(), phone: values.phone.trim(), type: values.type, note: values.note.trim() };
  if (id) {
    await updateDoc(doc(customers, id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = doc(customers);
  await setDoc(ref, { ...data, createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
```

- [ ] **Step 2: Hook lắng nghe một document**

Nối vào cuối `src/hooks/use-live-query.ts`:
```ts
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
```
và sửa dòng import đầu file thành:
```ts
import { onSnapshot, type DocumentReference, type Firestore, type Query } from "firebase/firestore";
```

- [ ] **Step 3: Hook dữ liệu bán hàng**

Trong `src/hooks/use-shop-data.ts`:

Sửa các dòng import đầu file thành:
```ts
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
```

Nối vào cuối file:
```ts
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
```

- [ ] **Step 4: VoidModal dùng chung**

`src/components/common/void-modal.tsx`:
```tsx
"use client";

import { Input, Modal } from "antd";
import { useState } from "react";

interface VoidModalProps {
  open: boolean;
  description: string;
  onCancel: () => void;
  /** Trả true khi hủy thành công để đóng modal. */
  onConfirm: (reason: string) => Promise<boolean>;
}

/** Trang cha đổi `key` theo chứng từ đang hủy, nên lý do luôn bắt đầu trống. */
export function VoidModal({ open, description, onCancel, onConfirm }: VoidModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <Modal
      open={open}
      title="Hủy chứng từ"
      okText="Hủy chứng từ"
      okButtonProps={{ danger: true, disabled: !reason.trim(), loading: submitting }}
      cancelText="Đóng"
      onCancel={onCancel}
      onOk={async () => {
        setSubmitting(true);
        await onConfirm(reason);
        setSubmitting(false);
      }}
    >
      <p className="mb-2">{description}</p>
      <Input.TextArea rows={3} placeholder="Lý do hủy" value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  );
}
```

- [ ] **Step 5: Trang chứng từ kho dùng VoidModal**

Trong `src/app/(app)/kho/lich-su/page.tsx`:

- Thay `import { Button, Card, Empty, Input, List, Modal, Tabs, Tag } from "antd";` bằng:
```ts
import { Button, Card, Empty, List, Tabs, Tag } from "antd";
```
và thêm ngay dưới dòng `import { useState } from "react";`:
```ts
import { VoidModal } from "@/components/common/void-modal";
```
- Xóa hai dòng:
```ts
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
```
- Thay `onClick={() => { setReason(""); setVoiding({ id: row.id, fn }); }}` bằng `onClick={() => setVoiding({ id: row.id, fn })}`.
- Thay toàn bộ khối `<Modal ... </Modal>` bằng:
```tsx
      <VoidModal
        key={voiding?.id ?? "none"}
        open={!!voiding}
        description="Kho sẽ được trả lại như trước khi có chứng từ này. Chứng từ vẫn được giữ trong lịch sử."
        onCancel={() => setVoiding(null)}
        onConfirm={async (reason) => {
          if (!voiding) return false;
          const ok = await run(voiding.fn(shop.id, { id: voiding.id, reason }), { success: "Đã hủy chứng từ" });
          if (ok) setVoiding(null);
          return !!ok;
        }}
      />
```

- [ ] **Step 6: Không hiện nút Gỡ cạnh chủ cửa hàng**

Trong `src/app/(app)/thanh-vien/page.tsx`, thay khối `actions={...}` của danh sách thành viên:
```tsx
              actions={
                m.id === user?.uid
                  ? [<Tag key="me">Bạn</Tag>]
                  : [
                      <Popconfirm
                        key="remove"
                        title={`Gỡ ${m.displayName} khỏi cửa hàng?`}
                        okText="Gỡ"
                        cancelText="Không"
                        onConfirm={() => run(removeMemberAction(shop.id, { uid: m.id }), { success: "Đã gỡ thành viên" })}
                      >
                        <Button danger size="small">Gỡ</Button>
                      </Popconfirm>,
                    ]
              }
```
bằng:
```tsx
              actions={
                m.id === user?.uid
                  ? [<Tag key="me">Bạn</Tag>]
                  : m.id === shop.ownerUid
                    ? [<Tag key="owner" color="gold">Chủ</Tag>]
                    : [
                        <Popconfirm
                          key="remove"
                          title={`Gỡ ${m.displayName} khỏi cửa hàng?`}
                          okText="Gỡ"
                          cancelText="Không"
                          onConfirm={() => run(removeMemberAction(shop.id, { uid: m.id }), { success: "Đã gỡ thành viên" })}
                        >
                          <Button danger size="small">Gỡ</Button>
                        </Popconfirm>,
                      ]
              }
```

- [ ] **Step 7: Drawer khách hàng**

`src/components/customers/customer-drawer.tsx`:
```tsx
"use client";

import { App, Button, Drawer, Form, Input, Segmented } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useShop } from "@/components/shop/shop-provider";
import { CUSTOMER_TYPE_LABEL, CUSTOMER_TYPES, type Customer, type CustomerType } from "@/lib/domain/models";
import { saveCustomer, type CustomerValues } from "@/lib/firebase/customers";

interface CustomerDrawerProps {
  open: boolean;
  customer: Customer | null;
  /** Tên gợi ý khi tạo nhanh từ form bán hàng. */
  initialName?: string;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

export function CustomerDrawer({ open, customer, initialName, onClose, onSaved }: CustomerDrawerProps) {
  const { shop } = useShop();
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm<CustomerValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: customer?.name ?? initialName ?? "",
      phone: customer?.phone ?? "",
      type: customer?.type ?? "retail",
      note: customer?.note ?? "",
    });
  }, [customer, form, initialName, open]);

  return (
    <Drawer open={open} onClose={onClose} title={customer ? "Sửa khách hàng" : "Khách hàng mới"}>
      <Form
        form={form}
        layout="vertical"
        onFinish={async (values) => {
          if (!user) return;
          setSaving(true);
          try {
            const id = await saveCustomer(shop.id, user.uid, customer?.id ?? null, values);
            void message.success("Đã lưu khách hàng");
            onSaved?.(id);
            onClose();
          } catch {
            void message.error("Không lưu được. Kiểm tra lại thông tin.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Form.Item name="name" label="Tên" rules={[{ required: true, whitespace: true, max: 100, message: "Nhập tên khách" }]}>
          <Input placeholder="VD: Chị Lan Quận 7" />
        </Form.Item>
        <Form.Item name="phone" label="Số điện thoại" rules={[{ max: 20 }]}>
          <Input inputMode="tel" />
        </Form.Item>
        <Form.Item name="type" label="Loại khách">
          <Segmented<CustomerType> block options={CUSTOMER_TYPES.map((t) => ({ value: t, label: CUSTOMER_TYPE_LABEL[t] }))} />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú" rules={[{ max: 500 }]}>
          <Input.TextArea rows={3} placeholder="VD: thích yến tổ đẹp, mua dịp Tết" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={saving}>Lưu</Button>
      </Form>
    </Drawer>
  );
}
```

- [ ] **Step 8: Kiểm tra**

Run: `npm run typecheck && npm run lint`
Expected: không lỗi. Mở /kho/lich-su và hủy thử một chứng từ trên Emulator. Expected: chạy như trước, ô lý do trống mỗi lần mở.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(client): customers client writes, sales hooks, shared void modal"
```

---

### Task 11: Khung app — nút nổi "+ Bán", Đơn bán, Khách hàng

**Files:**
- Modify: `src/components/layout/app-shell.tsx` (viết lại toàn bộ)

- [ ] **Step 1: Viết lại AppShell**

`src/components/layout/app-shell.tsx`:
```tsx
"use client";

import {
  AppstoreOutlined,
  FileTextOutlined,
  HomeOutlined,
  InboxOutlined,
  LogoutOutlined,
  PlusOutlined,
  ShopOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Drawer } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useShop } from "@/components/shop/shop-provider";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const HOME: NavItem = { href: "/", label: "Tổng quan", icon: <HomeOutlined /> };
const SALES: NavItem = { href: "/ban-hang", label: "Đơn bán", icon: <ShoppingOutlined /> };
const STOCK: NavItem = { href: "/kho", label: "Kho", icon: <InboxOutlined /> };

const MORE: NavItem[] = [
  { href: "/khach-hang", label: "Khách hàng", icon: <UserOutlined /> },
  { href: "/kho/lich-su", label: "Chứng từ kho", icon: <FileTextOutlined /> },
  { href: "/nha-cung-cap", label: "Nhà cung cấp", icon: <ShopOutlined /> },
  { href: "/thanh-vien", label: "Thành viên", icon: <TeamOutlined /> },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/kho") return pathname === "/kho";
  if (href === "/ban-hang") return pathname === "/ban-hang";
  return pathname.startsWith(href);
}

function BottomLink({ item, pathname }: { item: NavItem; pathname: string }) {
  return (
    <Link
      href={item.href}
      className={`flex flex-col items-center py-2 text-xs ${isActive(pathname, item.href) ? "text-amber-800" : "text-stone-500"}`}
    >
      <span className="text-lg">{item.icon}</span>
      {item.label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { shop } = useShop();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 border-r border-[#e9e0ce] bg-white p-4 md:block">
        <div className="mb-4 truncate text-lg font-semibold">{shop.name}</div>
        <Link href="/ban-hang/moi">
          <Button type="primary" block size="large" icon={<PlusOutlined />} className="mb-4">Bán hàng</Button>
        </Link>
        <nav className="space-y-1">
          {[HOME, SALES, STOCK, ...MORE].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                isActive(pathname, item.href) ? "bg-amber-100 font-medium text-amber-900" : "hover:bg-amber-50"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <Button className="mt-6" block icon={<LogoutOutlined />} onClick={() => void signOut()}>
          Đăng xuất
        </Button>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-8">
        <div className="mb-3 truncate font-semibold md:hidden">{shop.name}</div>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 items-end border-t border-[#e9e0ce] bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <BottomLink item={HOME} pathname={pathname} />
        <BottomLink item={SALES} pathname={pathname} />
        <Link href="/ban-hang/moi" className="flex flex-col items-center pb-2 text-xs font-medium text-amber-800">
          <span className="-mt-6 mb-1 grid h-14 w-14 place-items-center rounded-full bg-[#956b18] text-2xl text-white shadow-lg">
            <PlusOutlined />
          </span>
          Bán
        </Link>
        <BottomLink item={STOCK} pathname={pathname} />
        <button type="button" onClick={() => setMoreOpen(true)} className="flex flex-col items-center py-2 text-xs text-stone-500">
          <span className="text-lg"><AppstoreOutlined /></span>
          Thêm
        </button>
      </nav>

      <Drawer placement="bottom" open={moreOpen} onClose={() => setMoreOpen(false)} title="Thêm" size="auto">
        <div className="space-y-1">
          {MORE.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-amber-50"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-amber-50"
          >
            <LogoutOutlined />
            Đăng xuất
          </button>
        </div>
      </Drawer>
    </div>
  );
}
```

- [ ] **Step 2: Kiểm tra**

Run: `npm run typecheck && npm run lint`
Expected: không lỗi. Ở viewport 375px: thanh dưới có 5 ô, nút tròn "+" nổi ở giữa; "Thêm" mở drawer có Khách hàng và Chứng từ kho. (Trang /ban-hang chưa có thì báo 404, các Task sau sẽ tạo.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): bottom nav with floating sell button, sales and customers entries"
```

---

### Task 12: Form tạo đơn bán

**Files:**
- Create: `src/components/sales/sale-form.tsx`, `src/app/(app)/ban-hang/moi/page.tsx`

- [ ] **Step 1: Viết form**

`src/components/sales/sale-form.tsx`:
```tsx
"use client";

import { CopyOutlined, DeleteOutlined, PlusOutlined, UserAddOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Form, Input, InputNumber, Result, Select } from "antd";
import Link from "next/link";
import { useState } from "react";
import { DateField } from "@/components/common/date-field";
import { MoneyInput } from "@/components/common/money-input";
import { useRunAction } from "@/components/common/use-run-action";
import { CustomerDrawer } from "@/components/customers/customer-drawer";
import { ProductSelect } from "@/components/inventory/product-select";
import { useShop } from "@/components/shop/shop-provider";
import { useCustomers, useProducts } from "@/hooks/use-shop-data";
import { todayVN } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { SALE_CHANNEL_LABEL, SALE_CHANNELS, SELLABLE_KINDS, type SaleChannel } from "@/lib/domain/models";
import { formatQty, formatVnd } from "@/lib/domain/money";
import { computeSale, saleSummaryText } from "@/lib/domain/sale";
import { createSaleAction } from "@/server/actions/sales";

interface Line {
  productId?: string;
  qty?: number;
  price?: number | null;
}

interface Values {
  date: string;
  customerId?: string;
  channel: SaleChannel;
  note?: string;
  lines: Line[];
  discount?: number | null;
  paid?: number | null;
}

export function SaleForm({ onNew }: { onNew: () => void }) {
  const { shop } = useShop();
  const { message } = App.useApp();
  const run = useRunAction();
  const products = useProducts();
  const customers = useCustomers();
  const [form] = Form.useForm<Values>();
  const [id] = useState(newId);
  const [saving, setSaving] = useState(false);
  const [customerDrawer, setCustomerDrawer] = useState(false);
  const [done, setDone] = useState<{ code: string; summary: string } | null>(null);

  const lines = Form.useWatch("lines", form) ?? [];
  const discount = Form.useWatch("discount", form) ?? 0;
  const paid = Form.useWatch("paid", form);
  const customerId = Form.useWatch("customerId", form);
  const totals = computeSale(
    lines.map((l) => ({ qty: l?.qty ?? 0, price: l?.price ?? 0 })),
    discount ?? 0,
    paid ?? 0,
  );

  if (done) {
    return (
      <Card>
        <Result
          status="success"
          title={`Đã lưu đơn ${done.code}`}
          extra={[
            <Button
              key="copy"
              type="primary"
              icon={<CopyOutlined />}
              onClick={() =>
                navigator.clipboard
                  .writeText(done.summary)
                  .then(() => message.success("Đã sao chép, dán vào Zalo để gửi khách"))
                  .catch(() => message.error("Không sao chép được"))
              }
            >
              Sao chép tóm tắt
            </Button>,
            <Button key="new" onClick={onNew}>Tạo đơn mới</Button>,
            <Link key="list" href="/ban-hang"><Button type="link">Xem đơn bán</Button></Link>,
          ]}
        />
        <pre className="whitespace-pre-wrap rounded-xl bg-amber-50 p-3 text-sm">{done.summary}</pre>
      </Card>
    );
  }

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ date: todayVN(), channel: "zalo", lines: [{}], discount: 0 }}
        onValuesChange={(changed: Partial<Values>) => {
          // Chọn sản phẩm thì điền sẵn giá bán gợi ý.
          changed.lines?.forEach((line, index) => {
            const product = line?.productId ? products.byId.get(line.productId) : undefined;
            if (product) form.setFieldValue(["lines", index, "price"], product.suggestedPrice);
          });
        }}
        onFinish={async (values) => {
          setSaving(true);
          const payload = {
            id,
            date: values.date,
            customerId: values.customerId ?? null,
            channel: values.channel,
            note: values.note ?? "",
            lines: values.lines.map((l) => ({ productId: l.productId, qty: l.qty, price: l.price ?? 0 })),
            discount: values.discount ?? 0,
            paid: values.paid ?? 0,
          };
          const result = await run(createSaleAction(shop.id, payload), { form });
          setSaving(false);
          if (!result) return;
          const t = computeSale(payload.lines.map((l) => ({ qty: l.qty ?? 0, price: l.price })), payload.discount, payload.paid);
          setDone({
            code: result.code,
            summary: saleSummaryText({
              shopName: shop.name,
              code: result.code,
              date: payload.date,
              lines: payload.lines.map((l) => {
                const p = products.byId.get(l.productId!)!;
                return { name: p.name, unit: p.unit, qty: l.qty!, price: l.price };
              }),
              subtotal: t.subtotal,
              discount: payload.discount,
              total: t.total,
              paid: payload.paid,
              debt: t.debt,
            }),
          });
        }}
      >
        <Card>
          <div className="flex items-end gap-2">
            <Form.Item className="mb-0! flex-1" name="customerId" label="Khách hàng">
              <Select
                allowClear
                placeholder="Khách lẻ"
                showSearch={{ optionFilterProp: "label" }}
                options={customers.data.map((c) => ({
                  value: c.id,
                  label: [c.name, c.phone].filter(Boolean).join(" · "),
                }))}
              />
            </Form.Item>
            <Button icon={<UserAddOutlined />} onClick={() => setCustomerDrawer(true)} aria-label="Khách mới" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Form.Item name="channel" label="Kênh bán">
              <Select options={SALE_CHANNELS.map((c) => ({ value: c, label: SALE_CHANNEL_LABEL[c] }))} />
            </Form.Item>
            <Form.Item name="date" label="Ngày">
              <DateField />
            </Form.Item>
          </div>
        </Card>

        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <div className="mt-4 space-y-3">
              {fields.map((field) => {
                const line = lines[field.name];
                const product = line?.productId ? products.byId.get(line.productId) : undefined;
                const unit = product?.unit === "piece" ? "cái" : "g";
                return (
                  <Card
                    key={field.key}
                    size="small"
                    extra={fields.length > 1 && <Button type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />}
                  >
                    <Form.Item name={[field.name, "productId"]} label="Sản phẩm" rules={[{ required: true, message: "Chọn sản phẩm" }]}>
                      <ProductSelect products={products.data} kinds={SELLABLE_KINDS} />
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-3">
                      <Form.Item
                        name={[field.name, "qty"]}
                        label="Số lượng"
                        rules={[{ required: true, message: "Nhập số lượng" }]}
                        extra={product && line?.qty && line.qty > product.stockQty ? `Chỉ còn ${formatQty(product.stockQty, product.unit)}` : undefined}
                      >
                        <InputNumber className="w-full!" min={1} precision={0} suffix={unit} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "price"]}
                        label={`Đơn giá (₫/${unit})`}
                        rules={[{ required: true, type: "number", min: 0, message: "Nhập giá" }]}
                        extra={line?.qty && line?.price ? `= ${formatVnd(line.qty * line.price)}` : undefined}
                      >
                        <MoneyInput />
                      </Form.Item>
                    </div>
                  </Card>
                );
              })}
              <Button block icon={<PlusOutlined />} onClick={() => add({})}>Thêm sản phẩm</Button>
            </div>
          )}
        </Form.List>

        <Card className="mt-4!">
          <div className="mb-3 flex justify-between"><span>Tạm tính</span><span>{formatVnd(totals.subtotal)}</span></div>
          <Form.Item name="discount" label="Giảm giá">
            <MoneyInput />
          </Form.Item>
          <div className="mb-3 flex justify-between text-lg font-semibold"><span>Tổng cộng</span><span>{formatVnd(totals.total)}</span></div>
          <div className="flex items-end gap-2">
            <Form.Item
              className="mb-0! flex-1"
              name="paid"
              label="Khách trả"
              rules={[{ required: true, type: "number", min: 0, message: "Nhập số tiền khách trả" }]}
            >
              <MoneyInput />
            </Form.Item>
            <Button onClick={() => form.setFieldValue("paid", totals.total)}>Trả đủ</Button>
          </div>
          {paid != null && totals.debt > 0 && (
            <Alert
              className="mt-3!"
              type={customerId ? "warning" : "error"}
              showIcon
              title={`Còn nợ ${formatVnd(totals.debt)}${customerId ? "" : " — chọn khách hàng để ghi nợ"}`}
            />
          )}
          <Form.Item name="note" label="Ghi chú" className="mt-4!">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={saving}>Lưu đơn</Button>
        </Card>
      </Form>

      <CustomerDrawer
        open={customerDrawer}
        customer={null}
        onClose={() => setCustomerDrawer(false)}
        onSaved={(newCustomerId) => form.setFieldValue("customerId", newCustomerId)}
      />
    </>
  );
}
```

`src/app/(app)/ban-hang/moi/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { SaleForm } from "@/components/sales/sale-form";

export default function NewSalePage() {
  // Đổi key để có form trống và ID đơn mới.
  const [round, setRound] = useState(0);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Bán hàng</h1>
      <SaleForm key={round} onNew={() => setRound((r) => r + 1)} />
    </div>
  );
}
```

- [ ] **Step 2: Kiểm tra trên trình duyệt (Emulator)**

Với Emulator và `npm run dev`, dữ liệu kho như cuối Kế hoạch 1 (Yến tinh tổ đẹp 700g @25.000, Yến chưng 70ml 10 cái @257.000):

1. Bấm "+" → chọn sản phẩm tổ đẹp. Expected: ô đơn giá tự điền giá gợi ý (`45.000`). Nhập 100g.
2. Thêm dòng Yến chưng 2 cái, sửa giá `300k`, giảm giá `100k`. Expected: tạm tính 5.100.000 ₫, tổng 5.000.000 ₫.
3. Khách trả `3tr`, chưa chọn khách. Expected: cảnh báo đỏ "Còn nợ 2.000.000 ₫ — chọn khách hàng để ghi nợ". Bấm Lưu: lỗi "Đơn còn nợ phải chọn khách hàng."
4. Bấm nút thêm khách, tạo "Chị Lan" (Đại lý). Expected: ô khách tự chọn Chị Lan. Lưu.
5. Expected: màn "Đã lưu đơn DH-2026-0001", tóm tắt có đủ dòng, "Còn nợ: 2.000.000 ₫"; "Sao chép tóm tắt" báo đã sao chép; "Tạo đơn mới" ra form trống.
6. Kiểm tra kho: tổ đẹp còn 600g, chưng còn 8 cái.

Run: `npm run typecheck && npm run lint`
Expected: không lỗi.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): sale form with suggested prices, debt warning and copyable summary"
```

---

### Task 13: Danh sách đơn bán

**Files:**
- Create: `src/app/(app)/ban-hang/page.tsx`

- [ ] **Step 1: Viết trang**

`src/app/(app)/ban-hang/page.tsx`:
```tsx
"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Empty, List, Segmented, Tag } from "antd";
import Link from "next/link";
import { useState } from "react";
import { VoidModal } from "@/components/common/void-modal";
import { useRunAction } from "@/components/common/use-run-action";
import { useShop } from "@/components/shop/shop-provider";
import { useCustomers, useProducts, useRecentSales } from "@/hooks/use-shop-data";
import { formatDate } from "@/lib/domain/dates";
import { SALE_CHANNEL_LABEL, type SaleDoc } from "@/lib/domain/models";
import { formatQty, formatVnd } from "@/lib/domain/money";
import { voidSaleAction } from "@/server/actions/sales";

type Filter = "all" | "debt" | "voided";

export default function SalesPage() {
  const { shop } = useShop();
  const run = useRunAction();
  const sales = useRecentSales();
  const products = useProducts();
  const customers = useCustomers();
  const [filter, setFilter] = useState<Filter>("all");
  const [voiding, setVoiding] = useState<SaleDoc | null>(null);

  const shown = sales.data.filter((s) =>
    filter === "voided" ? s.status === "voided" : filter === "debt" ? s.status === "active" && s.debt > 0 : true,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Đơn bán</h1>
        <Link href="/ban-hang/moi"><Button type="primary" icon={<PlusOutlined />}>Bán hàng</Button></Link>
      </div>
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Tất cả" },
          { value: "debt", label: "Còn nợ" },
          { value: "voided", label: "Đã hủy" },
        ]}
      />
      <Card loading={sales.loading}>
        {shown.length === 0 ? (
          <Empty description="Chưa có đơn bán" />
        ) : (
          <List
            dataSource={shown}
            renderItem={(s) => {
              const customer = s.customerId ? customers.byId.get(s.customerId) : undefined;
              return (
                <List.Item
                  actions={
                    s.status === "active"
                      ? [<Button key="void" danger size="small" onClick={() => setVoiding(s)}>Hủy</Button>]
                      : [<Tag key="voided">Đã hủy</Tag>]
                  }
                >
                  <List.Item.Meta
                    title={
                      <span className={s.status === "voided" ? "line-through opacity-60" : ""}>
                        {s.code} · {customer ? <Link href={`/khach-hang/${customer.id}`}>{customer.name}</Link> : "Khách lẻ"}
                      </span>
                    }
                    description={
                      <div className="space-y-0.5">
                        <div>
                          {formatDate(s.date)} · {SALE_CHANNEL_LABEL[s.channel]} · <b>{formatVnd(s.total)}</b>
                          {s.status === "active" && s.debt > 0 && <Tag color="error" className="ml-2!">nợ {formatVnd(s.debt)}</Tag>}
                        </div>
                        {s.lines.map((l, i) => {
                          const p = products.byId.get(l.productId);
                          return <div key={i}>{p ? `${p.name} ${formatQty(l.qty, p.unit)}` : l.productId}</div>;
                        })}
                        {s.voidReason && <div className="text-red-500">Lý do hủy: {s.voidReason}</div>}
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>
      <VoidModal
        key={voiding?.id ?? "none"}
        open={!!voiding}
        description="Hàng sẽ được trả lại kho, doanh thu và công nợ của đơn này bị trừ đi. Đơn vẫn được giữ trong lịch sử."
        onCancel={() => setVoiding(null)}
        onConfirm={async (reason) => {
          if (!voiding) return false;
          const ok = await run(voidSaleAction(shop.id, { id: voiding.id, reason }), { success: "Đã hủy đơn" });
          if (ok) setVoiding(null);
          return !!ok;
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Kiểm tra trên trình duyệt**

Expected:
- /ban-hang có đơn DH-2026-0001 của Chị Lan, nhãn "nợ 2.000.000 ₫".
- Lọc "Còn nợ" vẫn thấy đơn đó.
- Tạo đơn thứ hai cho khách lẻ, trả đủ, rồi hủy với lý do "Thử". Expected: đơn gạch ngang, kho trả lại đúng số đã bán.

Run: `npm run typecheck && npm run lint`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): sales list with debt filter and void"
```

---

### Task 14: Trang khách hàng và chi tiết khách (thu nợ)

**Files:**
- Create: `src/app/(app)/khach-hang/page.tsx`, `src/app/(app)/khach-hang/[id]/page.tsx`

- [ ] **Step 1: Danh sách khách**

`src/app/(app)/khach-hang/page.tsx`:
```tsx
"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Input, List, Segmented, Tag } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CustomerDrawer } from "@/components/customers/customer-drawer";
import { useCustomers } from "@/hooks/use-shop-data";
import { formatDate } from "@/lib/domain/dates";
import { CUSTOMER_TYPE_LABEL, type CustomerType } from "@/lib/domain/models";
import { formatVnd } from "@/lib/domain/money";

type Filter = "all" | CustomerType | "debt";

export default function CustomersPage() {
  const router = useRouter();
  const { data: customers, loading } = useCustomers();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const keyword = search.trim().toLowerCase();
  const shown = customers.filter(
    (c) =>
      (filter === "all" || (filter === "debt" ? (c.debtBalance ?? 0) > 0 : c.type === filter)) &&
      (!keyword || c.name.toLowerCase().includes(keyword) || (c.phone ?? "").includes(keyword)),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Khách hàng</h1>
        <Button icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>Thêm</Button>
      </div>
      <Input.Search allowClear placeholder="Tìm theo tên hoặc số điện thoại" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Tất cả" },
          { value: "retail", label: CUSTOMER_TYPE_LABEL.retail },
          { value: "agent", label: CUSTOMER_TYPE_LABEL.agent },
          { value: "debt", label: "Còn nợ" },
        ]}
      />
      <Card loading={loading}>
        {shown.length === 0 ? (
          <Empty description="Chưa có khách hàng" />
        ) : (
          <List
            dataSource={shown}
            renderItem={(c) => (
              <List.Item
                className="cursor-pointer"
                onClick={() => router.push(`/khach-hang/${c.id}`)}
                extra={(c.debtBalance ?? 0) > 0 ? <Tag color="error" className="m-0!">nợ {formatVnd(c.debtBalance ?? 0)}</Tag> : null}
              >
                <List.Item.Meta
                  title={c.name}
                  description={[
                    CUSTOMER_TYPE_LABEL[c.type],
                    c.phone,
                    c.totalSpent ? `đã mua ${formatVnd(c.totalSpent)}` : null,
                    c.lastPurchaseAt ? `lần cuối ${formatDate(c.lastPurchaseAt)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
      <CustomerDrawer
        open={drawerOpen}
        customer={null}
        initialName={search.trim() || undefined}
        onClose={() => setDrawerOpen(false)}
        onSaved={(id) => router.push(`/khach-hang/${id}`)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Chi tiết khách và thu nợ**

`src/app/(app)/khach-hang/[id]/page.tsx`:
```tsx
"use client";

import { EditOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Form, Input, List, Modal, Result, Segmented, Tabs, Tag } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/common/date-field";
import { MoneyInput } from "@/components/common/money-input";
import { useRunAction } from "@/components/common/use-run-action";
import { VoidModal } from "@/components/common/void-modal";
import { CustomerDrawer } from "@/components/customers/customer-drawer";
import { useShop } from "@/components/shop/shop-provider";
import { useCustomerPayments, useCustomers, useCustomerSales } from "@/hooks/use-shop-data";
import { formatDate, todayVN } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { CUSTOMER_TYPE_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_METHODS, type PaymentDoc, type PaymentMethod } from "@/lib/domain/models";
import { formatVnd } from "@/lib/domain/money";
import { createPaymentAction, voidPaymentAction } from "@/server/actions/sales";

interface PaymentValues {
  amount: number | null;
  method: PaymentMethod;
  date: string;
  note?: string;
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { shop } = useShop();
  const run = useRunAction();
  const customers = useCustomers();
  const sales = useCustomerSales(id);
  const payments = useCustomerPayments(id);
  const [editOpen, setEditOpen] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [voiding, setVoiding] = useState<PaymentDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<PaymentValues>();

  const customer = customers.byId.get(id);
  if (customers.loading) return <Card loading />;
  if (!customer) {
    return <Result status="404" title="Không tìm thấy khách hàng" extra={<Link href="/khach-hang"><Button>Về danh sách</Button></Link>} />;
  }
  const debt = customer.debtBalance ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <div className="text-stone-500">
            {[CUSTOMER_TYPE_LABEL[customer.type], customer.phone].filter(Boolean).join(" · ")}
          </div>
          {customer.note && <div className="mt-1">{customer.note}</div>}
        </div>
        <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>Sửa</Button>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-stone-500">Đang nợ</div>
            <div className={`text-2xl font-semibold ${debt > 0 ? "text-red-600" : ""}`}>{formatVnd(debt)}</div>
            <div className="text-sm text-stone-500">Đã mua {formatVnd(customer.totalSpent ?? 0)}</div>
          </div>
          <Button
            type="primary"
            size="large"
            disabled={debt <= 0}
            onClick={() => {
              form.setFieldsValue({ amount: debt, method: "transfer", date: todayVN(), note: "" });
              setPaying(newId());
            }}
          >
            Thu nợ
          </Button>
        </div>
      </Card>

      <Tabs
        items={[
          {
            key: "sales",
            label: "Đơn hàng",
            children: (
              <Card loading={sales.loading}>
                {sales.data.length === 0 ? (
                  <Empty description="Chưa có đơn" />
                ) : (
                  <List
                    dataSource={sales.data}
                    renderItem={(s) => (
                      <List.Item extra={s.status === "voided" ? <Tag>Đã hủy</Tag> : s.debt > 0 ? <Tag color="error">nợ {formatVnd(s.debt)}</Tag> : null}>
                        <List.Item.Meta
                          title={<span className={s.status === "voided" ? "line-through opacity-60" : ""}>{s.code}</span>}
                          description={`${formatDate(s.date)} · ${formatVnd(s.total)}`}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            ),
          },
          {
            key: "payments",
            label: "Thu nợ",
            children: (
              <Card loading={payments.loading}>
                {payments.data.length === 0 ? (
                  <Empty description="Chưa có phiếu thu" />
                ) : (
                  <List
                    dataSource={payments.data}
                    renderItem={(p) => (
                      <List.Item
                        actions={
                          p.status === "active"
                            ? [<Button key="void" danger size="small" onClick={() => setVoiding(p)}>Hủy</Button>]
                            : [<Tag key="voided">Đã hủy</Tag>]
                        }
                      >
                        <List.Item.Meta
                          title={<span className={p.status === "voided" ? "line-through opacity-60" : ""}>{formatVnd(p.amount)}</span>}
                          description={[formatDate(p.date), PAYMENT_METHOD_LABEL[p.method], p.note, p.voidReason && `Lý do hủy: ${p.voidReason}`]
                            .filter(Boolean)
                            .join(" · ")}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            ),
          },
        ]}
      />

      <Modal
        open={!!paying}
        title={`Thu nợ ${customer.name}`}
        okText="Lưu phiếu thu"
        cancelText="Đóng"
        okButtonProps={{ loading: saving }}
        forceRender
        onCancel={() => setPaying(null)}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (!paying) return;
            setSaving(true);
            const ok = await run(
              createPaymentAction(shop.id, { id: paying, customerId: customer.id, ...values, note: values.note ?? "" }),
              { success: "Đã ghi phiếu thu", form },
            );
            setSaving(false);
            if (ok) setPaying(null);
          }}
        >
          <Form.Item name="amount" label="Số tiền" rules={[{ required: true, type: "number", min: 1, message: "Nhập số tiền" }]}>
            <MoneyInput />
          </Form.Item>
          <Form.Item name="method" label="Hình thức">
            <Segmented<PaymentMethod> block options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))} />
          </Form.Item>
          <Form.Item name="date" label="Ngày">
            <DateField />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <VoidModal
        key={voiding?.id ?? "none"}
        open={!!voiding}
        description="Số tiền của phiếu này sẽ được cộng lại vào công nợ của khách."
        onCancel={() => setVoiding(null)}
        onConfirm={async (reason) => {
          if (!voiding) return false;
          const ok = await run(voidPaymentAction(shop.id, { id: voiding.id, reason }), { success: "Đã hủy phiếu thu" });
          if (ok) setVoiding(null);
          return !!ok;
        }}
      />

      <CustomerDrawer open={editOpen} customer={customer} onClose={() => setEditOpen(false)} />
    </div>
  );
}
```

`paying` giữ ID phiếu thu được sinh mỗi lần mở modal, nên bấm Lưu lại sau lỗi mạng cũng không ghi hai phiếu.

- [ ] **Step 3: Kiểm tra trên trình duyệt**

1. /khach-hang có Chị Lan, nhãn "nợ 2.000.000 ₫"; tìm "lan" hoặc lọc "Còn nợ" vẫn thấy.
2. Mở Chị Lan → "Thu nợ", sửa số tiền thành `500k`, chọn Chuyển khoản, lưu. Expected: đang nợ 1.500.000 ₫, tab Thu nợ có phiếu 500.000 ₫.
3. Thử thu `2tr`. Expected: lỗi "Khách chỉ còn nợ 1.500.000 ₫."
4. Vào /ban-hang, hủy đơn DH-2026-0001. Expected: bị chặn, báo phải hủy phiếu thu trước.
5. Hủy phiếu thu 500.000 ₫ ở trang khách. Expected: nợ lại 2.000.000 ₫. Sau đó hủy đơn được, nợ về 0.
6. Sửa SĐT khách ở nút "Sửa". Expected: lưu được (rules cho phép), công nợ không đổi.

Run: `npm run typecheck && npm run lint`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): customers list and detail with debt collection"
```

---

### Task 15: Trang Tổng quan

**Files:**
- Modify: `src/app/(app)/page.tsx` (viết lại toàn bộ)

- [ ] **Step 1: Viết lại trang**

`src/app/(app)/page.tsx`:
```tsx
"use client";

import { Button, Card, Empty, List, Tag } from "antd";
import Link from "next/link";
import { useCustomers, useMonthStats, useProducts, useTodaySales, useTopDebtors } from "@/hooks/use-shop-data";
import { monthKey, todayVN } from "@/lib/domain/dates";
import { PRODUCT_KIND_LABEL } from "@/lib/domain/models";
import { formatQty, formatVnd } from "@/lib/domain/money";

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-sm text-stone-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-stone-500">{hint}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const today = todayVN();
  const todaySales = useTodaySales();
  const month = useMonthStats(monthKey(today));
  const debtors = useTopDebtors();
  const customers = useCustomers();
  const products = useProducts();

  const active = todaySales.data.filter((s) => s.status === "active");
  const todayRevenue = active.reduce((sum, s) => sum + s.total, 0);
  const todayCogs = active.reduce((sum, s) => sum + s.lines.reduce((x, l) => x + l.totalCost, 0), 0);
  const monthRevenue = month.data?.revenue ?? 0;
  const monthProfit = monthRevenue - (month.data?.cogs ?? 0);
  const totalDebt = customers.data.reduce((sum, c) => sum + (c.debtBalance ?? 0), 0);
  const lowStock = products.data.filter((p) => !p.archived && p.lowStockThreshold > 0 && p.stockQty <= p.lowStockThreshold);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Tổng quan</h1>

      <div className="grid grid-cols-3 gap-2">
        <Link href="/ban-hang/moi"><Button type="primary" block size="large">Bán hàng</Button></Link>
        <Link href="/kho/nhap"><Button block size="large">Nhập kho</Button></Link>
        <Link href="/kho/che-bien"><Button block size="large">Chế biến</Button></Link>
      </div>

      <Card title="Hôm nay" loading={todaySales.loading}>
        <div className="grid grid-cols-3 gap-3">
          <Figure label="Doanh thu" value={formatVnd(todayRevenue)} />
          <Figure label="Lãi gộp" value={formatVnd(todayRevenue - todayCogs)} />
          <Figure label="Số đơn" value={String(active.length)} />
        </div>
      </Card>

      <Card title="Tháng này" loading={month.loading}>
        <div className="grid grid-cols-3 gap-3">
          <Figure label="Doanh thu" value={formatVnd(monthRevenue)} />
          <Figure
            label="Lãi gộp"
            value={formatVnd(monthProfit)}
            hint={monthRevenue > 0 ? `${((monthProfit / monthRevenue) * 100).toFixed(1)}%` : undefined}
          />
          <Figure label="Số đơn" value={String(month.data?.saleCount ?? 0)} />
        </div>
        <div className="mt-2 text-xs text-stone-500">Lãi gộp = doanh thu − giá vốn hàng bán, chưa trừ chi phí.</div>
      </Card>

      <Card
        title="Công nợ"
        loading={debtors.loading}
        extra={<span className="font-semibold text-red-600">{formatVnd(totalDebt)}</span>}
      >
        {debtors.data.length === 0 ? (
          <Empty description="Không có khách nào đang nợ" />
        ) : (
          <List
            dataSource={debtors.data}
            renderItem={(c) => (
              <List.Item extra={<Tag color="error">{formatVnd(c.debtBalance ?? 0)}</Tag>}>
                <Link href={`/khach-hang/${c.id}`}>{c.name}</Link>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card title="Sắp hết hàng" loading={products.loading}>
        {lowStock.length === 0 ? (
          <Empty description="Chưa có sản phẩm nào dưới mức cảnh báo" />
        ) : (
          <List
            dataSource={lowStock}
            renderItem={(p) => (
              <List.Item extra={<Tag color="warning">còn {formatQty(p.stockQty, p.unit)}</Tag>}>
                <List.Item.Meta title={p.name} description={PRODUCT_KIND_LABEL[p.kind]} />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Kiểm tra trên trình duyệt**

Sau khi tạo lại một đơn còn nợ (giống Task 12):
- "Hôm nay" và "Tháng này" có doanh thu 5.000.000 ₫, lãi gộp 1.986.000 ₫ (5.000.000 − 3.014.000), 1 đơn. Tháng này hiện 39,7%.
- "Công nợ" tổng 2.000.000 ₫, có Chị Lan.
- Hủy đơn: các số về 0 ngay (realtime).

Run: `npm run typecheck && npm run lint`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): dashboard with today, month, debt and low stock"
```

---

### Task 16: Kiểm tra tổng thể và triển khai rules, indexes lên Firebase thật

**Files:** không có file mới.

- [ ] **Step 1: Chạy toàn bộ kiểm tra**

Dừng `npm run emulators` nếu đang chạy, rồi:
```bash
npm test && PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:emulator && npm run typecheck && npm run lint && npm run build
```
Expected: tất cả PASS, build thành công, có thêm các route `/ban-hang`, `/ban-hang/moi`, `/khach-hang`, `/khach-hang/[id]`.

- [ ] **Step 2: Đi hết luồng trên Emulator ở viewport 375px**

Nhập kho → làm sạch → bán khách lẻ trả đủ → bán đại lý còn nợ (tạo khách ngay trong form) → sao chép tóm tắt → thu nợ một phần → hủy thử đơn (bị chặn) → hủy phiếu thu → hủy đơn → xem Tổng quan.
Expected: kho, công nợ, doanh thu tháng và lãi gộp khớp phép tính tay ở mỗi bước, không có lỗi console ngoài cảnh báo `List` deprecated.

- [ ] **Step 3: Hỏi người dùng trước khi triển khai lên Firebase thật**

Rules mới (cho phép client ghi `customers`) và indexes mới chỉ có hiệu lực trên `so-yen-app` sau khi deploy. Hỏi xác nhận rồi mới chạy:
```bash
npx -y firebase-tools@latest deploy --only firestore --project so-yen-app
```
Expected: `Deploy complete!`. Index tổng hợp có thể mất vài phút mới xây xong. Trước khi xong, trang chi tiết khách trên bản thật có thể báo lỗi index.

- [ ] **Step 4: Commit (nếu có sửa) và báo cáo**

Không có file mới trong task này. Nếu Step 1–2 phải sửa gì thì commit theo từng sửa đổi, ghi rõ trong báo cáo.
