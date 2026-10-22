# Sổ Yến — Kế hoạch 1: Nền tảng, kho và chế biến

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng app Sổ Yến chạy được với đăng nhập Google, cửa hàng dùng chung, sản phẩm, nhà cung cấp, nhập kho (thu hoạch/mua), chế biến (làm sạch/chưng/đóng hộp), điều chỉnh kho và hủy chứng từ. Giá vốn bình quân tính đúng.

**Architecture:** Next.js 16 App Router. Client đọc Firestore realtime bằng Firebase JS SDK. Mọi nghiệp vụ ảnh hưởng kho đi qua Server Actions (`firebase-admin`, một Firestore transaction cho mỗi nghiệp vụ). Logic tính toán là hàm thuần trong `src/lib/domain/`. Các service trong `src/server/services/` nhận `Firestore` làm tham số để test được trên Emulator. Server action chỉ là lớp mỏng: xác thực rồi gọi service.

**Tech Stack:** Next.js 16.4, React 19.3, TypeScript, Ant Design 6, Tailwind CSS 4, Firebase 12 (Auth, Firestore), firebase-admin 14, zod 4, Vitest 4, Firebase Emulator Suite.

**Spec:** `docs/superpowers/specs/2026-10-22-so-yen-design.md`

**Các kế hoạch sau:** Kế hoạch 2 (bán hàng, khách hàng, công nợ, `stats`) và Kế hoạch 3 (chi phí, báo cáo, thuế, xuất Excel) sẽ viết sau khi kế hoạch này xong.

**Quy ước commit:** mọi commit message kết thúc bằng dòng trống rồi
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Trước khi viết code Next.js:** đọc `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` và `authentication.md`. Đây là Next.js 16 và có thay đổi so với các bản cũ: `cookies()` là async, file `proxy.ts` thay cho `middleware.ts`, `params` của page là Promise.

**Yêu cầu máy:** Node.js ≥ 20.9 và Java ≥ 11 (cho Firebase Emulator). Kiểm tra bằng `node -v` và `java -version`.

---

## Cấu trúc file

```text
so-yen-app/
  package.json, tsconfig.json, next.config.ts, eslint.config.mjs, vitest.config.ts
  firebase.json, .firebaserc, firestore.rules, firestore.indexes.json
  .env.example, .gitignore, README.md
  src/
    app/
      layout.tsx, globals.css
      api/session/route.ts           tạo/xóa session cookie
      (app)/layout.tsx               AuthGate → ShopGate → AppShell
      (app)/page.tsx                 Tổng quan
      (app)/kho/page.tsx             danh sách tồn kho + sản phẩm
      (app)/kho/nhap/page.tsx        phiếu nhập
      (app)/kho/che-bien/page.tsx    phiếu chế biến
      (app)/kho/dieu-chinh/page.tsx  phiếu điều chỉnh
      (app)/kho/lich-su/page.tsx     danh sách chứng từ + hủy
      (app)/nha-cung-cap/page.tsx
      (app)/thanh-vien/page.tsx
    lib/
      domain/                        hàm thuần, dùng chung client/server
        errors.ts   money.ts   dates.ts   ids.ts
        models.ts   schemas.ts
        costing.ts  stock.ts   production.ts
      firebase/
        config.ts  client.ts  suppliers.ts
    server/
      firebase-admin.ts  actor.ts  auth.ts  run-action.ts
      services/
        membership.ts  products.ts  inventory.ts
        receipts.ts    productions.ts  adjustments.ts
      actions/
        shop.ts  inventory.ts
    components/
      providers.tsx
      auth/auth-provider.tsx  auth/auth-gate.tsx
      shop/shop-provider.tsx
      layout/app-shell.tsx
      common/money-input.tsx  common/use-run-action.ts  common/date-field.tsx
      products/product-drawer.tsx
      inventory/product-select.tsx
    hooks/
      use-live-query.ts  use-shop-data.ts
  tests/
    unit/          *.test.ts   (không cần emulator)
    integration/   *.test.ts   (Firestore + Auth emulator)
    rules/         firestore.rules.test.ts
```

---

### Task 1: Khởi tạo dự án

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `.gitignore`, `firebase.json`, `.firebaserc`, `firestore.indexes.json`, `.env.example`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/providers.tsx`, `src/app/(app)/page.tsx` (tạm)

Repo `/Users/giahuy/Github/so-yen-app` đã có git và thư mục `docs/`.

- [ ] **Step 1: Sao chép các file cấu hình giống hệt bo-do-it**

```bash
cd /Users/giahuy/Github/so-yen-app
cp ../bo-do-it-app/tsconfig.json ../bo-do-it-app/next.config.ts ../bo-do-it-app/eslint.config.mjs ../bo-do-it-app/vitest.config.ts ../bo-do-it-app/.gitignore .
```

- [ ] **Step 2: Tạo `package.json`**

```json
{
  "name": "so-yen",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "next typegen && tsc --noEmit",
    "emulators": "npx -y firebase-tools@latest emulators:start --only auth,firestore --project demo-so-yen",
    "test": "vitest run tests/unit",
    "test:emulator": "npx -y firebase-tools@latest emulators:exec --only auth,firestore --project demo-so-yen \"vitest run tests/integration tests/rules --no-file-parallelism\""
  },
  "dependencies": {
    "@ant-design/cssinjs": "^2.1.2",
    "@ant-design/icons": "^6.3.4",
    "@ant-design/nextjs-registry": "^1.3.0",
    "antd": "^6.6.5",
    "dayjs": "^1.11.23",
    "firebase": "^12.19.0",
    "firebase-admin": "^14.5.0",
    "next": "16.4.0",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "zod": "^4.1.0"
  },
  "devDependencies": {
    "@firebase/rules-unit-testing": "^5.0.2",
    "@tailwindcss/turbopack": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.4.0",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.11"
  },
  "overrides": {
    "@firebase/app": "0.16.2",
    "@firebase/app-compat": "0.5.18"
  }
}
```

Run: `npm install`
Expected: cài xong, không có lỗi `ERESOLVE`.

- [ ] **Step 3: Tạo cấu hình Firebase**

`firebase.json`:
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
```

`.firebaserc`:
```json
{ "projects": { "default": "demo-so-yen" } }
```

`firestore.indexes.json` (bật index collection group cho `invites.email`, dùng khi tìm lời mời):
```json
{
  "indexes": [],
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

Tạo `firestore.rules` tạm (Task 11 sẽ viết bản thật):
```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

`.env.example`:
```bash
# Sao chép thành .env.local.
# Phát triển với Emulator: giữ nguyên các giá trị demo dưới đây và chạy `npm run emulators`.
NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-so-yen.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-so-yen
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=demo-app
NEXT_PUBLIC_USE_EMULATORS=true

# Chỉ dùng phía server. Khi dùng Emulator, firebase-admin tự kết nối qua hai biến này.
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099

# Production: bỏ 3 biến emulator ở trên, điền cấu hình Web App thật và
# FIREBASE_SERVICE_ACCOUNT = nội dung JSON của service account key, viết trên một dòng.
FIREBASE_SERVICE_ACCOUNT=
```

Run: `cp .env.example .env.local`

- [ ] **Step 4: Tạo layout gốc, CSS và providers**

`src/app/globals.css`:
```css
@import "tailwindcss";

:root {
  --app-bg: #faf8f1;
}

body {
  background: var(--app-bg);
  color: #302b20;
}
```

`src/components/providers.tsx`:
```tsx
"use client";

import { StyleProvider } from "@ant-design/cssinjs";
import { App, ConfigProvider, type ThemeConfig } from "antd";
import viVN from "antd/locale/vi_VN";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";

const theme: ThemeConfig = {
  token: {
    colorPrimary: "#956b18",
    colorInfo: "#956b18",
    colorSuccess: "#58a97d",
    colorWarning: "#d5a936",
    colorError: "#dc6e73",
    colorText: "#302b20",
    colorBorder: "#e9e0ce",
    colorBgLayout: "#faf8f1",
    borderRadius: 12,
    fontFamily: 'var(--font-vietnam), "Segoe UI", sans-serif',
    controlHeight: 40,
  },
};

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StyleProvider layer>
      <ConfigProvider locale={viVN} theme={theme}>
        <App>
          <AuthProvider>{children}</AuthProvider>
        </App>
      </ConfigProvider>
    </StyleProvider>
  );
}
```

`src/app/layout.tsx`:
```tsx
import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { Providers } from "@/components/providers";
import "./globals.css";

const font = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-vietnam",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf8f1",
};

export const metadata: Metadata = {
  title: "Sổ Yến",
  description: "Sổ sách kho, bán hàng và thuế cho hộ kinh doanh yến sào.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${font.variable} h-full antialiased`}>
      <head>
        <style>{"@layer theme, base, antd, components, utilities;"}</style>
      </head>
      <body className="min-h-full font-sans">
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
```

Tạo `src/components/auth/auth-provider.tsx` tạm để build được (Task 13 sẽ thay):
```tsx
"use client";

import type { ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
  return children;
}
```

`src/app/(app)/page.tsx` tạm:
```tsx
export default function HomePage() {
  return <main className="p-6">Sổ Yến</main>;
}
```

- [ ] **Step 5: Kiểm tra build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: cả ba lệnh đều chạy xong không lỗi. Next.js có thể tự sinh `AGENTS.md`, cứ giữ lại.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Firebase project"
```

---

### Task 2: Domain — lỗi, tiền, ngày, ID

**Files:**
- Create: `src/lib/domain/errors.ts`, `src/lib/domain/money.ts`, `src/lib/domain/dates.ts`, `src/lib/domain/ids.ts`
- Test: `tests/unit/money.test.ts`, `tests/unit/dates.test.ts`

- [ ] **Step 1: Viết test thất bại**

`tests/unit/money.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { formatNumber, formatQty, formatVnd, parseMoney } from "@/lib/domain/money";

describe("formatVnd", () => {
  test("dùng dấu chấm phân cách hàng nghìn", () => {
    expect(formatVnd(1250000)).toBe("1.250.000 ₫");
    expect(formatVnd(0)).toBe("0 ₫");
    expect(formatNumber(-35000)).toBe("-35.000");
  });
});

describe("formatQty", () => {
  test("gram và cái", () => {
    expect(formatQty(1200, "g")).toBe("1.200g");
    expect(formatQty(3, "piece")).toBe("3 cái");
  });
});

describe("parseMoney", () => {
  test.each([
    ["1tr5", 1_500_000],
    ["1.5tr", 1_500_000],
    ["1,5tr", 1_500_000],
    ["2tr", 2_000_000],
    ["1tr25", 1_250_000],
    ["1tr250", 1_250_000],
    ["2 triệu", 2_000_000],
    ["350k", 350_000],
    ["1.5k", 1_500],
    ["1.250.000", 1_250_000],
    ["1,250,000", 1_250_000],
    ["250000", 250_000],
    [" 350K ", 350_000],
    ["120.000đ", 120_000],
  ])("%s → %d", (raw, expected) => {
    expect(parseMoney(raw)).toBe(expected);
  });

  test.each(["", "abc", "1,5", "1.5tr5", "-200k", "1..000"])("%s → null", (raw) => {
    expect(parseMoney(raw)).toBeNull();
  });
});
```

`tests/unit/dates.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { monthKey, todayVN } from "@/lib/domain/dates";

describe("todayVN", () => {
  test("dùng giờ Việt Nam (UTC+7)", () => {
    // 2026-10-21 18:30 UTC là 2026-10-22 01:30 ở Việt Nam
    expect(todayVN(new Date("2026-10-21T18:30:00Z"))).toBe("2026-10-22");
    expect(todayVN(new Date("2026-10-21T16:59:00Z"))).toBe("2026-10-21");
  });

  test("monthKey lấy YYYY-MM", () => {
    expect(monthKey("2026-10-22")).toBe("2026-10");
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `npm test`
Expected: FAIL, lỗi không tìm thấy module `@/lib/domain/money` và `@/lib/domain/dates`.

- [ ] **Step 3: Viết code**

`src/lib/domain/errors.ts`:
```ts
export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "INSUFFICIENT_STOCK"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

/** Lỗi nghiệp vụ có message tiếng Việt, hiển thị thẳng cho người dùng. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; fieldErrors?: Record<string, string> };
```

`src/lib/domain/money.ts`:
```ts
import type { Unit } from "@/lib/domain/models";

const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatVnd(value: number): string {
  return `${formatNumber(value)} ₫`;
}

export function formatQty(qty: number, unit: Unit): string {
  return unit === "g" ? `${formatNumber(qty)}g` : `${formatNumber(qty)} cái`;
}

/**
 * Đọc số tiền gõ tắt kiểu Việt Nam: "1tr5", "1.5tr", "350k", "1.250.000".
 * Trả null khi không đọc được, để form tự báo lỗi.
 */
export function parseMoney(raw: string): number | null {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/(₫|đ|vnd|vnđ)$/, "");
  if (!s) return null;

  const million = s.match(/^(\d+)(?:[.,](\d+))?(?:tr|triệu|m)(\d*)$/);
  if (million) {
    const [, whole, decimal, tail] = million;
    if (decimal && tail) return null;
    const fraction = decimal || tail || "0";
    return Math.round(Number(`${whole}.${fraction}`) * 1_000_000);
  }

  const thousand = s.match(/^(\d+)(?:[.,](\d+))?(?:k|nghìn|ngàn)$/);
  if (thousand) {
    const [, whole, decimal] = thousand;
    return Math.round(Number(`${whole}.${decimal ?? "0"}`) * 1_000);
  }

  if (/^\d+$/.test(s) || /^\d{1,3}(\.\d{3})+$/.test(s) || /^\d{1,3}(,\d{3})+$/.test(s)) {
    return Number(s.replace(/[.,]/g, ""));
  }

  return null;
}
```

`src/lib/domain/dates.ts`:
```ts
const vnDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function todayVN(now: Date = new Date()): string {
  return vnDate.format(now);
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

/** "2026-10-22" → "22/10/2026" */
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}
```

`src/lib/domain/ids.ts`:
```ts
/** ID chứng từ do client sinh trước khi gửi, để gửi lại không bị ghi hai lần. */
export function newId(): string {
  return crypto.randomUUID().replaceAll("-", "");
}
```

`money.ts` import kiểu `Unit` từ `models.ts`, nên tạo luôn `src/lib/domain/models.ts` tối thiểu (Task 4 sẽ bổ sung đầy đủ):
```ts
export const UNITS = ["g", "piece"] as const;
export type Unit = (typeof UNITS)[number];
```

- [ ] **Step 4: Chạy test để thấy thành công**

Run: `npm test`
Expected: PASS hết các test trong `money.test.ts` và `dates.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): money parsing/formatting, VN dates, ids, app errors"
```

---

### Task 3: Domain — giá vốn, tồn kho, chế biến

**Files:**
- Create: `src/lib/domain/costing.ts`, `src/lib/domain/stock.ts`, `src/lib/domain/production.ts`
- Test: `tests/unit/costing.test.ts`, `tests/unit/stock.test.ts`, `tests/unit/production.test.ts`

- [ ] **Step 1: Viết test thất bại**

`tests/unit/costing.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { allocateCost, cleaningLoss, unitCostOf } from "@/lib/domain/costing";

describe("allocateCost", () => {
  test("chia theo trọng số", () => {
    expect(allocateCost(30_000_000, [700, 100])).toEqual([26_250_000, 3_750_000]);
  });

  test("phần lẻ cộng vào phần tử cuối, tổng luôn bằng đầu vào", () => {
    expect(allocateCost(100, [1, 1, 1])).toEqual([33, 33, 34]);
    const shares = allocateCost(1_000_001, [3, 7, 11]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1_000_001);
  });

  test("số lớn không mất chính xác", () => {
    const shares = allocateCost(90_000_000_000, [999_999, 1]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(90_000_000_000);
    expect(shares[1]).toBe(90_000);
  });

  test("giá vốn 0 thì mọi phần đều 0", () => {
    expect(allocateCost(0, [5, 5])).toEqual([0, 0]);
  });

  test("từ chối trọng số không hợp lệ", () => {
    expect(() => allocateCost(100, [])).toThrow();
    expect(() => allocateCost(100, [0, 1])).toThrow();
    expect(() => allocateCost(100, [1.5])).toThrow();
  });
});

describe("unitCostOf", () => {
  test("làm tròn", () => {
    expect(unitCostOf(1000, 3)).toBe(333);
    expect(unitCostOf(1000, 0)).toBe(0);
  });
});

describe("cleaningLoss", () => {
  test("tính hao hụt", () => {
    expect(cleaningLoss(1000, 800)).toEqual({ lossQty: 200, lossRate: 0.2 });
    expect(cleaningLoss(0, 0)).toEqual({ lossQty: 0, lossRate: 0 });
  });
});
```

`tests/unit/stock.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { InsufficientStockError, reverseStockIn, stockIn, stockOut } from "@/lib/domain/stock";

describe("stockIn", () => {
  test("kho trống: giá vốn bằng giá nhập", () => {
    expect(stockIn({ stockQty: 0, avgCost: 0 }, 1000, 30_000_000)).toEqual({ stockQty: 1000, avgCost: 30_000 });
  });

  test("bình quân gia quyền", () => {
    expect(stockIn({ stockQty: 1000, avgCost: 30_000 }, 500, 18_000_000)).toEqual({ stockQty: 1500, avgCost: 32_000 });
  });

  test("thu hoạch giá vốn 0 kéo bình quân xuống", () => {
    expect(stockIn({ stockQty: 1500, avgCost: 32_000 }, 500, 0)).toEqual({ stockQty: 2000, avgCost: 24_000 });
  });

  test("từ chối số lượng không dương", () => {
    expect(() => stockIn({ stockQty: 0, avgCost: 0 }, 0, 0)).toThrow();
  });
});

describe("stockOut", () => {
  test("xuất theo giá vốn bình quân, không đổi bình quân", () => {
    expect(stockOut({ stockQty: 1000, avgCost: 30_000 }, 200)).toEqual({
      state: { stockQty: 800, avgCost: 30_000 },
      totalCost: 6_000_000,
    });
  });

  test("xuất hết thì giữ giá vốn cũ", () => {
    expect(stockOut({ stockQty: 10, avgCost: 5 }, 10).state).toEqual({ stockQty: 0, avgCost: 5 });
  });

  test("không đủ tồn thì ném InsufficientStockError", () => {
    try {
      stockOut({ stockQty: 120, avgCost: 1 }, 200);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InsufficientStockError);
      expect(error).toMatchObject({ available: 120, requested: 200 });
    }
  });
});

describe("reverseStockIn", () => {
  test("đảo ngược một lần nhập", () => {
    expect(reverseStockIn({ stockQty: 1500, avgCost: 32_000 }, 500, 18_000_000)).toEqual({ stockQty: 1000, avgCost: 30_000 });
  });

  test("đảo hết thì giữ giá vốn cũ", () => {
    expect(reverseStockIn({ stockQty: 500, avgCost: 36_000 }, 500, 18_000_000)).toEqual({ stockQty: 0, avgCost: 36_000 });
  });

  test("giá vốn không âm", () => {
    expect(reverseStockIn({ stockQty: 100, avgCost: 10 }, 50, 5_000).avgCost).toBe(0);
  });

  test("không đủ tồn để đảo thì ném lỗi", () => {
    expect(() => reverseStockIn({ stockQty: 100, avgCost: 1 }, 200, 0)).toThrow(InsufficientStockError);
  });
});
```

`tests/unit/production.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { computeProduction } from "@/lib/domain/production";

describe("computeProduction", () => {
  test("làm sạch: chia giá vốn theo gram và tính hao hụt", () => {
    const result = computeProduction(
      "clean",
      [{ qty: 1000, totalCost: 30_000_000, unit: "g" }],
      [
        { qty: 700, unit: "g", gramPerUnit: 1 },
        { qty: 100, unit: "g", gramPerUnit: 1 },
      ],
    );
    expect(result).toEqual({
      totalInputCost: 30_000_000,
      outputCosts: [26_250_000, 3_750_000],
      unitCosts: [37_500, 37_500],
      lossQty: 200,
      lossRate: 0.2,
    });
  });

  test("chưng: đầu ra tính bằng cái, trọng số theo gramPerUnit", () => {
    const result = computeProduction(
      "steam",
      [
        { qty: 100, totalCost: 3_750_000, unit: "g" },
        { qty: 10, totalCost: 20_000, unit: "piece" },
        { qty: 10, totalCost: 50_000, unit: "piece" },
      ],
      [{ qty: 10, unit: "piece", gramPerUnit: 10 }],
    );
    expect(result.totalInputCost).toBe(3_820_000);
    expect(result.outputCosts).toEqual([3_820_000]);
    expect(result.unitCosts).toEqual([382_000]);
    expect(result.lossQty).toBe(0);
  });

  test("đóng hộp nhiều loại: gramPerUnit chỉ áp cho đơn vị cái", () => {
    const result = computeProduction(
      "pack",
      [{ qty: 4, totalCost: 1_000, unit: "piece" }],
      [
        { qty: 2, unit: "piece", gramPerUnit: 30 },
        { qty: 1, unit: "piece", gramPerUnit: 60 },
      ],
    );
    expect(result.outputCosts).toEqual([500, 500]);
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `npm test`
Expected: FAIL, lỗi không tìm thấy các module `costing`, `stock`, `production`.

- [ ] **Step 3: Viết code**

`src/lib/domain/costing.ts`:
```ts
/**
 * Chia tổng giá vốn theo trọng số (số nguyên dương). Phần lẻ do làm tròn
 * xuống cộng vào phần tử cuối, nên tổng các phần luôn bằng `totalCost`.
 * Dùng BigInt vì totalCost × trọng số có thể vượt 2^53.
 */
export function allocateCost(totalCost: number, weights: number[]): number[] {
  if (weights.length === 0) throw new Error("Cần ít nhất một đầu ra");
  if (weights.some((w) => !Number.isInteger(w) || w <= 0)) {
    throw new Error("Trọng số phải là số nguyên dương");
  }
  const total = BigInt(totalCost);
  const sum = weights.reduce((acc, w) => acc + BigInt(w), 0n);
  const shares = weights.map((w) => Number((total * BigInt(w)) / sum));
  const allocated = shares.reduce((acc, s) => acc + s, 0);
  shares[shares.length - 1] += totalCost - allocated;
  return shares;
}

export function unitCostOf(totalCost: number, qty: number): number {
  return qty > 0 ? Math.round(totalCost / qty) : 0;
}

export function cleaningLoss(inputGrams: number, outputGrams: number) {
  const lossQty = inputGrams - outputGrams;
  return { lossQty, lossRate: inputGrams > 0 ? lossQty / inputGrams : 0 };
}
```

`src/lib/domain/stock.ts`:
```ts
export interface StockState {
  stockQty: number;
  avgCost: number;
}

export class InsufficientStockError extends Error {
  constructor(
    readonly available: number,
    readonly requested: number,
  ) {
    super(`Không đủ tồn kho: còn ${available}, cần ${requested}`);
    this.name = "InsufficientStockError";
  }
}

/** Nhập `qty` đơn vị với tổng giá vốn `totalCost`; tính lại bình quân gia quyền. */
export function stockIn(state: StockState, qty: number, totalCost: number): StockState {
  if (qty <= 0) throw new Error("Số lượng nhập phải lớn hơn 0");
  const stockQty = state.stockQty + qty;
  return {
    stockQty,
    avgCost: Math.round((state.stockQty * state.avgCost + totalCost) / stockQty),
  };
}

/** Xuất theo giá vốn bình quân hiện tại. Bình quân không đổi. */
export function stockOut(state: StockState, qty: number): { state: StockState; totalCost: number } {
  if (qty <= 0) throw new Error("Số lượng xuất phải lớn hơn 0");
  if (qty > state.stockQty) throw new InsufficientStockError(state.stockQty, qty);
  return {
    state: { stockQty: state.stockQty - qty, avgCost: state.avgCost },
    totalCost: qty * state.avgCost,
  };
}

/** Đảo một lần nhập (khi hủy chứng từ), dùng đúng tổng giá vốn đã nhập. */
export function reverseStockIn(state: StockState, qty: number, totalCost: number): StockState {
  if (qty <= 0) throw new Error("Số lượng phải lớn hơn 0");
  if (qty > state.stockQty) throw new InsufficientStockError(state.stockQty, qty);
  const stockQty = state.stockQty - qty;
  if (stockQty === 0) return { stockQty, avgCost: state.avgCost };
  return {
    stockQty,
    avgCost: Math.max(0, Math.round((state.stockQty * state.avgCost - totalCost) / stockQty)),
  };
}
```

`src/lib/domain/production.ts`:
```ts
import { allocateCost, cleaningLoss, unitCostOf } from "@/lib/domain/costing";
import type { ProductionKind, Unit } from "@/lib/domain/models";

export interface ProductionInputCalc {
  qty: number;
  totalCost: number;
  unit: Unit;
}

export interface ProductionOutputCalc {
  qty: number;
  unit: Unit;
  /** Số gram yến trong một đơn vị; với đơn vị gram luôn coi là 1. */
  gramPerUnit: number;
}

export interface ProductionResult {
  totalInputCost: number;
  outputCosts: number[];
  unitCosts: number[];
  lossQty: number;
  lossRate: number;
}

/** Dùng chung cho server (ghi chứng từ) và client (xem trước trên form). */
export function computeProduction(
  kind: ProductionKind,
  inputs: ProductionInputCalc[],
  outputs: ProductionOutputCalc[],
): ProductionResult {
  const totalInputCost = inputs.reduce((sum, i) => sum + i.totalCost, 0);
  const weights = outputs.map((o) => o.qty * (o.unit === "g" ? 1 : o.gramPerUnit));
  const outputCosts = allocateCost(totalInputCost, weights);
  const unitCosts = outputCosts.map((cost, i) => unitCostOf(cost, outputs[i].qty));

  let lossQty = 0;
  let lossRate = 0;
  if (kind === "clean") {
    const inGrams = inputs.filter((i) => i.unit === "g").reduce((s, i) => s + i.qty, 0);
    const outGrams = outputs.filter((o) => o.unit === "g").reduce((s, o) => s + o.qty, 0);
    ({ lossQty, lossRate } = cleaningLoss(inGrams, outGrams));
  }

  return { totalInputCost, outputCosts, unitCosts, lossQty, lossRate };
}
```

Thêm `ProductionKind` vào `src/lib/domain/models.ts` (nối vào cuối file):
```ts
export const PRODUCTION_KINDS = ["clean", "steam", "pack"] as const;
export type ProductionKind = (typeof PRODUCTION_KINDS)[number];
```

- [ ] **Step 4: Chạy test để thấy thành công**

Run: `npm test`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): weighted average cost, stock in/out, production costing"
```

---

### Task 4: Domain — models và schemas

**Files:**
- Modify: `src/lib/domain/models.ts` (viết lại toàn bộ)
- Create: `src/lib/domain/schemas.ts`
- Test: `tests/unit/schemas.test.ts`

- [ ] **Step 1: Viết test thất bại**

`tests/unit/schemas.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { adjustmentInput, inviteInput, productInput, productionInput, receiptInput } from "@/lib/domain/schemas";

const ID = "abcdef0123456789";

describe("productInput", () => {
  test("hợp lệ và tự trim tên", () => {
    const p = productInput.parse({
      id: ID, name: "  Yến thô  ", kind: "raw", unit: "g",
      suggestedPrice: 35_000, lowStockThreshold: 100, taxGroup: "self_raw",
    });
    expect(p.name).toBe("Yến thô");
  });

  test("từ chối tên trống và giá âm", () => {
    const r = productInput.safeParse({
      id: ID, name: " ", kind: "raw", unit: "g", suggestedPrice: -1, lowStockThreshold: 0, taxGroup: "self_raw",
    });
    expect(r.success).toBe(false);
  });
});

describe("receiptInput", () => {
  test("note và supplierId có giá trị mặc định", () => {
    const r = receiptInput.parse({
      id: ID, kind: "harvest", date: "2026-10-22", lines: [{ productId: ID, qty: 500, totalCost: 0 }],
    });
    expect(r).toMatchObject({ note: "", supplierId: null });
  });

  test("cần ít nhất một dòng, số lượng nguyên dương, ngày đúng định dạng", () => {
    expect(receiptInput.safeParse({ id: ID, kind: "harvest", date: "2026-10-22", lines: [] }).success).toBe(false);
    expect(
      receiptInput.safeParse({ id: ID, kind: "harvest", date: "2026-10-22", lines: [{ productId: ID, qty: 1.5, totalCost: 0 }] }).success,
    ).toBe(false);
    expect(
      receiptInput.safeParse({ id: ID, kind: "harvest", date: "22/10/2026", lines: [{ productId: ID, qty: 1, totalCost: 0 }] }).success,
    ).toBe(false);
  });
});

describe("productionInput", () => {
  test("hợp lệ", () => {
    expect(
      productionInput.safeParse({
        id: ID, kind: "clean", date: "2026-10-22",
        inputs: [{ productId: ID, qty: 1000 }],
        outputs: [{ productId: "zzzzzz0123456789", qty: 800, gramPerUnit: 1 }],
      }).success,
    ).toBe(true);
  });
});

describe("adjustmentInput", () => {
  test("bắt buộc lý do, qtyDelta khác 0", () => {
    expect(adjustmentInput.safeParse({ id: ID, date: "2026-10-22", reason: "", lines: [{ productId: ID, qtyDelta: -5 }] }).success).toBe(false);
    expect(adjustmentInput.safeParse({ id: ID, date: "2026-10-22", reason: "Kiểm kho", lines: [{ productId: ID, qtyDelta: 0 }] }).success).toBe(false);
    expect(adjustmentInput.safeParse({ id: ID, date: "2026-10-22", reason: "Kiểm kho", lines: [{ productId: ID, qtyDelta: -5 }] }).success).toBe(true);
  });
});

describe("inviteInput", () => {
  test("chuẩn hóa email về chữ thường", () => {
    expect(inviteInput.parse({ email: " Lan@Gmail.com " }).email).toBe("lan@gmail.com");
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `npm test -- tests/unit/schemas.test.ts`
Expected: FAIL, lỗi không tìm thấy module `@/lib/domain/schemas`.

- [ ] **Step 3: Viết code**

`src/lib/domain/models.ts` (thay toàn bộ nội dung):
```ts
export const UNITS = ["g", "piece"] as const;
export type Unit = (typeof UNITS)[number];

export const PRODUCT_KINDS = ["raw", "clean", "steamed", "combo", "supply"] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export const TAX_GROUPS = ["self_raw", "resale", "processed"] as const;
export type TaxGroup = (typeof TAX_GROUPS)[number];

export const RECEIPT_KINDS = ["harvest", "purchase"] as const;
export type ReceiptKind = (typeof RECEIPT_KINDS)[number];

export const PRODUCTION_KINDS = ["clean", "steam", "pack"] as const;
export type ProductionKind = (typeof PRODUCTION_KINDS)[number];

export type DocStatus = "active" | "voided";

export interface Product {
  id: string;
  name: string;
  kind: ProductKind;
  unit: Unit;
  suggestedPrice: number;
  lowStockThreshold: number;
  taxGroup: TaxGroup;
  stockQty: number;
  avgCost: number;
  archived: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  note?: string;
}

export interface CostLine {
  productId: string;
  qty: number;
  totalCost: number;
}

export interface ProductionOutputLine extends CostLine {
  gramPerUnit: number;
  unitCost: number;
}

export interface AdjustmentLine {
  productId: string;
  qtyDelta: number;
  costDelta: number;
}

interface DocBase {
  id: string;
  date: string;
  status: DocStatus;
  createdBy: string;
  voidReason?: string;
}

export interface ReceiptDoc extends DocBase {
  kind: ReceiptKind;
  supplierId: string | null;
  note: string;
  lines: CostLine[];
  total: number;
}

export interface ProductionDoc extends DocBase {
  kind: ProductionKind;
  note: string;
  inputs: CostLine[];
  outputs: ProductionOutputLine[];
  totalCost: number;
  lossQty: number;
  lossRate: number;
}

export interface AdjustmentDoc extends DocBase {
  reason: string;
  lines: AdjustmentLine[];
}

export interface Member {
  id: string;
  email: string;
  displayName: string;
}

export interface Invite {
  id: string;
  email: string;
}

/** Loại sản phẩm nhập được bằng mỗi loại phiếu nhập. */
export const RECEIPT_ALLOWED_KINDS: Record<ReceiptKind, ProductKind[]> = {
  harvest: ["raw"],
  purchase: ["raw", "supply"],
};

/** Loại sản phẩm dùng làm đầu vào cho mỗi kiểu chế biến. */
export const PRODUCTION_INPUT_KINDS: Record<ProductionKind, ProductKind[]> = {
  clean: ["raw"],
  steam: ["clean", "supply"],
  pack: ["raw", "clean", "steamed", "supply"],
};

/** Loại sản phẩm đầu ra của mỗi kiểu chế biến. */
export const PRODUCTION_OUTPUT_KIND: Record<ProductionKind, ProductKind> = {
  clean: "clean",
  steam: "steamed",
  pack: "combo",
};

export const DEFAULT_UNIT: Record<ProductKind, Unit> = {
  raw: "g",
  clean: "g",
  steamed: "piece",
  combo: "piece",
  supply: "piece",
};

export const DEFAULT_TAX_GROUP: Record<ProductKind, TaxGroup> = {
  raw: "self_raw",
  clean: "processed",
  steamed: "processed",
  combo: "processed",
  supply: "processed",
};

export const PRODUCT_KIND_LABEL: Record<ProductKind, string> = {
  raw: "Yến thô",
  clean: "Yến tinh chế",
  steamed: "Yến chưng",
  combo: "Hộp quà / combo",
  supply: "Vật tư",
};

export const UNIT_LABEL: Record<Unit, string> = { g: "gram", piece: "cái" };

export const TAX_GROUP_LABEL: Record<TaxGroup, string> = {
  self_raw: "Tự nuôi, bán thô",
  resale: "Mua về bán lại",
  processed: "Chế biến",
};

export const RECEIPT_KIND_LABEL: Record<ReceiptKind, string> = {
  harvest: "Thu hoạch nhà yến",
  purchase: "Mua hàng",
};

export const PRODUCTION_KIND_LABEL: Record<ProductionKind, string> = {
  clean: "Làm sạch",
  steam: "Chưng",
  pack: "Đóng hộp / combo",
};
```

`src/lib/domain/schemas.ts`:
```ts
import { z } from "zod";
import { PRODUCT_KINDS, PRODUCTION_KINDS, RECEIPT_KINDS, TAX_GROUPS, UNITS } from "@/lib/domain/models";

const id = z.string().regex(/^[A-Za-z0-9_-]{10,40}$/, "Mã không hợp lệ");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ");
const qty = z
  .number("Nhập số lượng")
  .int("Số lượng phải là số nguyên")
  .positive("Số lượng phải lớn hơn 0")
  .max(100_000_000, "Số lượng quá lớn");
const money = z
  .number("Nhập số tiền")
  .int("Số tiền phải là số nguyên")
  .min(0, "Số tiền không được âm")
  .max(100_000_000_000, "Số tiền quá lớn");
const note = z.string().trim().max(500, "Ghi chú tối đa 500 ký tự").default("");

export const productInput = z.object({
  id,
  name: z.string().trim().min(1, "Nhập tên sản phẩm").max(100, "Tên tối đa 100 ký tự"),
  kind: z.enum(PRODUCT_KINDS),
  unit: z.enum(UNITS),
  suggestedPrice: money,
  lowStockThreshold: z.number().int().min(0, "Không được âm"),
  taxGroup: z.enum(TAX_GROUPS),
});

export const productUpdateInput = productInput
  .pick({ id: true, name: true, suggestedPrice: true, lowStockThreshold: true, taxGroup: true })
  .extend({ archived: z.boolean() });

export const receiptInput = z.object({
  id,
  kind: z.enum(RECEIPT_KINDS),
  date,
  supplierId: id.nullable().default(null),
  note,
  lines: z.array(z.object({ productId: id, qty, totalCost: money })).min(1, "Thêm ít nhất một dòng"),
});

export const productionInput = z.object({
  id,
  kind: z.enum(PRODUCTION_KINDS),
  date,
  note,
  inputs: z.array(z.object({ productId: id, qty })).min(1, "Thêm ít nhất một nguyên liệu"),
  outputs: z
    .array(
      z.object({
        productId: id,
        qty,
        gramPerUnit: z.number().int("Phải là số nguyên").positive("Phải lớn hơn 0").max(100_000),
      }),
    )
    .min(1, "Thêm ít nhất một thành phẩm"),
});

export const adjustmentInput = z.object({
  id,
  date,
  reason: z.string().trim().min(1, "Nhập lý do điều chỉnh").max(500),
  lines: z
    .array(
      z.object({
        productId: id,
        qtyDelta: z
          .number("Nhập số lượng")
          .int("Số lượng phải là số nguyên")
          .refine((n) => n !== 0, "Số lượng điều chỉnh phải khác 0"),
      }),
    )
    .min(1, "Thêm ít nhất một dòng"),
});

export const voidInput = z.object({
  id,
  reason: z.string().trim().min(1, "Nhập lý do hủy").max(500),
});

export const shopNameInput = z.object({
  name: z.string().trim().min(1, "Nhập tên cửa hàng").max(100),
});

export const inviteInput = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Email không hợp lệ")),
});

export const removeMemberInput = z.object({ uid: z.string().min(1).max(128) });
```

- [ ] **Step 4: Chạy test để thấy thành công**

Run: `npm test && npm run typecheck`
Expected: PASS toàn bộ, typecheck không lỗi.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): product/document models and zod input schemas"
```

---

### Task 5: Server core — firebase-admin, runAction, xác thực, session

**Files:**
- Create: `src/server/firebase-admin.ts`, `src/server/actor.ts`, `src/server/run-action.ts`, `src/server/auth.ts`, `src/app/api/session/route.ts`
- Test: `tests/unit/run-action.test.ts`

`src/server/auth.ts` gọi `assertMember` từ `membership.ts` (Task 6), nên viết file này ở Step 5 sau khi đã có stub.

- [ ] **Step 1: Viết test thất bại cho runAction**

`tests/unit/run-action.test.ts`:
```ts
import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { AppError } from "@/lib/domain/errors";
import { runAction } from "@/server/run-action";

describe("runAction", () => {
  test("bọc kết quả thành công", async () => {
    expect(await runAction(async () => 42)).toEqual({ ok: true, data: 42 });
  });

  test("AppError giữ nguyên code và message", async () => {
    const r = await runAction(async () => {
      throw new AppError("INSUFFICIENT_STOCK", "Không đủ hàng");
    });
    expect(r).toEqual({ ok: false, code: "INSUFFICIENT_STOCK", message: "Không đủ hàng" });
  });

  test("ZodError thành VALIDATION kèm fieldErrors theo đường dẫn", async () => {
    const schema = z.object({ lines: z.array(z.object({ qty: z.number().positive("Phải > 0") })) });
    const r = await runAction(async () => schema.parse({ lines: [{ qty: -1 }] }));
    expect(r).toEqual({
      ok: false,
      code: "VALIDATION",
      message: "Phải > 0",
      fieldErrors: { "lines.0.qty": "Phải > 0" },
    });
  });

  test("lỗi lạ thành INTERNAL, không lộ chi tiết", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await runAction(async () => {
      throw new Error("db password wrong");
    });
    expect(r).toEqual({ ok: false, code: "INTERNAL", message: "Có lỗi xảy ra, vui lòng thử lại." });
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `npm test -- tests/unit/run-action.test.ts`
Expected: FAIL, lỗi không tìm thấy module `@/server/run-action`.

- [ ] **Step 3: Viết runAction, actor và firebase-admin**

`src/server/run-action.ts`:
```ts
import { ZodError } from "zod";
import { AppError, type ActionResult } from "@/lib/domain/errors";

/** Chuyển mọi lỗi thành ActionResult để client hiển thị thống nhất. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, code: error.code, message: error.message };
    }
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) {
        fieldErrors[issue.path.join(".")] ??= issue.message;
      }
      return {
        ok: false,
        code: "VALIDATION",
        message: error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        fieldErrors,
      };
    }
    console.error(error);
    return { ok: false, code: "INTERNAL", message: "Có lỗi xảy ra, vui lòng thử lại." };
  }
}
```

`src/server/actor.ts`:
```ts
/** Người dùng đã xác thực, lấy từ session cookie. */
export interface Actor {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}
```

`src/server/firebase-admin.ts`:
```ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Với Emulator (FIRESTORE_EMULATOR_HOST có giá trị) admin SDK không cần
 * credential. Production đọc service account JSON từ FIREBASE_SERVICE_ACCOUNT.
 * Không import file này từ code client.
 */
function ensureApp() {
  if (getApps().length) return;
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({
      projectId:
        process.env.GCLOUD_PROJECT ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-so-yen",
    });
    return;
  }
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
  initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
}

export function getAdminDb() {
  ensureApp();
  return getFirestore();
}

export function getAdminAuth() {
  ensureApp();
  return getAuth();
}
```

- [ ] **Step 4: Chạy test để thấy thành công**

Run: `npm test -- tests/unit/run-action.test.ts`
Expected: PASS.

- [ ] **Step 5: Viết stub membership, auth và route session**

Tạo `src/server/services/membership.ts` với hai hàm đầu tiên (Task 6 bổ sung phần còn lại):
```ts
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
```

`src/server/auth.ts`:
```ts
import { cookies } from "next/headers";
import { AppError } from "@/lib/domain/errors";
import type { Actor } from "@/server/actor";
import { getAdminAuth, getAdminDb } from "@/server/firebase-admin";
import { assertMember } from "@/server/services/membership";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 14;

const expired = () => new AppError("UNAUTHORIZED", "Phiên đăng nhập đã hết, vui lòng đăng nhập lại.");

export async function requireUser(): Promise<Actor> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  if (!value) throw expired();
  try {
    const decoded = await getAdminAuth().verifySessionCookie(value);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
      name: typeof decoded.name === "string" ? decoded.name : null,
    };
  } catch {
    throw expired();
  }
}

export async function requireMember(shopId: string): Promise<Actor> {
  const actor = await requireUser();
  await assertMember(getAdminDb(), shopId, actor.uid);
  return actor;
}
```

`src/app/api/session/route.ts`:
```ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/server/auth";
import { getAdminAuth } from "@/server/firebase-admin";

/** Đổi Firebase ID token lấy session cookie httpOnly để Server Actions xác thực. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { idToken?: unknown } | null;
  if (typeof body?.idToken !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    const auth = getAdminAuth();
    await auth.verifyIdToken(body.idToken);
    const cookie = await auth.createSessionCookie(body.idToken, {
      expiresIn: SESSION_MAX_AGE_SEC * 1000,
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEC,
    });
    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
```

Run: `npm run typecheck`
Expected: không lỗi.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(server): firebase-admin init, runAction, session cookie auth"
```

---

### Task 6: Test harness Emulator và service cửa hàng/thành viên

**Files:**
- Modify: `src/server/services/membership.ts`
- Create: `tests/integration/helpers.ts`
- Test: `tests/integration/membership.test.ts`

- [ ] **Step 1: Viết helpers cho test tích hợp**

`tests/integration/helpers.ts`:
```ts
import type { Firestore } from "firebase-admin/firestore";
import type { Product } from "@/lib/domain/models";
import type { Actor } from "@/server/actor";
import { getAdminDb } from "@/server/firebase-admin";

export const PROJECT_ID = "demo-so-yen";
export const SHOP_ID = "shop_test_01";

export const owner: Actor = { uid: "u_owner", email: "chu@example.com", emailVerified: true, name: "Chủ" };
export const sister: Actor = { uid: "u_sister", email: "em@example.com", emailVerified: true, name: "Em" };
export const stranger: Actor = { uid: "u_stranger", email: "la@example.com", emailVerified: true, name: "Lạ" };

/** ID sản phẩm dùng trong test, đủ 10–40 ký tự theo schema. */
export const P = {
  raw: "prod_raw_0001",
  raw2: "prod_raw_0002",
  clean: "prod_clean_001",
  vun: "prod_vun_00001",
  sugar: "prod_sugar_001",
  jar: "prod_jar_00001",
  steamed: "prod_steam_001",
  box: "prod_box_00001",
  combo: "prod_combo_001",
} as const;

export function db(): Firestore {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("Chạy test tích hợp bằng `npm run test:emulator`");
  }
  return getAdminDb();
}

export async function clearFirestore() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  await fetch(`http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
    method: "DELETE",
  });
}

export async function seedShop(memberUids: string[] = [owner.uid]) {
  await db().collection("shops").doc(SHOP_ID).set({
    name: "Yến Test",
    ownerUid: owner.uid,
    memberUids,
    counters: { sale: 0 },
  });
}

const productDefaults: Omit<Product, "id"> = {
  name: "SP",
  kind: "raw",
  unit: "g",
  suggestedPrice: 0,
  lowStockThreshold: 0,
  taxGroup: "self_raw",
  stockQty: 0,
  avgCost: 0,
  archived: false,
};

export async function seedProduct(id: string, overrides: Partial<Omit<Product, "id">> = {}) {
  await db().collection("shops").doc(SHOP_ID).collection("products").doc(id).set({ ...productDefaults, ...overrides });
}

export async function getProduct(id: string): Promise<Product> {
  const snap = await db().collection("shops").doc(SHOP_ID).collection("products").doc(id).get();
  return { id: snap.id, ...(snap.data() as Omit<Product, "id">) };
}

export async function listMovements(sourceId: string) {
  const snap = await db()
    .collection("shops")
    .doc(SHOP_ID)
    .collection("movements")
    .where("sourceId", "==", sourceId)
    .get();
  return snap.docs.map((d) => d.data()).sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
}
```

- [ ] **Step 2: Viết test thất bại**

`tests/integration/membership.test.ts`:
```ts
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
```

- [ ] **Step 3: Chạy test để thấy thất bại**

Run: `npm run test:emulator`
Expected: FAIL, lỗi `createShop` (và các hàm khác) không được export từ `membership.ts`.

- [ ] **Step 4: Viết code**

`src/server/services/membership.ts` (thay toàn bộ):
```ts
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";
import { inviteInput, removeMemberInput, shopNameInput } from "@/lib/domain/schemas";
import type { Actor } from "@/server/actor";

export interface MyShop {
  id: string;
  name: string;
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
    return { id: doc.id, name: doc.get("name") as string };
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
    return { id: shop.id, name: shopSnap.get("name") as string };
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
  return { id: ref.id, name };
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
```

- [ ] **Step 5: Chạy test để thấy thành công**

Run: `npm run test:emulator`
Expected: PASS toàn bộ `membership.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(server): shop creation, invites and membership checks"
```

---

### Task 7: Service sản phẩm

**Files:**
- Create: `src/server/services/products.ts`
- Test: `tests/integration/products.test.ts`

- [ ] **Step 1: Viết test thất bại**

`tests/integration/products.test.ts`:
```ts
import { beforeEach, describe, expect, test } from "vitest";
import { createProduct, updateProduct } from "@/server/services/products";
import { clearFirestore, db, getProduct, owner, P, seedShop, SHOP_ID } from "./helpers";

beforeEach(async () => {
  await clearFirestore();
  await seedShop();
});

const input = {
  id: P.raw, name: "Yến thô nhà", kind: "raw", unit: "g",
  suggestedPrice: 30_000, lowStockThreshold: 200, taxGroup: "self_raw",
};

describe("createProduct", () => {
  test("tồn và giá vốn bắt đầu từ 0", async () => {
    await createProduct(db(), SHOP_ID, owner, input);
    expect(await getProduct(P.raw)).toMatchObject({ name: "Yến thô nhà", stockQty: 0, avgCost: 0, archived: false });
  });

  test("gửi trùng ID không ghi đè", async () => {
    await createProduct(db(), SHOP_ID, owner, input);
    await createProduct(db(), SHOP_ID, owner, { ...input, name: "Tên khác" });
    expect((await getProduct(P.raw)).name).toBe("Yến thô nhà");
  });
});

describe("updateProduct", () => {
  test("sửa tên, giá và lưu trữ; không đổi tồn", async () => {
    await createProduct(db(), SHOP_ID, owner, input);
    await updateProduct(db(), SHOP_ID, {
      id: P.raw, name: "Yến thô A", suggestedPrice: 32_000, lowStockThreshold: 100, taxGroup: "self_raw", archived: true,
    });
    expect(await getProduct(P.raw)).toMatchObject({ name: "Yến thô A", suggestedPrice: 32_000, archived: true, stockQty: 0, kind: "raw" });
  });

  test("NOT_FOUND khi không có sản phẩm", async () => {
    await expect(
      updateProduct(db(), SHOP_ID, { id: P.clean, name: "x", suggestedPrice: 0, lowStockThreshold: 0, taxGroup: "processed", archived: false }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `npm run test:emulator`
Expected: FAIL, lỗi không tìm thấy module `@/server/services/products`.

- [ ] **Step 3: Viết code**

`src/server/services/products.ts`:
```ts
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";
import { productInput, productUpdateInput } from "@/lib/domain/schemas";
import type { Actor } from "@/server/actor";
import { shopRef } from "@/server/services/membership";

export async function createProduct(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const { id, ...fields } = productInput.parse(input);
  const ref = shopRef(db, shopId).collection("products").doc(id);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    tx.set(ref, {
      ...fields,
      stockQty: 0,
      avgCost: 0,
      archived: false,
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { id };
}

/** Loại và đơn vị không đổi được sau khi tạo, vì tồn kho đã tính theo đơn vị đó. */
export async function updateProduct(db: Firestore, shopId: string, input: unknown) {
  const { id, ...fields } = productUpdateInput.parse(input);
  const ref = shopRef(db, shopId).collection("products").doc(id);
  if (!(await ref.get()).exists) throw new AppError("NOT_FOUND", "Không tìm thấy sản phẩm.");
  await ref.update({ ...fields, updatedAt: FieldValue.serverTimestamp() });
  return { id };
}
```

- [ ] **Step 4: Chạy test để thấy thành công**

Run: `npm run test:emulator`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): product create/update service"
```

---

### Task 8: Hàm dùng chung cho kho và service phiếu nhập

**Files:**
- Create: `src/server/services/inventory.ts`, `src/server/services/receipts.ts`
- Test: `tests/integration/receipts.test.ts`

- [ ] **Step 1: Viết test thất bại**

`tests/integration/receipts.test.ts`:
```ts
import { beforeEach, describe, expect, test } from "vitest";
import { createReceipt, voidReceipt } from "@/server/services/receipts";
import { clearFirestore, db, getProduct, listMovements, owner, P, seedProduct, seedShop, SHOP_ID } from "./helpers";

const R1 = "rcpt_00000001";
const R2 = "rcpt_00000002";
const R3 = "rcpt_00000003";
const SUPPLIER = "supp_00000001";

beforeEach(async () => {
  await clearFirestore();
  await seedShop();
  await seedProduct(P.raw, { name: "Yến thô" });
  await seedProduct(P.sugar, { name: "Đường phèn", kind: "supply", unit: "piece" });
  await seedProduct(P.clean, { name: "Yến tinh", kind: "clean" });
  await db().collection("shops").doc(SHOP_ID).collection("suppliers").doc(SUPPLIER).set({ name: "Anh Ba" });
});

const purchase = (id: string, qty: number, totalCost: number) => ({
  id, kind: "purchase", date: "2026-10-22", supplierId: SUPPLIER,
  lines: [{ productId: P.raw, qty, totalCost }],
});

describe("createReceipt", () => {
  test("mua hàng: tính bình quân gia quyền, ghi chứng từ và movements", async () => {
    await createReceipt(db(), SHOP_ID, owner, purchase(R1, 1000, 30_000_000));
    await createReceipt(db(), SHOP_ID, owner, purchase(R2, 500, 18_000_000));
    expect(await getProduct(P.raw)).toMatchObject({ stockQty: 1500, avgCost: 32_000 });

    const doc = await db().collection("shops").doc(SHOP_ID).collection("receipts").doc(R2).get();
    expect(doc.data()).toMatchObject({ kind: "purchase", total: 18_000_000, status: "active", createdBy: owner.uid });
    expect(await listMovements(R2)).toEqual([
      expect.objectContaining({ productId: P.raw, qtyDelta: 500, costDelta: 18_000_000, sourceType: "receipt" }),
    ]);
  });

  test("thu hoạch: giá vốn luôn 0 dù client gửi số khác", async () => {
    await createReceipt(db(), SHOP_ID, owner, purchase(R1, 1000, 30_000_000));
    await createReceipt(db(), SHOP_ID, owner, {
      id: R2, kind: "harvest", date: "2026-10-22", lines: [{ productId: P.raw, qty: 500, totalCost: 999 }],
    });
    expect(await getProduct(P.raw)).toMatchObject({ stockQty: 1500, avgCost: 20_000 });
    const doc = await db().collection("shops").doc(SHOP_ID).collection("receipts").doc(R2).get();
    expect(doc.get("supplierId")).toBeNull();
  });

  test("gửi trùng ID không nhập hai lần", async () => {
    await createReceipt(db(), SHOP_ID, owner, purchase(R1, 1000, 30_000_000));
    await createReceipt(db(), SHOP_ID, owner, purchase(R1, 1000, 30_000_000));
    expect((await getProduct(P.raw)).stockQty).toBe(1000);
  });

  test("chặn loại sản phẩm không hợp lệ", async () => {
    await expect(
      createReceipt(db(), SHOP_ID, owner, {
        id: R1, kind: "harvest", date: "2026-10-22", lines: [{ productId: P.sugar, qty: 1, totalCost: 0 }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createReceipt(db(), SHOP_ID, owner, {
        id: R1, kind: "purchase", date: "2026-10-22", lines: [{ productId: P.clean, qty: 1, totalCost: 0 }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  test("chặn sản phẩm đã lưu trữ, nhà cung cấp không tồn tại", async () => {
    await seedProduct(P.raw2, { name: "Cũ", archived: true });
    await expect(
      createReceipt(db(), SHOP_ID, owner, {
        id: R1, kind: "harvest", date: "2026-10-22", lines: [{ productId: P.raw2, qty: 1, totalCost: 0 }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createReceipt(db(), SHOP_ID, owner, { ...purchase(R1, 1, 1), supplierId: "supp_missing01" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("voidReceipt", () => {
  test("hủy: trả lại kho và bình quân trước đó, ghi movements đảo", async () => {
    await createReceipt(db(), SHOP_ID, owner, purchase(R1, 1000, 30_000_000));
    await createReceipt(db(), SHOP_ID, owner, purchase(R2, 500, 18_000_000));
    await voidReceipt(db(), SHOP_ID, owner, { id: R2, reason: "Nhập nhầm" });

    expect(await getProduct(P.raw)).toMatchObject({ stockQty: 1000, avgCost: 30_000 });
    const doc = await db().collection("shops").doc(SHOP_ID).collection("receipts").doc(R2).get();
    expect(doc.data()).toMatchObject({ status: "voided", voidReason: "Nhập nhầm" });
    expect((await listMovements(R2)).map((m) => m.qtyDelta).sort()).toEqual([-500, 500]);
  });

  test("hủy hai lần không đảo hai lần", async () => {
    await createReceipt(db(), SHOP_ID, owner, purchase(R1, 1000, 30_000_000));
    await createReceipt(db(), SHOP_ID, owner, purchase(R2, 500, 18_000_000));
    await voidReceipt(db(), SHOP_ID, owner, { id: R2, reason: "x" });
    await voidReceipt(db(), SHOP_ID, owner, { id: R2, reason: "x" });
    expect((await getProduct(P.raw)).stockQty).toBe(1000);
  });

  test("không hủy được khi hàng đã dùng hết", async () => {
    await createReceipt(db(), SHOP_ID, owner, purchase(R3, 100, 3_000_000));
    await db().collection("shops").doc(SHOP_ID).collection("products").doc(P.raw).update({ stockQty: 40 });
    await expect(voidReceipt(db(), SHOP_ID, owner, { id: R3, reason: "x" })).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
    });
  });

  test("NOT_FOUND khi không có phiếu", async () => {
    await expect(voidReceipt(db(), SHOP_ID, owner, { id: R1, reason: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `npm run test:emulator`
Expected: FAIL, lỗi không tìm thấy module `@/server/services/receipts`.

- [ ] **Step 3: Viết hàm dùng chung cho kho**

`src/server/services/inventory.ts`:
```ts
import { FieldValue, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";
import type { Product } from "@/lib/domain/models";
import { formatQty } from "@/lib/domain/money";
import { InsufficientStockError, reverseStockIn, stockIn, stockOut } from "@/lib/domain/stock";
import type { Actor } from "@/server/actor";

export type ProductMap = Map<string, Product>;

export interface MovementDraft {
  productId: string;
  qtyDelta: number;
  costDelta: number;
}

export type SourceType = "receipt" | "production" | "adjustment";

/** Đọc các sản phẩm trong transaction. Phải gọi trước mọi lệnh ghi. */
export async function loadProducts(tx: Transaction, shop: DocumentReference, ids: string[]): Promise<ProductMap> {
  const refs = [...new Set(ids)].map((id) => shop.collection("products").doc(id));
  const snaps = refs.length ? await tx.getAll(...refs) : [];
  const map: ProductMap = new Map();
  for (const snap of snaps) {
    if (!snap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy sản phẩm.");
    map.set(snap.id, { id: snap.id, ...(snap.data() as Omit<Product, "id">) });
  }
  return map;
}

export function requireActive(product: Product) {
  if (product.archived) {
    throw new AppError("VALIDATION", `Sản phẩm "${product.name}" đã ngừng sử dụng.`);
  }
}

function insufficient(product: Product, error: InsufficientStockError, voiding: boolean): AppError {
  const base = `${product.name} chỉ còn ${formatQty(error.available, product.unit)}, không đủ ${formatQty(error.requested, product.unit)}.`;
  return new AppError(
    "INSUFFICIENT_STOCK",
    voiding ? `Không thể hủy: ${base} Hãy hủy các chứng từ đã dùng số hàng này trước.` : base,
  );
}

/** Nhập vào kho; cập nhật sản phẩm trong map. */
export function addStock(product: Product, qty: number, totalCost: number) {
  Object.assign(product, stockIn(product, qty, totalCost));
}

/** Xuất khỏi kho theo giá vốn bình quân; trả về tổng giá vốn đã xuất. */
export function takeStock(product: Product, qty: number): number {
  try {
    const { state, totalCost } = stockOut(product, qty);
    Object.assign(product, state);
    return totalCost;
  } catch (error) {
    if (error instanceof InsufficientStockError) throw insufficient(product, error, false);
    throw error;
  }
}

/** Đảo một lần nhập khi hủy chứng từ. */
export function undoAddStock(product: Product, qty: number, totalCost: number) {
  try {
    Object.assign(product, reverseStockIn(product, qty, totalCost));
  } catch (error) {
    if (error instanceof InsufficientStockError) throw insufficient(product, error, true);
    throw error;
  }
}

export function writeProducts(tx: Transaction, shop: DocumentReference, products: ProductMap) {
  for (const p of products.values()) {
    tx.update(shop.collection("products").doc(p.id), {
      stockQty: p.stockQty,
      avgCost: p.avgCost,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

/** ID movement cố định theo chứng từ, nên ghi lại cũng không bị nhân đôi. */
export function writeMovements(
  tx: Transaction,
  shop: DocumentReference,
  source: { type: SourceType; id: string; date: string },
  drafts: MovementDraft[],
  suffix = "",
) {
  drafts.forEach((m, i) => {
    tx.set(shop.collection("movements").doc(`${source.id}${suffix}_${i}`), {
      ...m,
      sourceType: source.type,
      sourceId: source.id,
      date: source.date,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

export function voidFields(actor: Actor, reason: string) {
  return {
    status: "voided",
    voidReason: reason,
    voidedBy: actor.uid,
    voidedAt: FieldValue.serverTimestamp(),
  };
}
```

- [ ] **Step 4: Viết service phiếu nhập**

`src/server/services/receipts.ts`:
```ts
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";
import { RECEIPT_ALLOWED_KINDS, RECEIPT_KIND_LABEL, type CostLine } from "@/lib/domain/models";
import { receiptInput, voidInput } from "@/lib/domain/schemas";
import type { Actor } from "@/server/actor";
import {
  addStock,
  loadProducts,
  requireActive,
  undoAddStock,
  voidFields,
  writeMovements,
  writeProducts,
  type MovementDraft,
} from "@/server/services/inventory";
import { shopRef } from "@/server/services/membership";

export async function createReceipt(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const r = receiptInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("receipts").doc(r.id);
  const supplierId = r.kind === "harvest" ? null : r.supplierId;
  const lines: CostLine[] = r.lines.map((l) => ({ ...l, totalCost: r.kind === "harvest" ? 0 : l.totalCost }));

  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    const products = await loadProducts(tx, shop, lines.map((l) => l.productId));
    if (supplierId && !(await tx.get(shop.collection("suppliers").doc(supplierId))).exists) {
      throw new AppError("NOT_FOUND", "Không tìm thấy nhà cung cấp.");
    }

    const allowed = RECEIPT_ALLOWED_KINDS[r.kind];
    const movements: MovementDraft[] = [];
    for (const line of lines) {
      const product = products.get(line.productId)!;
      requireActive(product);
      if (!allowed.includes(product.kind)) {
        throw new AppError("VALIDATION", `"${product.name}" không nhập được bằng phiếu ${RECEIPT_KIND_LABEL[r.kind].toLowerCase()}.`);
      }
      addStock(product, line.qty, line.totalCost);
      movements.push({ productId: line.productId, qtyDelta: line.qty, costDelta: line.totalCost });
    }

    tx.set(ref, {
      kind: r.kind,
      date: r.date,
      supplierId,
      note: r.note,
      lines,
      total: lines.reduce((sum, l) => sum + l.totalCost, 0),
      status: "active",
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    writeProducts(tx, shop, products);
    writeMovements(tx, shop, { type: "receipt", id: r.id, date: r.date }, movements);
  });
  return { id: r.id };
}

export async function voidReceipt(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const v = voidInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("receipts").doc(v.id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy phiếu nhập.");
    if (snap.get("status") === "voided") return;
    const lines = snap.get("lines") as CostLine[];
    const date = snap.get("date") as string;
    const products = await loadProducts(tx, shop, lines.map((l) => l.productId));

    const movements: MovementDraft[] = [];
    for (const line of [...lines].reverse()) {
      undoAddStock(products.get(line.productId)!, line.qty, line.totalCost);
      movements.push({ productId: line.productId, qtyDelta: -line.qty, costDelta: -line.totalCost });
    }

    tx.update(ref, voidFields(actor, v.reason));
    writeProducts(tx, shop, products);
    writeMovements(tx, shop, { type: "receipt", id: v.id, date }, movements, "_void");
  });
  return { id: v.id };
}
```

- [ ] **Step 5: Chạy test để thấy thành công**

Run: `npm run test:emulator`
Expected: PASS toàn bộ `receipts.test.ts`, các test cũ vẫn PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(server): stock receipts (harvest/purchase) with void"
```

---

### Task 9: Service chế biến

**Files:**
- Create: `src/server/services/productions.ts`
- Test: `tests/integration/productions.test.ts`

- [ ] **Step 1: Viết test thất bại**

`tests/integration/productions.test.ts`:
```ts
import { beforeEach, describe, expect, test } from "vitest";
import { createProduction, voidProduction } from "@/server/services/productions";
import { clearFirestore, db, getProduct, listMovements, owner, P, seedProduct, seedShop, SHOP_ID } from "./helpers";

const PR1 = "prod_doc_00001";
const PR2 = "prod_doc_00002";

beforeEach(async () => {
  await clearFirestore();
  await seedShop();
  await seedProduct(P.raw, { name: "Yến thô", stockQty: 1000, avgCost: 30_000 });
  await seedProduct(P.clean, { name: "Yến tinh tổ", kind: "clean" });
  await seedProduct(P.vun, { name: "Yến vụn", kind: "clean" });
  await seedProduct(P.sugar, { name: "Đường phèn", kind: "supply", unit: "piece", stockQty: 100, avgCost: 2_000 });
  await seedProduct(P.jar, { name: "Hũ thủy tinh", kind: "supply", unit: "piece", stockQty: 100, avgCost: 5_000 });
  await seedProduct(P.steamed, { name: "Yến chưng 70ml", kind: "steamed", unit: "piece" });
});

const clean = {
  id: PR1, kind: "clean", date: "2026-10-22",
  inputs: [{ productId: P.raw, qty: 1000 }],
  outputs: [
    { productId: P.clean, qty: 700, gramPerUnit: 1 },
    { productId: P.vun, qty: 100, gramPerUnit: 1 },
  ],
};

describe("createProduction", () => {
  test("làm sạch: trừ thô, cộng tinh chế theo giá vốn chia theo gram, lưu hao hụt", async () => {
    await createProduction(db(), SHOP_ID, owner, clean);
    expect(await getProduct(P.raw)).toMatchObject({ stockQty: 0, avgCost: 30_000 });
    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 700, avgCost: 37_500 });
    expect(await getProduct(P.vun)).toMatchObject({ stockQty: 100, avgCost: 37_500 });

    const doc = await db().collection("shops").doc(SHOP_ID).collection("productions").doc(PR1).get();
    expect(doc.data()).toMatchObject({
      kind: "clean", totalCost: 30_000_000, lossQty: 200, lossRate: 0.2, status: "active",
      inputs: [{ productId: P.raw, qty: 1000, totalCost: 30_000_000 }],
      outputs: [
        { productId: P.clean, qty: 700, gramPerUnit: 1, totalCost: 26_250_000, unitCost: 37_500 },
        { productId: P.vun, qty: 100, gramPerUnit: 1, totalCost: 3_750_000, unitCost: 37_500 },
      ],
    });
    expect((await listMovements(PR1)).map((m) => m.qtyDelta).sort((a, b) => a - b)).toEqual([-1000, 100, 700]);
  });

  test("chưng: gộp giá vốn yến và vật tư vào hũ", async () => {
    await createProduction(db(), SHOP_ID, owner, clean);
    await createProduction(db(), SHOP_ID, owner, {
      id: PR2, kind: "steam", date: "2026-10-22",
      inputs: [
        { productId: P.clean, qty: 100 },
        { productId: P.sugar, qty: 10 },
        { productId: P.jar, qty: 10 },
      ],
      outputs: [{ productId: P.steamed, qty: 10, gramPerUnit: 10 }],
    });
    expect(await getProduct(P.steamed)).toMatchObject({ stockQty: 10, avgCost: 382_000 });
    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 600 });
  });

  test("gramPerUnit của đầu ra tính bằng gram luôn lưu là 1", async () => {
    await createProduction(db(), SHOP_ID, owner, {
      ...clean,
      outputs: [{ productId: P.clean, qty: 800, gramPerUnit: 50 }],
    });
    const doc = await db().collection("shops").doc(SHOP_ID).collection("productions").doc(PR1).get();
    expect(doc.get("outputs")[0].gramPerUnit).toBe(1);
  });

  test("báo lỗi khi không đủ tồn", async () => {
    await expect(
      createProduction(db(), SHOP_ID, owner, { ...clean, inputs: [{ productId: P.raw, qty: 1200 }] }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK", message: expect.stringContaining("Yến thô chỉ còn 1.000g") });
  });

  test("chặn sai loại, đầu ra nặng hơn đầu vào, trùng sản phẩm", async () => {
    await expect(
      createProduction(db(), SHOP_ID, owner, { ...clean, outputs: [{ productId: P.steamed, qty: 1, gramPerUnit: 1 }] }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createProduction(db(), SHOP_ID, owner, { ...clean, outputs: [{ productId: P.clean, qty: 1100, gramPerUnit: 1 }] }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createProduction(db(), SHOP_ID, owner, {
        ...clean,
        inputs: [{ productId: P.raw, qty: 100 }, { productId: P.raw, qty: 100 }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  test("gửi trùng ID không chế biến hai lần", async () => {
    await createProduction(db(), SHOP_ID, owner, { ...clean, inputs: [{ productId: P.raw, qty: 500 }], outputs: [{ productId: P.clean, qty: 400, gramPerUnit: 1 }] });
    await createProduction(db(), SHOP_ID, owner, { ...clean, inputs: [{ productId: P.raw, qty: 500 }], outputs: [{ productId: P.clean, qty: 400, gramPerUnit: 1 }] });
    expect((await getProduct(P.raw)).stockQty).toBe(500);
  });
});

describe("voidProduction", () => {
  test("hủy: trả nguyên liệu, rút thành phẩm", async () => {
    await createProduction(db(), SHOP_ID, owner, clean);
    await voidProduction(db(), SHOP_ID, owner, { id: PR1, reason: "Nhập nhầm" });
    expect(await getProduct(P.raw)).toMatchObject({ stockQty: 1000, avgCost: 30_000 });
    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 0 });
    expect(await getProduct(P.vun)).toMatchObject({ stockQty: 0 });
  });

  test("không hủy được khi thành phẩm đã dùng", async () => {
    await createProduction(db(), SHOP_ID, owner, clean);
    await createProduction(db(), SHOP_ID, owner, {
      id: PR2, kind: "steam", date: "2026-10-22",
      inputs: [{ productId: P.clean, qty: 100 }],
      outputs: [{ productId: P.steamed, qty: 10, gramPerUnit: 10 }],
    });
    await expect(voidProduction(db(), SHOP_ID, owner, { id: PR1, reason: "x" })).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
    });
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `npm run test:emulator`
Expected: FAIL, lỗi không tìm thấy module `@/server/services/productions`.

- [ ] **Step 3: Viết code**

`src/server/services/productions.ts`:
```ts
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";
import {
  PRODUCT_KIND_LABEL,
  PRODUCTION_INPUT_KINDS,
  PRODUCTION_KIND_LABEL,
  PRODUCTION_OUTPUT_KIND,
  type CostLine,
  type ProductionOutputLine,
} from "@/lib/domain/models";
import { computeProduction } from "@/lib/domain/production";
import { productionInput, voidInput } from "@/lib/domain/schemas";
import type { Actor } from "@/server/actor";
import {
  addStock,
  loadProducts,
  requireActive,
  takeStock,
  undoAddStock,
  voidFields,
  writeMovements,
  writeProducts,
  type MovementDraft,
} from "@/server/services/inventory";
import { shopRef } from "@/server/services/membership";

export async function createProduction(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const p = productionInput.parse(input);
  const ids = [...p.inputs, ...p.outputs].map((l) => l.productId);
  if (new Set(ids).size !== ids.length) {
    throw new AppError("VALIDATION", "Mỗi sản phẩm chỉ xuất hiện một lần, và không thể vừa là nguyên liệu vừa là thành phẩm.");
  }
  const shop = shopRef(db, shopId);
  const ref = shop.collection("productions").doc(p.id);
  const label = PRODUCTION_KIND_LABEL[p.kind].toLowerCase();

  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    const products = await loadProducts(tx, shop, ids);

    const inputKinds = PRODUCTION_INPUT_KINDS[p.kind];
    const outputKind = PRODUCTION_OUTPUT_KIND[p.kind];
    const inputs: (CostLine & { unit: "g" | "piece" })[] = [];
    for (const line of p.inputs) {
      const product = products.get(line.productId)!;
      requireActive(product);
      if (!inputKinds.includes(product.kind)) {
        throw new AppError("VALIDATION", `"${product.name}" không dùng làm nguyên liệu khi ${label}.`);
      }
      inputs.push({ productId: line.productId, qty: line.qty, totalCost: takeStock(product, line.qty), unit: product.unit });
    }

    const outputs = p.outputs.map((line) => {
      const product = products.get(line.productId)!;
      requireActive(product);
      if (product.kind !== outputKind) {
        throw new AppError("VALIDATION", `Thành phẩm khi ${label} phải là ${PRODUCT_KIND_LABEL[outputKind].toLowerCase()}.`);
      }
      return { ...line, unit: product.unit, gramPerUnit: product.unit === "g" ? 1 : line.gramPerUnit };
    });

    const result = computeProduction(p.kind, inputs, outputs);
    if (result.lossQty < 0) {
      throw new AppError("VALIDATION", "Khối lượng yến sau làm sạch không thể lớn hơn trước khi làm sạch.");
    }

    const outputLines: ProductionOutputLine[] = outputs.map((o, i) => {
      addStock(products.get(o.productId)!, o.qty, result.outputCosts[i]);
      return {
        productId: o.productId,
        qty: o.qty,
        gramPerUnit: o.gramPerUnit,
        totalCost: result.outputCosts[i],
        unitCost: result.unitCosts[i],
      };
    });
    const inputLines: CostLine[] = inputs.map(({ productId, qty, totalCost }) => ({ productId, qty, totalCost }));

    tx.set(ref, {
      kind: p.kind,
      date: p.date,
      note: p.note,
      inputs: inputLines,
      outputs: outputLines,
      totalCost: result.totalInputCost,
      lossQty: result.lossQty,
      lossRate: result.lossRate,
      status: "active",
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    writeProducts(tx, shop, products);
    const movements: MovementDraft[] = [
      ...inputLines.map((l) => ({ productId: l.productId, qtyDelta: -l.qty, costDelta: -l.totalCost })),
      ...outputLines.map((l) => ({ productId: l.productId, qtyDelta: l.qty, costDelta: l.totalCost })),
    ];
    writeMovements(tx, shop, { type: "production", id: p.id, date: p.date }, movements);
  });
  return { id: p.id };
}

export async function voidProduction(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const v = voidInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("productions").doc(v.id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy phiếu chế biến.");
    if (snap.get("status") === "voided") return;
    const inputs = snap.get("inputs") as CostLine[];
    const outputs = snap.get("outputs") as ProductionOutputLine[];
    const date = snap.get("date") as string;
    const products = await loadProducts(tx, shop, [...inputs, ...outputs].map((l) => l.productId));

    const movements: MovementDraft[] = [];
    for (const o of outputs) {
      undoAddStock(products.get(o.productId)!, o.qty, o.totalCost);
      movements.push({ productId: o.productId, qtyDelta: -o.qty, costDelta: -o.totalCost });
    }
    for (const i of inputs) {
      addStock(products.get(i.productId)!, i.qty, i.totalCost);
      movements.push({ productId: i.productId, qtyDelta: i.qty, costDelta: i.totalCost });
    }

    tx.update(ref, voidFields(actor, v.reason));
    writeProducts(tx, shop, products);
    writeMovements(tx, shop, { type: "production", id: v.id, date }, movements, "_void");
  });
  return { id: v.id };
}
```

- [ ] **Step 4: Chạy test để thấy thành công**

Run: `npm run test:emulator`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): production (clean/steam/pack) with cost allocation and void"
```

---

### Task 10: Service điều chỉnh kho

**Files:**
- Create: `src/server/services/adjustments.ts`
- Test: `tests/integration/adjustments.test.ts`

- [ ] **Step 1: Viết test thất bại**

`tests/integration/adjustments.test.ts`:
```ts
import { beforeEach, describe, expect, test } from "vitest";
import { createAdjustment, voidAdjustment } from "@/server/services/adjustments";
import { clearFirestore, db, getProduct, owner, P, seedProduct, seedShop, SHOP_ID } from "./helpers";

const A1 = "adj_000000001";

beforeEach(async () => {
  await clearFirestore();
  await seedShop();
  await seedProduct(P.clean, { name: "Yến tinh", kind: "clean", stockQty: 500, avgCost: 40_000 });
});

describe("adjustments", () => {
  test("giảm kho theo giá vốn bình quân", async () => {
    await createAdjustment(db(), SHOP_ID, owner, {
      id: A1, date: "2026-10-22", reason: "Kiểm kho thiếu", lines: [{ productId: P.clean, qtyDelta: -20 }],
    });
    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 480, avgCost: 40_000 });
    const doc = await db().collection("shops").doc(SHOP_ID).collection("adjustments").doc(A1).get();
    expect(doc.get("lines")).toEqual([{ productId: P.clean, qtyDelta: -20, costDelta: -800_000 }]);
  });

  test("tăng kho giữ nguyên giá vốn bình quân", async () => {
    await createAdjustment(db(), SHOP_ID, owner, {
      id: A1, date: "2026-10-22", reason: "Kiểm kho dư", lines: [{ productId: P.clean, qtyDelta: 30 }],
    });
    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 530, avgCost: 40_000 });
  });

  test("không giảm quá tồn", async () => {
    await expect(
      createAdjustment(db(), SHOP_ID, owner, {
        id: A1, date: "2026-10-22", reason: "x", lines: [{ productId: P.clean, qtyDelta: -600 }],
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
  });

  test("hủy điều chỉnh trả lại như cũ", async () => {
    await createAdjustment(db(), SHOP_ID, owner, {
      id: A1, date: "2026-10-22", reason: "x", lines: [{ productId: P.clean, qtyDelta: -20 }],
    });
    await voidAdjustment(db(), SHOP_ID, owner, { id: A1, reason: "Đếm lại đủ" });
    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 500, avgCost: 40_000 });
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `npm run test:emulator`
Expected: FAIL, lỗi không tìm thấy module `@/server/services/adjustments`.

- [ ] **Step 3: Viết code**

`src/server/services/adjustments.ts`:
```ts
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";
import type { AdjustmentLine } from "@/lib/domain/models";
import { adjustmentInput, voidInput } from "@/lib/domain/schemas";
import type { Actor } from "@/server/actor";
import {
  addStock,
  loadProducts,
  requireActive,
  takeStock,
  undoAddStock,
  voidFields,
  writeMovements,
  writeProducts,
} from "@/server/services/inventory";
import { shopRef } from "@/server/services/membership";

export async function createAdjustment(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const a = adjustmentInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("adjustments").doc(a.id);

  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    const products = await loadProducts(tx, shop, a.lines.map((l) => l.productId));

    const lines: AdjustmentLine[] = a.lines.map((line) => {
      const product = products.get(line.productId)!;
      requireActive(product);
      if (line.qtyDelta < 0) {
        return { productId: line.productId, qtyDelta: line.qtyDelta, costDelta: -takeStock(product, -line.qtyDelta) };
      }
      const costDelta = line.qtyDelta * product.avgCost;
      addStock(product, line.qtyDelta, costDelta);
      return { productId: line.productId, qtyDelta: line.qtyDelta, costDelta };
    });

    tx.set(ref, {
      date: a.date,
      reason: a.reason,
      lines,
      status: "active",
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    writeProducts(tx, shop, products);
    writeMovements(tx, shop, { type: "adjustment", id: a.id, date: a.date }, lines);
  });
  return { id: a.id };
}

export async function voidAdjustment(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const v = voidInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("adjustments").doc(v.id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy phiếu điều chỉnh.");
    if (snap.get("status") === "voided") return;
    const lines = snap.get("lines") as AdjustmentLine[];
    const date = snap.get("date") as string;
    const products = await loadProducts(tx, shop, lines.map((l) => l.productId));

    const reversed = lines.map((line) => {
      const product = products.get(line.productId)!;
      if (line.qtyDelta > 0) undoAddStock(product, line.qtyDelta, line.costDelta);
      else addStock(product, -line.qtyDelta, -line.costDelta);
      return { productId: line.productId, qtyDelta: -line.qtyDelta, costDelta: -line.costDelta };
    });

    tx.update(ref, voidFields(actor, v.reason));
    writeProducts(tx, shop, products);
    writeMovements(tx, shop, { type: "adjustment", id: v.id, date }, reversed, "_void");
  });
  return { id: v.id };
}
```

- [ ] **Step 4: Chạy test để thấy thành công**

Run: `npm run test:emulator`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): stock adjustments with void"
```

---

### Task 11: Firestore security rules

**Files:**
- Modify: `firestore.rules`
- Test: `tests/rules/firestore.rules.test.ts`

- [ ] **Step 1: Viết test thất bại**

`tests/rules/firestore.rules.test.ts`:
```ts
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
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `npm run test:emulator`
Expected: FAIL ở các test `assertSucceeds`, vì rules tạm đang chặn tất cả.

- [ ] **Step 3: Viết rules**

`firestore.rules`:
```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isMember(shopId) {
      return signedIn()
        && request.auth.uid in get(/databases/$(database)/documents/shops/$(shopId)).data.memberUids;
    }

    function optionalString(data, field, max) {
      return !(field in data) || (data[field] is string && data[field].size() <= max);
    }

    function validSupplier(data) {
      return data.keys().hasOnly(['name', 'phone', 'note', 'createdBy', 'createdAt', 'updatedAt'])
        && data.name is string && data.name.size() >= 1 && data.name.size() <= 100
        && optionalString(data, 'phone', 20)
        && optionalString(data, 'note', 500)
        && data.updatedAt == request.time;
    }

    match /shops/{shopId} {
      // Mọi ghi vào cửa hàng, sản phẩm, chứng từ, movements, stats, thành viên
      // và lời mời đều đi qua Server Actions (firebase-admin bỏ qua rules).
      allow read: if signedIn() && request.auth.uid in resource.data.memberUids;

      match /{collection}/{docId} {
        allow read: if isMember(shopId);
      }

      match /suppliers/{supplierId} {
        allow create: if isMember(shopId)
          && validSupplier(request.resource.data)
          && request.resource.data.createdBy == request.auth.uid
          && request.resource.data.createdAt == request.time;
        allow update: if isMember(shopId)
          && validSupplier(request.resource.data)
          && request.resource.data.createdBy == resource.data.createdBy
          && request.resource.data.createdAt == resource.data.createdAt;
      }
    }
  }
}
```

- [ ] **Step 4: Chạy test để thấy thành công**

Run: `npm run test:emulator`
Expected: PASS toàn bộ (cả integration lẫn rules).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(rules): member-only reads, server-only writes, validated suppliers"
```

---

### Task 12: Server Actions

**Files:**
- Create: `src/server/actions/shop.ts`, `src/server/actions/inventory.ts`

Server Action là lớp mỏng: xác thực → gọi service → bọc kết quả bằng `runAction`. Logic đã có test ở các service, nên ở đây chỉ cần kiểm tra typecheck. Toàn bộ luồng sẽ được kiểm tra trên trình duyệt ở Task 20.

- [ ] **Step 1: Viết actions cho cửa hàng**

`src/server/actions/shop.ts`:
```ts
"use server";

import { requireMember, requireUser } from "@/server/auth";
import { getAdminDb } from "@/server/firebase-admin";
import { runAction } from "@/server/run-action";
import { cancelInvite, createShop, findMyShop, inviteMember, removeMember } from "@/server/services/membership";

export async function getMyShopAction() {
  return runAction(async () => findMyShop(getAdminDb(), await requireUser()));
}

export async function createShopAction(input: unknown) {
  return runAction(async () => createShop(getAdminDb(), await requireUser(), input));
}

export async function inviteMemberAction(shopId: string, input: unknown) {
  return runAction(async () => inviteMember(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function cancelInviteAction(shopId: string, input: unknown) {
  return runAction(async () => {
    await requireMember(shopId);
    return cancelInvite(getAdminDb(), shopId, input);
  });
}

export async function removeMemberAction(shopId: string, input: unknown) {
  return runAction(async () => {
    await requireMember(shopId);
    return removeMember(getAdminDb(), shopId, input);
  });
}
```

- [ ] **Step 2: Viết actions cho kho**

`src/server/actions/inventory.ts`:
```ts
"use server";

import { requireMember } from "@/server/auth";
import { getAdminDb } from "@/server/firebase-admin";
import { runAction } from "@/server/run-action";
import { createAdjustment, voidAdjustment } from "@/server/services/adjustments";
import { createProduct, updateProduct } from "@/server/services/products";
import { createProduction, voidProduction } from "@/server/services/productions";
import { createReceipt, voidReceipt } from "@/server/services/receipts";

export async function createProductAction(shopId: string, input: unknown) {
  return runAction(async () => createProduct(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function updateProductAction(shopId: string, input: unknown) {
  return runAction(async () => {
    await requireMember(shopId);
    return updateProduct(getAdminDb(), shopId, input);
  });
}

export async function createReceiptAction(shopId: string, input: unknown) {
  return runAction(async () => createReceipt(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function voidReceiptAction(shopId: string, input: unknown) {
  return runAction(async () => voidReceipt(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function createProductionAction(shopId: string, input: unknown) {
  return runAction(async () => createProduction(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function voidProductionAction(shopId: string, input: unknown) {
  return runAction(async () => voidProduction(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function createAdjustmentAction(shopId: string, input: unknown) {
  return runAction(async () => createAdjustment(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function voidAdjustmentAction(shopId: string, input: unknown) {
  return runAction(async () => voidAdjustment(getAdminDb(), shopId, await requireMember(shopId), input));
}
```

- [ ] **Step 3: Kiểm tra**

Run: `npm run typecheck && npm run lint`
Expected: không lỗi.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(server): server actions for shop, products and inventory"
```

---

### Task 13: Client — Firebase, đăng nhập, cửa hàng, hooks

**Files:**
- Create: `src/lib/firebase/config.ts`, `src/lib/firebase/client.ts`, `src/lib/firebase/suppliers.ts`, `src/components/auth/auth-gate.tsx`, `src/components/shop/shop-provider.tsx`, `src/hooks/use-live-query.ts`, `src/hooks/use-shop-data.ts`, `src/components/common/use-run-action.ts`, `src/components/common/money-input.tsx`, `src/components/common/date-field.tsx`
- Modify: `src/components/auth/auth-provider.tsx` (viết lại toàn bộ), `src/app/(app)/page.tsx`
- Create: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Cấu hình và khởi tạo Firebase client**

```bash
cp ../bo-do-it-app/src/lib/firebase/config.ts src/lib/firebase/config.ts
```

`src/lib/firebase/client.ts`:
```ts
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseConfig } from "@/lib/firebase/config";

const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp {
  app ??= getApps().length ? getApp() : initializeApp(getFirebaseConfig());
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (useEmulators) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  return auth;
}

export function getClientDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
    if (useEmulators) connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  return db;
}
```

- [ ] **Step 2: AuthProvider có đồng bộ session cookie**

`src/components/auth/auth-provider.tsx` (thay toàn bộ):
```tsx
"use client";

import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  sessionError: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/** Đổi ID token lấy session cookie để Server Actions biết ai đang gọi. */
async function syncSession(user: User): Promise<boolean> {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: await user.getIdToken() }),
  });
  return response.ok;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (next) => {
      if (next && !(await syncSession(next).catch(() => false))) {
        setSessionError(true);
        await firebaseSignOut(auth);
        return;
      }
      setSessionError(false);
      setUser(next);
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async () => {
    await signInWithPopup(getFirebaseAuth(), googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/session", { method: "DELETE" }).catch(() => {});
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  const value = useMemo(
    () => ({ user, loading, sessionError, signIn, signOut }),
    [loading, sessionError, signIn, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth phải được dùng bên trong AuthProvider.");
  return value;
}
```

- [ ] **Step 3: AuthGate**

`src/components/auth/auth-gate.tsx`:
```tsx
"use client";

import { GoogleOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Spin, Typography } from "antd";
import { FirebaseError } from "firebase/app";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { isFirebaseConfigured, missingFirebaseEnvVars } from "@/lib/firebase/config";

const { Paragraph, Title } = Typography;

export function AuthGate({ children }: { children: ReactNode }) {
  const { message } = App.useApp();
  const { loading, sessionError, signIn, user } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  if (!isFirebaseConfigured) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-4">
        <Alert
          type="warning"
          showIcon
          title="Firebase chưa được cấu hình"
          description={`Sao chép .env.example thành .env.local. Biến còn thiếu: ${missingFirebaseEnvVars.join(", ")}`}
        />
      </div>
    );
  }

  if (loading && !sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <div className="space-y-6 text-center">
            <div>
              <Title level={2} className="mb-1!">Sổ Yến</Title>
              <Paragraph type="secondary">Sổ sách kho, bán hàng và thuế cho hộ kinh doanh yến sào.</Paragraph>
            </div>
            {sessionError && (
              <Alert type="error" showIcon title="Không tạo được phiên đăng nhập. Vui lòng thử lại." />
            )}
            <Button
              block
              type="primary"
              size="large"
              icon={<GoogleOutlined />}
              loading={signingIn}
              onClick={async () => {
                setSigningIn(true);
                try {
                  await signIn();
                } catch (error) {
                  if (error instanceof FirebaseError && error.code === "auth/popup-closed-by-user") return;
                  void message.error(
                    error instanceof FirebaseError && error.code === "auth/popup-blocked"
                      ? "Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép pop-up rồi thử lại."
                      : "Không thể đăng nhập bằng Google.",
                  );
                } finally {
                  setSigningIn(false);
                }
              }}
            >
              Tiếp tục với Google
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return children;
}
```

- [ ] **Step 4: Tiện ích gọi action và các ô nhập dùng chung**

`src/components/common/use-run-action.ts`:
```ts
"use client";

import { App, type FormInstance } from "antd";
import { useCallback } from "react";
import type { ActionResult } from "@/lib/domain/errors";

/** "lines.0.qty" → ["lines", 0, "qty"] để gắn lỗi vào đúng ô của Form.List. */
function toNamePath(key: string): (string | number)[] {
  return key.split(".").map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

export function useRunAction() {
  const { message } = App.useApp();
  return useCallback(
    async <T,>(pending: Promise<ActionResult<T>>, options: { success?: string; form?: FormInstance } = {}) => {
      const result = await pending;
      if (!result.ok) {
        if (options.form && result.fieldErrors) {
          options.form.setFields(
            Object.entries(result.fieldErrors).map(([key, error]) => ({ name: toNamePath(key), errors: [error] })),
          );
        }
        void message.error(result.message);
        return null;
      }
      if (options.success) void message.success(options.success);
      return result.data;
    },
    [message],
  );
}
```

`src/components/common/money-input.tsx`:
```tsx
"use client";

import { Input } from "antd";
import { useState } from "react";
import { formatNumber, parseMoney } from "@/lib/domain/money";

interface MoneyInputProps {
  value?: number | null;
  onChange?: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** Ô nhập tiền chấp nhận "1tr5", "350k", "1.250.000"; rời ô thì hiện số đã định dạng. */
export function MoneyInput({ value, onChange, placeholder, disabled }: MoneyInputProps) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value == null ? "" : formatNumber(value));
  return (
    <Input
      inputMode="decimal"
      suffix="₫"
      value={shown}
      disabled={disabled}
      placeholder={placeholder ?? "VD: 1tr5, 350k"}
      onChange={(event) => {
        setText(event.target.value);
        onChange?.(parseMoney(event.target.value));
      }}
      onBlur={() => setText(null)}
    />
  );
}
```

`src/components/common/date-field.tsx`:
```tsx
"use client";

import { DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";

interface DateFieldProps {
  value?: string;
  onChange?: (value: string) => void;
}

/** Chọn ngày nghiệp vụ, giá trị là chuỗi YYYY-MM-DD, không cho chọn ngày tương lai. */
export function DateField({ value, onChange }: DateFieldProps) {
  return (
    <DatePicker
      className="w-full"
      format="DD/MM/YYYY"
      allowClear={false}
      value={value ? dayjs(value) : null}
      disabledDate={(d: Dayjs) => d.isAfter(dayjs(), "day")}
      onChange={(d) => d && onChange?.(d.format("YYYY-MM-DD"))}
    />
  );
}
```

- [ ] **Step 5: ShopGate và hooks dữ liệu realtime**

`src/components/shop/shop-provider.tsx`:
```tsx
"use client";

import { Alert, Button, Card, Form, Input, Spin, Typography } from "antd";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useRunAction } from "@/components/common/use-run-action";
import { createShopAction, getMyShopAction } from "@/server/actions/shop";
import type { MyShop } from "@/server/services/membership";

interface ShopContextValue {
  shop: MyShop;
  refresh: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<{ loading: boolean; shop: MyShop | null; error: string | null }>({
    loading: true,
    shop: null,
    error: null,
  });

  const load = useCallback(async () => {
    const result = await getMyShopAction();
    setState(
      result.ok
        ? { loading: false, shop: result.data, error: null }
        : { loading: false, shop: null, error: result.message },
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load, user?.uid]);

  if (state.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Alert type="error" showIcon title={state.error} action={<Button onClick={() => void load()}>Thử lại</Button>} />
      </div>
    );
  }

  if (!state.shop) return <CreateShopCard onCreated={load} />;

  return <ShopContext.Provider value={{ shop: state.shop, refresh: load }}>{children}</ShopContext.Provider>;
}

function CreateShopCard({ onCreated }: { onCreated: () => Promise<void> }) {
  const run = useRunAction();
  const [saving, setSaving] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <Typography.Title level={3}>Tạo cửa hàng</Typography.Title>
        <Typography.Paragraph type="secondary">
          Nếu bạn được người nhà mời, hãy nhờ họ mời đúng email Google bạn vừa đăng nhập rồi tải lại trang.
        </Typography.Paragraph>
        <Form
          layout="vertical"
          onFinish={async (values: { name: string }) => {
            setSaving(true);
            const created = await run(createShopAction(values));
            setSaving(false);
            if (created) await onCreated();
          }}
        >
          <Form.Item name="name" label="Tên cửa hàng" rules={[{ required: true, message: "Nhập tên cửa hàng" }]}>
            <Input placeholder="VD: Yến sào Nhà Mình" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={saving}>
            Tạo cửa hàng
          </Button>
        </Form>
      </Card>
    </div>
  );
}

export function useShop(): ShopContextValue {
  const value = useContext(ShopContext);
  if (!value) throw new Error("useShop phải được dùng bên trong ShopGate.");
  return value;
}
```

`src/hooks/use-live-query.ts`:
```ts
"use client";

import { onSnapshot, type Firestore, type Query } from "firebase/firestore";
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
```

`src/hooks/use-shop-data.ts`:
```ts
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
```

`src/lib/firebase/suppliers.ts`:
```ts
import { collection, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";

export interface SupplierValues {
  name: string;
  phone: string;
  note: string;
}

/** Nhà cung cấp là dữ liệu đơn giản nên client ghi trực tiếp; rules kiểm tra dữ liệu. */
export async function saveSupplier(shopId: string, uid: string, id: string | null, values: SupplierValues) {
  const suppliers = collection(getClientDb(), "shops", shopId, "suppliers");
  const data = { name: values.name.trim(), phone: values.phone.trim(), note: values.note.trim() };
  if (id) {
    await updateDoc(doc(suppliers, id), { ...data, updatedAt: serverTimestamp() });
  } else {
    await setDoc(doc(suppliers), { ...data, createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}
```

- [ ] **Step 6: Layout của nhóm (app) (tạm chưa có AppShell)**

`src/app/(app)/layout.tsx`:
```tsx
import { AuthGate } from "@/components/auth/auth-gate";
import { ShopGate } from "@/components/shop/shop-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <ShopGate>{children}</ShopGate>
    </AuthGate>
  );
}
```

- [ ] **Step 7: Kiểm tra trên trình duyệt**

Mở hai terminal:
```bash
npm run emulators
```
```bash
npm run dev
```

Mở http://localhost:3000, bấm "Tiếp tục với Google", trong cửa sổ Auth Emulator chọn "Add new account" và tạo tài khoản `chu@example.com`.
Expected: thấy thẻ "Tạo cửa hàng". Nhập tên, bấm tạo, trang hiện chữ "Sổ Yến". Trên Emulator UI (http://localhost:4000/firestore) thấy `shops/{id}` có `memberUids` chứa uid vừa tạo.

Run: `npm run typecheck && npm run lint`
Expected: không lỗi.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(client): auth with session cookie, shop gate, realtime hooks"
```

---

### Task 14: Khung app, trang Tổng quan, trang Thành viên

**Files:**
- Create: `src/components/layout/app-shell.tsx`, `src/app/(app)/thanh-vien/page.tsx`
- Modify: `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`

- [ ] **Step 1: AppShell**

`src/components/layout/app-shell.tsx`:
```tsx
"use client";

import {
  AppstoreOutlined,
  FileTextOutlined,
  HomeOutlined,
  InboxOutlined,
  LogoutOutlined,
  ShopOutlined,
  TeamOutlined,
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

const PRIMARY: NavItem[] = [
  { href: "/", label: "Tổng quan", icon: <HomeOutlined /> },
  { href: "/kho", label: "Kho", icon: <InboxOutlined /> },
  { href: "/kho/lich-su", label: "Chứng từ", icon: <FileTextOutlined /> },
];

const MORE: NavItem[] = [
  { href: "/nha-cung-cap", label: "Nhà cung cấp", icon: <ShopOutlined /> },
  { href: "/thanh-vien", label: "Thành viên", icon: <TeamOutlined /> },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/kho") return pathname === "/kho";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { shop } = useShop();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 border-r border-[#e9e0ce] bg-white p-4 md:block">
        <div className="mb-6 truncate text-lg font-semibold">{shop.name}</div>
        <nav className="space-y-1">
          {[...PRIMARY, ...MORE].map((item) => (
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

      <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-8">
        <div className="mb-3 truncate font-semibold md:hidden">{shop.name}</div>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-[#e9e0ce] bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {PRIMARY.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center py-2 text-xs ${isActive(pathname, item.href) ? "text-amber-800" : "text-stone-500"}`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
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

Nếu antd 6 báo prop `size="auto"` của Drawer không hợp lệ khi typecheck, thay bằng `height="auto"`. Xem `node_modules/antd/es/drawer/index.d.ts` để chọn đúng prop.

`src/app/(app)/layout.tsx` (thay toàn bộ):
```tsx
import { AuthGate } from "@/components/auth/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { ShopGate } from "@/components/shop/shop-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <ShopGate>
        <AppShell>{children}</AppShell>
      </ShopGate>
    </AuthGate>
  );
}
```

- [ ] **Step 2: Trang Tổng quan**

Kế hoạch này chỉ cần phần cảnh báo sắp hết hàng và các lối tắt. Doanh thu và lãi sẽ thêm ở Kế hoạch 2 và 3.

`src/app/(app)/page.tsx` (thay toàn bộ):
```tsx
"use client";

import { Button, Card, Empty, List, Tag } from "antd";
import Link from "next/link";
import { useProducts } from "@/hooks/use-shop-data";
import { PRODUCT_KIND_LABEL } from "@/lib/domain/models";
import { formatQty } from "@/lib/domain/money";

export default function DashboardPage() {
  const { data: products, loading } = useProducts();
  const lowStock = products.filter((p) => !p.archived && p.stockQty <= p.lowStockThreshold && p.lowStockThreshold > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Tổng quan</h1>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/kho/nhap"><Button block size="large">Nhập kho</Button></Link>
        <Link href="/kho/che-bien"><Button block size="large">Chế biến</Button></Link>
      </div>
      <Card title="Sắp hết hàng" loading={loading}>
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

- [ ] **Step 3: Trang Thành viên**

`src/app/(app)/thanh-vien/page.tsx`:
```tsx
"use client";

import { Button, Card, Form, Input, List, Popconfirm, Tag } from "antd";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useRunAction } from "@/components/common/use-run-action";
import { useShop } from "@/components/shop/shop-provider";
import { useInvites, useMembers } from "@/hooks/use-shop-data";
import { cancelInviteAction, inviteMemberAction, removeMemberAction } from "@/server/actions/shop";

export default function MembersPage() {
  const { shop } = useShop();
  const { user } = useAuth();
  const members = useMembers();
  const invites = useInvites();
  const run = useRunAction();
  const [form] = Form.useForm<{ email: string }>();
  const [inviting, setInviting] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Thành viên</h1>

      <Card title="Mời người nhà">
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            setInviting(true);
            const ok = await run(inviteMemberAction(shop.id, values), { success: "Đã gửi lời mời", form });
            setInviting(false);
            if (ok) form.resetFields();
          }}
        >
          <Form.Item
            name="email"
            label="Email Google của người được mời"
            extra="Người được mời chỉ cần đăng nhập Sổ Yến bằng đúng email này là tự vào cửa hàng."
            rules={[{ required: true, type: "email", message: "Nhập email hợp lệ" }]}
          >
            <Input inputMode="email" placeholder="ten@gmail.com" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={inviting}>Mời</Button>
        </Form>
      </Card>

      <Card title="Thành viên" loading={members.loading}>
        <List
          dataSource={members.data}
          renderItem={(m) => (
            <List.Item
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
            >
              <List.Item.Meta title={m.displayName} description={m.email} />
            </List.Item>
          )}
        />
      </Card>

      {invites.data.length > 0 && (
        <Card title="Lời mời đang chờ">
          <List
            dataSource={invites.data}
            renderItem={(i) => (
              <List.Item
                actions={[
                  <Button key="cancel" size="small" onClick={() => run(cancelInviteAction(shop.id, { email: i.email }), { success: "Đã hủy lời mời" })}>
                    Hủy
                  </Button>,
                ]}
              >
                {i.email}
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Kiểm tra trên trình duyệt**

Với emulator và `npm run dev` đang chạy, vào http://localhost:3000.
Expected:
- Ở kích thước điện thoại (DevTools, 375px) có thanh điều hướng dưới cùng, bấm "Thêm" thì mở drawer. Ở màn rộng có sidebar.
- Vào Thành viên, mời `em@example.com`, thấy mục "Lời mời đang chờ".
- Đăng xuất, đăng nhập bằng tài khoản Emulator mới có email `em@example.com`. Người này vào thẳng cửa hàng, không thấy màn "Tạo cửa hàng", và danh sách thành viên có 2 người.

Run: `npm run typecheck && npm run lint`
Expected: không lỗi.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): app shell, dashboard low-stock card, members page"
```

---

### Task 15: Trang Kho và form sản phẩm

**Files:**
- Create: `src/components/products/product-drawer.tsx`, `src/app/(app)/kho/page.tsx`

- [ ] **Step 1: Drawer tạo/sửa sản phẩm**

`src/components/products/product-drawer.tsx`:
```tsx
"use client";

import { Button, Drawer, Form, Input, InputNumber, Select, Switch } from "antd";
import { useEffect, useMemo, useState } from "react";
import { MoneyInput } from "@/components/common/money-input";
import { useRunAction } from "@/components/common/use-run-action";
import { useShop } from "@/components/shop/shop-provider";
import { newId } from "@/lib/domain/ids";
import {
  DEFAULT_TAX_GROUP,
  DEFAULT_UNIT,
  PRODUCT_KIND_LABEL,
  PRODUCT_KINDS,
  TAX_GROUP_LABEL,
  TAX_GROUPS,
  UNIT_LABEL,
  UNITS,
  type Product,
  type ProductKind,
} from "@/lib/domain/models";
import { createProductAction, updateProductAction } from "@/server/actions/inventory";

interface ProductDrawerProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}

type Values = Pick<Product, "name" | "kind" | "unit" | "suggestedPrice" | "lowStockThreshold" | "taxGroup" | "archived">;

export function ProductDrawer({ open, product, onClose }: ProductDrawerProps) {
  const { shop } = useShop();
  const run = useRunAction();
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);
  // ID mới mỗi lần mở drawer tạo sản phẩm; giữ nguyên khi bấm Lưu lại sau lỗi mạng.
  const draftId = useMemo(() => newId(), [open, product]);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (product) form.setFieldsValue(product);
  }, [form, open, product]);

  const onKindChange = (kind: ProductKind) => {
    form.setFieldsValue({ unit: DEFAULT_UNIT[kind], taxGroup: DEFAULT_TAX_GROUP[kind] });
  };

  return (
    <Drawer open={open} onClose={onClose} title={product ? "Sửa sản phẩm" : "Sản phẩm mới"} destroyOnHidden>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ kind: "raw", unit: "g", suggestedPrice: 0, lowStockThreshold: 0, taxGroup: "self_raw", archived: false }}
        onFinish={async (values) => {
          setSaving(true);
          const pending = product
            ? updateProductAction(shop.id, {
                id: product.id,
                name: values.name,
                suggestedPrice: values.suggestedPrice,
                lowStockThreshold: values.lowStockThreshold,
                taxGroup: values.taxGroup,
                archived: values.archived,
              })
            : createProductAction(shop.id, { ...values, id: draftId });
          const ok = await run(pending, { success: "Đã lưu sản phẩm", form });
          setSaving(false);
          if (ok) onClose();
        }}
      >
        <Form.Item name="name" label="Tên" rules={[{ required: true, message: "Nhập tên sản phẩm" }]}>
          <Input placeholder="VD: Yến tinh chế tổ đẹp" />
        </Form.Item>
        <Form.Item name="kind" label="Loại">
          <Select
            disabled={!!product}
            onChange={onKindChange}
            options={PRODUCT_KINDS.map((k) => ({ value: k, label: PRODUCT_KIND_LABEL[k] }))}
          />
        </Form.Item>
        <Form.Item name="unit" label="Đơn vị" extra={product ? "Không đổi được đơn vị sau khi tạo." : undefined}>
          <Select disabled={!!product} options={UNITS.map((u) => ({ value: u, label: UNIT_LABEL[u] }))} />
        </Form.Item>
        <Form.Item
          name="suggestedPrice"
          label="Giá bán gợi ý (cho 1 đơn vị)"
          rules={[{ required: true, type: "number", min: 0, message: "Nhập giá hợp lệ" }]}
        >
          <MoneyInput />
        </Form.Item>
        <Form.Item name="lowStockThreshold" label="Cảnh báo khi tồn còn" extra="Để 0 nếu không cần cảnh báo.">
          <InputNumber className="w-full!" min={0} precision={0} />
        </Form.Item>
        <Form.Item name="taxGroup" label="Nhóm thuế">
          <Select options={TAX_GROUPS.map((g) => ({ value: g, label: TAX_GROUP_LABEL[g] }))} />
        </Form.Item>
        {product && (
          <Form.Item name="archived" label="Ngừng sử dụng" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
        <Button type="primary" htmlType="submit" block loading={saving}>
          Lưu
        </Button>
      </Form>
    </Drawer>
  );
}
```

Nếu typecheck báo `destroyOnHidden` không tồn tại, xem `node_modules/antd/es/drawer/index.d.ts` và dùng prop tương ứng (`destroyOnClose` ở bản cũ).

- [ ] **Step 2: Trang Kho**

`src/app/(app)/kho/page.tsx`:
```tsx
"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Empty, List, Segmented, Tag } from "antd";
import Link from "next/link";
import { useState } from "react";
import { ProductDrawer } from "@/components/products/product-drawer";
import { useProducts } from "@/hooks/use-shop-data";
import { PRODUCT_KIND_LABEL, PRODUCT_KINDS, type Product, type ProductKind } from "@/lib/domain/models";
import { formatQty, formatVnd } from "@/lib/domain/money";

type Filter = ProductKind | "all" | "archived";

export default function InventoryPage() {
  const { data: products, loading } = useProducts();
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const shown = products.filter((p) =>
    filter === "archived" ? p.archived : !p.archived && (filter === "all" || p.kind === filter),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Kho</h1>
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            setDrawerOpen(true);
          }}
        >
          Sản phẩm
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Link href="/kho/nhap"><Button block>Nhập kho</Button></Link>
        <Link href="/kho/che-bien"><Button block>Chế biến</Button></Link>
        <Link href="/kho/dieu-chinh"><Button block>Điều chỉnh</Button></Link>
      </div>

      <div className="overflow-x-auto">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Tất cả" },
            ...PRODUCT_KINDS.map((k) => ({ value: k, label: PRODUCT_KIND_LABEL[k] })),
            { value: "archived", label: "Ngừng dùng" },
          ]}
        />
      </div>

      <Card loading={loading}>
        {shown.length === 0 ? (
          <Empty description="Chưa có sản phẩm. Bấm “+ Sản phẩm” để tạo." />
        ) : (
          <List
            dataSource={shown}
            renderItem={(p) => {
              const low = p.lowStockThreshold > 0 && p.stockQty <= p.lowStockThreshold;
              return (
                <List.Item
                  className="cursor-pointer"
                  onClick={() => {
                    setEditing(p);
                    setDrawerOpen(true);
                  }}
                  extra={
                    <div className="text-right">
                      <div className="font-semibold">{formatQty(p.stockQty, p.unit)}</div>
                      {low && <Tag color="warning" className="m-0!">Sắp hết</Tag>}
                    </div>
                  }
                >
                  <List.Item.Meta
                    title={p.name}
                    description={`${PRODUCT_KIND_LABEL[p.kind]} · giá vốn ${formatVnd(p.avgCost)}/${p.unit === "g" ? "g" : "cái"}`}
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>

      <ProductDrawer open={drawerOpen} product={editing} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 3: Kiểm tra trên trình duyệt**

Vào /kho và tạo các sản phẩm sau:
- "Yến thô nhà" (Yến thô, g)
- "Yến tinh tổ đẹp" (Yến tinh chế, g, cảnh báo khi còn 100)
- "Yến vụn" (Yến tinh chế, g)
- "Đường phèn gói" (Vật tư, cái)
- "Hũ 70ml" (Vật tư, cái)
- "Yến chưng 70ml" (Yến chưng, cái, giá gợi ý `45k`)
- "Vỏ hộp quà" (Vật tư, cái)
- "Hộp quà Tết" (Hộp quà, cái)

Expected:
- Ô giá nhận `45k` và hiển thị `45.000` khi rời ô.
- Đổi loại thì đơn vị và nhóm thuế tự đổi theo.
- Mở sản phẩm đã có thì không đổi được loại và đơn vị.
- Bộ lọc theo loại chạy đúng.
- Trên Tổng quan có "Yến tinh tổ đẹp" trong mục sắp hết (tồn 0 ≤ 100).

Run: `npm run typecheck && npm run lint`
Expected: không lỗi.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): inventory page with product create/edit drawer"
```

---

### Task 16: Trang Nhà cung cấp

**Files:**
- Create: `src/app/(app)/nha-cung-cap/page.tsx`

- [ ] **Step 1: Viết trang**

`src/app/(app)/nha-cung-cap/page.tsx`:
```tsx
"use client";

import { PlusOutlined } from "@ant-design/icons";
import { App, Button, Card, Drawer, Empty, Form, Input, List } from "antd";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useShop } from "@/components/shop/shop-provider";
import { useSuppliers } from "@/hooks/use-shop-data";
import type { Supplier } from "@/lib/domain/models";
import { saveSupplier, type SupplierValues } from "@/lib/firebase/suppliers";

export default function SuppliersPage() {
  const { shop } = useShop();
  const { user } = useAuth();
  const { message } = App.useApp();
  const { data: suppliers, loading } = useSuppliers();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<SupplierValues>();

  const openDrawer = (supplier: Supplier | null) => {
    setEditing(supplier);
    form.setFieldsValue({ name: supplier?.name ?? "", phone: supplier?.phone ?? "", note: supplier?.note ?? "" });
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nhà cung cấp</h1>
        <Button icon={<PlusOutlined />} onClick={() => openDrawer(null)}>Thêm</Button>
      </div>

      <Card loading={loading}>
        {suppliers.length === 0 ? (
          <Empty description="Chưa có nhà cung cấp" />
        ) : (
          <List
            dataSource={suppliers}
            renderItem={(s) => (
              <List.Item className="cursor-pointer" onClick={() => openDrawer(s)}>
                <List.Item.Meta title={s.name} description={[s.phone, s.note].filter(Boolean).join(" · ")} />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Drawer open={open} onClose={() => setOpen(false)} title={editing ? "Sửa nhà cung cấp" : "Nhà cung cấp mới"}>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (!user) return;
            setSaving(true);
            try {
              await saveSupplier(shop.id, user.uid, editing?.id ?? null, values);
              void message.success("Đã lưu");
              setOpen(false);
            } catch {
              void message.error("Không lưu được. Kiểm tra lại thông tin.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <Form.Item name="name" label="Tên" rules={[{ required: true, whitespace: true, max: 100, message: "Nhập tên" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ max: 20 }]}>
            <Input inputMode="tel" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú" rules={[{ max: 500 }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={saving}>Lưu</Button>
        </Form>
      </Drawer>
    </div>
  );
}
```

- [ ] **Step 2: Kiểm tra trên trình duyệt**

Vào /nha-cung-cap, tạo "Anh Ba Sóc Trăng" rồi sửa số điện thoại.
Expected: danh sách cập nhật ngay (realtime), không có lỗi permission trong console.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): suppliers page with direct client writes"
```

---

### Task 17: Form phiếu nhập

**Files:**
- Create: `src/components/inventory/product-select.tsx`, `src/app/(app)/kho/nhap/page.tsx`

- [ ] **Step 1: Ô chọn sản phẩm dùng chung**

`src/components/inventory/product-select.tsx`:
```tsx
"use client";

import { Select } from "antd";
import type { Product, ProductKind } from "@/lib/domain/models";
import { formatQty } from "@/lib/domain/money";

interface ProductSelectProps {
  products: Product[];
  kinds: ProductKind[];
  value?: string;
  onChange?: (id: string) => void;
}

/** Chỉ hiện sản phẩm đang dùng thuộc các loại cho phép, kèm số tồn. */
export function ProductSelect({ products, kinds, value, onChange }: ProductSelectProps) {
  const options = products
    .filter((p) => !p.archived && kinds.includes(p.kind))
    .map((p) => ({ value: p.id, label: `${p.name} · tồn ${formatQty(p.stockQty, p.unit)}` }));
  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Chọn sản phẩm"
      showSearch={{ optionFilterProp: "label" }}
      notFoundContent="Không có sản phẩm phù hợp. Tạo sản phẩm ở trang Kho."
    />
  );
}
```

Nếu typecheck báo `showSearch` chỉ nhận `boolean`, đổi thành `showSearch optionFilterProp="label"`.

- [ ] **Step 2: Trang phiếu nhập**

`src/app/(app)/kho/nhap/page.tsx`:
```tsx
"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, InputNumber, Segmented, Select } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/common/date-field";
import { MoneyInput } from "@/components/common/money-input";
import { useRunAction } from "@/components/common/use-run-action";
import { ProductSelect } from "@/components/inventory/product-select";
import { useShop } from "@/components/shop/shop-provider";
import { useProducts, useSuppliers } from "@/hooks/use-shop-data";
import { unitCostOf } from "@/lib/domain/costing";
import { todayVN } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { RECEIPT_ALLOWED_KINDS, RECEIPT_KIND_LABEL, RECEIPT_KINDS, type ReceiptKind } from "@/lib/domain/models";
import { formatVnd } from "@/lib/domain/money";
import { createReceiptAction } from "@/server/actions/inventory";

interface Values {
  kind: ReceiptKind;
  date: string;
  supplierId?: string;
  note?: string;
  lines: { productId?: string; qty?: number; totalCost?: number | null }[];
}

export default function ReceiptPage() {
  const { shop } = useShop();
  const router = useRouter();
  const run = useRunAction();
  const products = useProducts();
  const suppliers = useSuppliers();
  const [form] = Form.useForm<Values>();
  const [id] = useState(newId);
  const [saving, setSaving] = useState(false);
  const kind = Form.useWatch("kind", form) ?? "harvest";
  const lines = Form.useWatch("lines", form) ?? [];
  const total = lines.reduce((sum, l) => sum + (l?.totalCost ?? 0), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Nhập kho</h1>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ kind: "harvest", date: todayVN(), lines: [{}] }}
        onFinish={async (values) => {
          setSaving(true);
          const ok = await run(
            createReceiptAction(shop.id, {
              id,
              kind: values.kind,
              date: values.date,
              supplierId: values.kind === "purchase" ? (values.supplierId ?? null) : null,
              note: values.note ?? "",
              lines: values.lines.map((l) => ({
                productId: l.productId,
                qty: l.qty,
                totalCost: values.kind === "purchase" ? (l.totalCost ?? 0) : 0,
              })),
            }),
            { success: "Đã nhập kho", form },
          );
          setSaving(false);
          if (ok) router.push("/kho");
        }}
      >
        <Card>
          <Form.Item name="kind">
            <Segmented<ReceiptKind> block options={RECEIPT_KINDS.map((k) => ({ value: k, label: RECEIPT_KIND_LABEL[k] }))} />
          </Form.Item>
          <Form.Item name="date" label="Ngày">
            <DateField />
          </Form.Item>
          {kind === "purchase" && (
            <Form.Item name="supplierId" label="Nhà cung cấp">
              <Select
                allowClear
                placeholder="Chọn (không bắt buộc)"
                options={suppliers.data.map((s) => ({ value: s.id, label: s.name }))}
                showSearch={{ optionFilterProp: "label" }}
              />
            </Form.Item>
          )}
        </Card>

        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <div className="mt-4 space-y-3">
              {fields.map((field) => {
                const line = lines[field.name];
                const product = line?.productId ? products.byId.get(line.productId) : undefined;
                return (
                  <Card
                    key={field.key}
                    size="small"
                    extra={fields.length > 1 && <Button type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />}
                  >
                    <Form.Item name={[field.name, "productId"]} label="Sản phẩm" rules={[{ required: true, message: "Chọn sản phẩm" }]}>
                      <ProductSelect products={products.data} kinds={RECEIPT_ALLOWED_KINDS[kind]} />
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-3">
                      <Form.Item name={[field.name, "qty"]} label="Số lượng" rules={[{ required: true, message: "Nhập số lượng" }]}>
                        <InputNumber className="w-full!" min={1} precision={0} suffix={product?.unit === "piece" ? "cái" : "g"} />
                      </Form.Item>
                      {kind === "purchase" && (
                        <Form.Item
                          name={[field.name, "totalCost"]}
                          label="Thành tiền"
                          rules={[{ required: true, type: "number", min: 0, message: "Nhập số tiền" }]}
                          extra={line?.qty && line?.totalCost ? `≈ ${formatVnd(unitCostOf(line.totalCost, line.qty))}/${product?.unit === "piece" ? "cái" : "g"}` : undefined}
                        >
                          <MoneyInput />
                        </Form.Item>
                      )}
                    </div>
                  </Card>
                );
              })}
              <Button block icon={<PlusOutlined />} onClick={() => add({})}>Thêm dòng</Button>
            </div>
          )}
        </Form.List>

        <Card className="mt-4!">
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          {kind === "purchase" && <div className="mb-3 text-lg font-semibold">Tổng: {formatVnd(total)}</div>}
          <Button type="primary" htmlType="submit" size="large" block loading={saving}>Lưu phiếu nhập</Button>
        </Card>
      </Form>
    </div>
  );
}
```

- [ ] **Step 3: Kiểm tra trên trình duyệt**

1. Tạo phiếu **Mua hàng**: Yến thô nhà 1000g, thành tiền `30tr`, nhà cung cấp Anh Ba.
   Expected: dưới ô thành tiền hiện "≈ 30.000 ₫/g". Lưu xong chuyển về /kho, Yến thô nhà tồn 1.000g, giá vốn 30.000 ₫/g.
2. Tạo phiếu **Thu hoạch**: Yến thô nhà 500g.
   Expected: tồn 1.500g, giá vốn 20.000 ₫/g.
3. Bấm Lưu hai lần thật nhanh ở một phiếu mới.
   Expected: chỉ nhập một lần.

Run: `npm run typecheck && npm run lint`
Expected: không lỗi.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): stock receipt form (harvest/purchase)"
```

---

### Task 18: Form chế biến có xem trước giá vốn

**Files:**
- Create: `src/app/(app)/kho/che-bien/page.tsx`

- [ ] **Step 1: Viết trang**

`src/app/(app)/kho/che-bien/page.tsx`:
```tsx
"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Descriptions, Form, Input, InputNumber, Segmented } from "antd";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DateField } from "@/components/common/date-field";
import { useRunAction } from "@/components/common/use-run-action";
import { ProductSelect } from "@/components/inventory/product-select";
import { useShop } from "@/components/shop/shop-provider";
import { useProducts } from "@/hooks/use-shop-data";
import { todayVN } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import {
  PRODUCTION_INPUT_KINDS,
  PRODUCTION_KIND_LABEL,
  PRODUCTION_KINDS,
  PRODUCTION_OUTPUT_KIND,
  type ProductionKind,
} from "@/lib/domain/models";
import { formatQty, formatVnd } from "@/lib/domain/money";
import { computeProduction } from "@/lib/domain/production";
import { createProductionAction } from "@/server/actions/inventory";

interface Line {
  productId?: string;
  qty?: number;
  gramPerUnit?: number;
}

interface Values {
  kind: ProductionKind;
  date: string;
  note?: string;
  inputs: Line[];
  outputs: Line[];
}

export default function ProductionPage() {
  const { shop } = useShop();
  const router = useRouter();
  const run = useRunAction();
  const products = useProducts();
  const [form] = Form.useForm<Values>();
  const [id] = useState(newId);
  const [saving, setSaving] = useState(false);
  const kind = Form.useWatch("kind", form) ?? "clean";
  const inputs = Form.useWatch("inputs", form);
  const outputs = Form.useWatch("outputs", form);

  const preview = useMemo(() => {
    const ins = (inputs ?? []).flatMap((l) => {
      const p = l?.productId ? products.byId.get(l.productId) : undefined;
      return p && l.qty ? [{ qty: l.qty, totalCost: l.qty * p.avgCost, unit: p.unit, product: p }] : [];
    });
    const outs = (outputs ?? []).flatMap((l) => {
      const p = l?.productId ? products.byId.get(l.productId) : undefined;
      return p && l.qty ? [{ qty: l.qty, unit: p.unit, gramPerUnit: p.unit === "g" ? 1 : (l.gramPerUnit ?? 0), product: p }] : [];
    });
    if (!ins.length || !outs.length || outs.some((o) => o.gramPerUnit < 1)) return null;
    return { ins, outs, result: computeProduction(kind, ins, outs) };
  }, [inputs, kind, outputs, products.byId]);

  const shortages = preview?.ins.filter((i) => i.qty > i.product.stockQty) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Chế biến</h1>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ kind: "clean", date: todayVN(), inputs: [{}], outputs: [{}] }}
        onValuesChange={(changed: Partial<Values>) => {
          if (changed.kind) form.setFieldsValue({ inputs: [{}], outputs: [{}] });
        }}
        onFinish={async (values) => {
          setSaving(true);
          const ok = await run(
            createProductionAction(shop.id, {
              id,
              kind: values.kind,
              date: values.date,
              note: values.note ?? "",
              inputs: values.inputs.map((l) => ({ productId: l.productId, qty: l.qty })),
              outputs: values.outputs.map((l) => {
                const unit = l.productId ? products.byId.get(l.productId)?.unit : undefined;
                return { productId: l.productId, qty: l.qty, gramPerUnit: unit === "g" ? 1 : l.gramPerUnit };
              }),
            }),
            { success: "Đã lưu phiếu chế biến", form },
          );
          setSaving(false);
          if (ok) router.push("/kho");
        }}
      >
        <Card>
          <Form.Item name="kind">
            <Segmented<ProductionKind> block options={PRODUCTION_KINDS.map((k) => ({ value: k, label: PRODUCTION_KIND_LABEL[k] }))} />
          </Form.Item>
          <Form.Item name="date" label="Ngày">
            <DateField />
          </Form.Item>
        </Card>

        <LineList title="Nguyên liệu đầu vào" name="inputs" kinds={PRODUCTION_INPUT_KINDS[kind]} products={products} lines={inputs} />
        <LineList title="Thành phẩm đầu ra" name="outputs" kinds={[PRODUCTION_OUTPUT_KIND[kind]]} products={products} lines={outputs} isOutput />

        {preview && (
          <Card title="Xem trước" className="mt-4!">
            {shortages.map((s) => (
              <Alert
                key={s.product.id}
                className="mb-3!"
                type="error"
                showIcon
                title={`${s.product.name} chỉ còn ${formatQty(s.product.stockQty, s.product.unit)}`}
              />
            ))}
            {kind === "clean" && preview.result.lossQty < 0 && (
              <Alert className="mb-3!" type="error" showIcon title="Khối lượng sau làm sạch lớn hơn trước khi làm sạch." />
            )}
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Tổng giá vốn đầu vào">{formatVnd(preview.result.totalInputCost)}</Descriptions.Item>
              {kind === "clean" && (
                <Descriptions.Item label="Hao hụt">
                  {formatQty(preview.result.lossQty, "g")} ({(preview.result.lossRate * 100).toFixed(1)}%)
                </Descriptions.Item>
              )}
              {preview.outs.map((o, i) => (
                <Descriptions.Item key={o.product.id} label={o.product.name}>
                  {formatVnd(preview.result.unitCosts[i])}/{o.unit === "g" ? "g" : "cái"} · tổng {formatVnd(preview.result.outputCosts[i])}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        )}

        <Card className="mt-4!">
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={saving} disabled={shortages.length > 0}>
            Lưu phiếu chế biến
          </Button>
        </Card>
      </Form>
    </div>
  );
}

function LineList({
  title,
  name,
  kinds,
  products,
  lines,
  isOutput = false,
}: {
  title: string;
  name: "inputs" | "outputs";
  kinds: Parameters<typeof ProductSelect>[0]["kinds"];
  products: ReturnType<typeof useProducts>;
  lines: Line[] | undefined;
  isOutput?: boolean;
}) {
  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <Card title={title} className="mt-4!">
          <div className="space-y-3">
            {fields.map((field) => {
              const line = lines?.[field.name];
              const product = line?.productId ? products.byId.get(line.productId) : undefined;
              const unitLabel = product?.unit === "piece" ? "cái" : "g";
              return (
                <div key={field.key} className="rounded-xl border border-[#e9e0ce] p-3">
                  <div className="flex gap-2">
                    <Form.Item className="flex-1" name={[field.name, "productId"]} rules={[{ required: true, message: "Chọn sản phẩm" }]}>
                      <ProductSelect products={products.data} kinds={kinds} />
                    </Form.Item>
                    {fields.length > 1 && <Button type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Form.Item name={[field.name, "qty"]} label="Số lượng" rules={[{ required: true, message: "Nhập số lượng" }]}>
                      <InputNumber className="w-full!" min={1} precision={0} suffix={unitLabel} />
                    </Form.Item>
                    {isOutput && product?.unit === "piece" && (
                      <Form.Item
                        name={[field.name, "gramPerUnit"]}
                        label="Gram yến mỗi cái"
                        rules={[{ required: true, message: "Nhập số gram" }]}
                      >
                        <InputNumber className="w-full!" min={1} precision={0} suffix="g" />
                      </Form.Item>
                    )}
                  </div>
                </div>
              );
            })}
            <Button block icon={<PlusOutlined />} onClick={() => add({})}>Thêm dòng</Button>
          </div>
        </Card>
      )}
    </Form.List>
  );
}
```

- [ ] **Step 2: Kiểm tra trên trình duyệt**

Từ dữ liệu ở Task 17 (Yến thô 1.500g, giá vốn 20.000 ₫/g). Trước tiên nhập mua 100 Đường phèn gói giá `200k` và 100 Hũ 70ml giá `500k`.

1. **Làm sạch**: đầu vào Yến thô 1000g; đầu ra Yến tinh tổ đẹp 700g và Yến vụn 100g.
   Expected: xem trước hiện tổng 20.000.000 ₫, hao hụt 200g (20,0%), mỗi loại 25.000 ₫/g. Lưu xong tồn thô 500g, tổ đẹp 700g, vụn 100g.
2. **Chưng**: Yến tinh tổ đẹp 100g + Đường phèn 10 + Hũ 10 → Yến chưng 70ml 10 cái, 10g mỗi cái.
   Expected: mỗi hũ có giá vốn (2.500.000 + 20.000 + 50.000) / 10 = 257.000 ₫.
3. Nhập đầu vào 5000g yến thô.
   Expected: có cảnh báo đỏ và nút Lưu bị khóa.
4. Đổi kiểu chế biến.
   Expected: danh sách dòng được làm trống và chỉ hiện các loại sản phẩm phù hợp.

Run: `npm run typecheck && npm run lint`
Expected: không lỗi.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): production form with live cost and loss preview"
```

---

### Task 19: Form điều chỉnh kho và trang Chứng từ (có hủy)

**Files:**
- Create: `src/app/(app)/kho/dieu-chinh/page.tsx`, `src/app/(app)/kho/lich-su/page.tsx`

- [ ] **Step 1: Trang điều chỉnh**

`src/app/(app)/kho/dieu-chinh/page.tsx`:
```tsx
"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, InputNumber } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateField } from "@/components/common/date-field";
import { useRunAction } from "@/components/common/use-run-action";
import { ProductSelect } from "@/components/inventory/product-select";
import { useShop } from "@/components/shop/shop-provider";
import { useProducts } from "@/hooks/use-shop-data";
import { todayVN } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { PRODUCT_KINDS } from "@/lib/domain/models";
import { createAdjustmentAction } from "@/server/actions/inventory";

interface Values {
  date: string;
  reason: string;
  lines: { productId?: string; qtyDelta?: number }[];
}

export default function AdjustmentPage() {
  const { shop } = useShop();
  const router = useRouter();
  const run = useRunAction();
  const products = useProducts();
  const [form] = Form.useForm<Values>();
  const [id] = useState(newId);
  const [saving, setSaving] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Điều chỉnh kho</h1>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ date: todayVN(), lines: [{}] }}
        onFinish={async (values) => {
          setSaving(true);
          const ok = await run(createAdjustmentAction(shop.id, { id, ...values }), { success: "Đã điều chỉnh kho", form });
          setSaving(false);
          if (ok) router.push("/kho");
        }}
      >
        <Card>
          <Form.Item name="date" label="Ngày">
            <DateField />
          </Form.Item>
          <Form.Item name="reason" label="Lý do" rules={[{ required: true, whitespace: true, message: "Nhập lý do" }]}>
            <Input placeholder="VD: Kiểm kho cuối tháng thiếu" />
          </Form.Item>
        </Card>
        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <Card title="Sản phẩm" className="mt-4!" extra={<span className="text-xs text-stone-500">Số âm là giảm kho</span>}>
              <div className="space-y-3">
                {fields.map((field) => (
                  <div key={field.key} className="flex gap-2">
                    <Form.Item className="flex-1" name={[field.name, "productId"]} rules={[{ required: true, message: "Chọn sản phẩm" }]}>
                      <ProductSelect products={products.data} kinds={[...PRODUCT_KINDS]} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "qtyDelta"]}
                      rules={[{ required: true, message: "Nhập số" }, { validator: async (_, v) => { if (v === 0) throw new Error("Khác 0"); } }]}
                    >
                      <InputNumber className="w-28!" precision={0} placeholder="-20" />
                    </Form.Item>
                    {fields.length > 1 && <Button type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />}
                  </div>
                ))}
                <Button block icon={<PlusOutlined />} onClick={() => add({})}>Thêm dòng</Button>
              </div>
            </Card>
          )}
        </Form.List>
        <Button className="mt-4!" type="primary" htmlType="submit" size="large" block loading={saving}>
          Lưu điều chỉnh
        </Button>
      </Form>
    </div>
  );
}
```

- [ ] **Step 2: Trang chứng từ**

`src/app/(app)/kho/lich-su/page.tsx`:
```tsx
"use client";

import { Button, Card, Empty, Input, List, Modal, Tabs, Tag } from "antd";
import { useState } from "react";
import { useRunAction } from "@/components/common/use-run-action";
import { useShop } from "@/components/shop/shop-provider";
import { useProducts, useRecentDocs, useSuppliers } from "@/hooks/use-shop-data";
import type { ActionResult } from "@/lib/domain/errors";
import { formatDate } from "@/lib/domain/dates";
import { PRODUCTION_KIND_LABEL, RECEIPT_KIND_LABEL, type DocStatus } from "@/lib/domain/models";
import { formatQty, formatVnd } from "@/lib/domain/money";
import { voidAdjustmentAction, voidProductionAction, voidReceiptAction } from "@/server/actions/inventory";

type VoidFn = (shopId: string, input: unknown) => Promise<ActionResult<{ id: string }>>;

interface Row {
  id: string;
  title: string;
  date: string;
  status: DocStatus;
  lines: string[];
  amount?: string;
  voidReason?: string;
}

export default function DocumentsPage() {
  const { shop } = useShop();
  const run = useRunAction();
  const products = useProducts();
  const suppliers = useSuppliers();
  const receipts = useRecentDocs("receipts");
  const productions = useRecentDocs("productions");
  const adjustments = useRecentDocs("adjustments");
  const [voiding, setVoiding] = useState<{ id: string; fn: VoidFn } | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const describe = (productId: string, qty: number) => {
    const p = products.byId.get(productId);
    return p ? `${p.name} ${formatQty(qty, p.unit)}` : `(đã xóa) ${qty}`;
  };

  const receiptRows: Row[] = receipts.data.map((r) => ({
    id: r.id,
    title: `${RECEIPT_KIND_LABEL[r.kind]}${r.supplierId ? ` · ${suppliers.byId.get(r.supplierId)?.name ?? ""}` : ""}`,
    date: r.date,
    status: r.status,
    lines: r.lines.map((l) => describe(l.productId, l.qty)),
    amount: r.kind === "purchase" ? formatVnd(r.total) : undefined,
    voidReason: r.voidReason,
  }));
  const productionRows: Row[] = productions.data.map((p) => ({
    id: p.id,
    title: `${PRODUCTION_KIND_LABEL[p.kind]}${p.kind === "clean" ? ` · hao hụt ${(p.lossRate * 100).toFixed(1)}%` : ""}`,
    date: p.date,
    status: p.status,
    lines: [
      ...p.inputs.map((l) => `− ${describe(l.productId, l.qty)}`),
      ...p.outputs.map((l) => `+ ${describe(l.productId, l.qty)}`),
    ],
    amount: formatVnd(p.totalCost),
    voidReason: p.voidReason,
  }));
  const adjustmentRows: Row[] = adjustments.data.map((a) => ({
    id: a.id,
    title: `Điều chỉnh · ${a.reason}`,
    date: a.date,
    status: a.status,
    lines: a.lines.map((l) => `${l.qtyDelta > 0 ? "+" : "−"} ${describe(l.productId, Math.abs(l.qtyDelta))}`),
    voidReason: a.voidReason,
  }));

  const renderList = (rows: Row[], loading: boolean, fn: VoidFn) => (
    <Card loading={loading}>
      {rows.length === 0 ? (
        <Empty description="Chưa có chứng từ" />
      ) : (
        <List
          dataSource={rows}
          renderItem={(row) => (
            <List.Item
              actions={
                row.status === "active"
                  ? [<Button key="void" danger size="small" onClick={() => { setReason(""); setVoiding({ id: row.id, fn }); }}>Hủy</Button>]
                  : [<Tag key="voided">Đã hủy</Tag>]
              }
            >
              <List.Item.Meta
                title={<span className={row.status === "voided" ? "line-through opacity-60" : ""}>{row.title}</span>}
                description={
                  <div className="space-y-0.5">
                    <div>{formatDate(row.date)}{row.amount ? ` · ${row.amount}` : ""}</div>
                    {row.lines.map((line, i) => <div key={i}>{line}</div>)}
                    {row.voidReason && <div className="text-red-500">Lý do hủy: {row.voidReason}</div>}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Chứng từ kho</h1>
      <Tabs
        items={[
          { key: "receipts", label: "Nhập kho", children: renderList(receiptRows, receipts.loading, voidReceiptAction) },
          { key: "productions", label: "Chế biến", children: renderList(productionRows, productions.loading, voidProductionAction) },
          { key: "adjustments", label: "Điều chỉnh", children: renderList(adjustmentRows, adjustments.loading, voidAdjustmentAction) },
        ]}
      />
      <Modal
        open={!!voiding}
        title="Hủy chứng từ"
        okText="Hủy chứng từ"
        okButtonProps={{ danger: true, disabled: !reason.trim(), loading: submitting }}
        cancelText="Đóng"
        onCancel={() => setVoiding(null)}
        onOk={async () => {
          if (!voiding) return;
          setSubmitting(true);
          const ok = await run(voiding.fn(shop.id, { id: voiding.id, reason }), { success: "Đã hủy chứng từ" });
          setSubmitting(false);
          if (ok) setVoiding(null);
        }}
      >
        <p className="mb-2">Kho sẽ được trả lại như trước khi có chứng từ này. Chứng từ vẫn được giữ trong lịch sử.</p>
        <Input.TextArea rows={3} placeholder="Lý do hủy" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Kiểm tra trên trình duyệt**

1. Điều chỉnh: Yến vụn −10, lý do "Rơi vãi". Expected: tồn vụn còn 90g.
2. Vào Chứng từ → Điều chỉnh, hủy phiếu vừa tạo. Expected: tồn vụn lại 100g, phiếu hiện gạch ngang kèm "Đã hủy" và lý do.
3. Chứng từ → Chế biến, hủy phiếu **làm sạch**. Expected: lỗi "Không thể hủy: Yến tinh tổ đẹp chỉ còn 600g, không đủ 700g...", vì 100g đã dùng để chưng.
4. Hủy phiếu **chưng** trước, rồi hủy phiếu **làm sạch**. Expected: cả hai thành công, Yến thô trở lại 1.500g với giá vốn 20.000 ₫/g.

Run: `npm run typecheck && npm run lint`
Expected: không lỗi.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): stock adjustments and document history with void"
```

---

### Task 20: README và kiểm tra tổng thể

**Files:**
- Create: `README.md`

- [ ] **Step 1: Viết README**

`README.md`:
````markdown
# Sổ Yến

Sổ sách kho, chế biến, bán hàng và thuế cho hộ kinh doanh yến sào.
Next.js 16 App Router, Ant Design, Tailwind CSS, Firebase Auth và Cloud Firestore.

## Chạy khi phát triển (Emulator, không cần Firebase thật)

Yêu cầu Node.js ≥ 20.9 và Java ≥ 11.

```bash
npm ci
cp .env.example .env.local
npm run emulators   # terminal 1: Auth + Firestore emulator, UI ở http://localhost:4000
npm run dev         # terminal 2: http://localhost:3000
```

## Kiểm thử

```bash
npm test               # unit test cho domain (không cần emulator)
npm run test:emulator  # test service + security rules trên emulator
npm run typecheck
npm run lint
```

## Kiến trúc

- `src/lib/domain/`: hàm thuần (giá vốn bình quân, chế biến, tiền, schema).
- `src/server/services/`: nghiệp vụ, mỗi nghiệp vụ là một Firestore transaction.
- `src/server/actions/`: Server Actions; xác thực bằng session cookie rồi gọi service.
- Client chỉ **đọc** Firestore realtime. Ghi kho và chứng từ chỉ đi qua server.
  Riêng nhà cung cấp do client ghi trực tiếp, có `firestore.rules` kiểm tra.

## Đưa lên production

1. Tạo Firebase project, bật Authentication → Google, tạo Firestore (Native mode).
2. Điền cấu hình Web App vào biến môi trường. Bỏ các biến `*_EMULATOR_HOST`
   và `NEXT_PUBLIC_USE_EMULATORS`.
3. Tạo service account key (Project settings → Service accounts) và đặt nội dung JSON
   một dòng vào `FIREBASE_SERVICE_ACCOUNT` trên Vercel.
4. Triển khai rules và indexes sau khi đã chạy `npm run test:emulator`:
   `npx -y firebase-tools@latest deploy --only firestore --project <project-id>`
````

- [ ] **Step 2: Chạy toàn bộ kiểm tra**

Run: `npm test && npm run test:emulator && npm run typecheck && npm run lint && npm run build`
Expected: tất cả PASS và build thành công.

- [ ] **Step 3: Đi hết luồng trên trình duyệt ở kích thước điện thoại**

Xóa dữ liệu emulator (khởi động lại `npm run emulators`), rồi ở viewport 375px:
1. Đăng nhập, tạo cửa hàng, tạo các sản phẩm như ở Task 15.
2. Mua yến thô, thu hoạch, mua vật tư (đường phèn, hũ, vỏ hộp quà).
3. Làm sạch, rồi chưng.
4. Đóng hộp: Yến chưng 70ml 2 cái + Vỏ hộp quà 1 cái → Hộp quà Tết 1 cái, 20g mỗi cái.
5. Điều chỉnh kho, hủy một chứng từ.
6. Mời thành viên và đăng nhập bằng tài khoản thứ hai.

Expected: số tồn và giá vốn ở trang Kho khớp với phép tính tay ở mỗi bước, không có lỗi trong console, không có thanh cuộn ngang.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: README with dev, test and deploy instructions"
```
