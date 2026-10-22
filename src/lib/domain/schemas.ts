import { z } from "zod";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  PRODUCT_KINDS,
  PRODUCTION_KINDS,
  RECEIPT_KINDS,
  SALE_CHANNELS,
  TAX_GROUPS,
  UNITS,
} from "@/lib/domain/models";
import { BANK_BINS } from "@/lib/domain/vietqr";

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
  gramPerUnit: z
    .number()
    .int("Phải là số nguyên")
    .positive("Phải lớn hơn 0")
    .max(100_000)
    .nullable()
    .default(null),
});

export const productUpdateInput = productInput
  .pick({ id: true, name: true, suggestedPrice: true, lowStockThreshold: true, taxGroup: true, gramPerUnit: true })
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

const positiveMoney = z
  .number("Nhập số tiền")
  .int("Số tiền phải là số nguyên")
  .positive("Số tiền phải lớn hơn 0")
  .max(100_000_000_000, "Số tiền quá lớn");

export const paymentInput = z.object({
  id,
  customerId: id,
  saleId: id.nullable().default(null),
  date,
  amount: positiveMoney,
  method: z.enum(PAYMENT_METHODS),
  note,
});

export const expenseInput = z.object({
  id,
  date,
  category: z.enum(EXPENSE_CATEGORIES),
  amount: positiveMoney,
  note,
});

const percent = z
  .number("Nhập tỷ lệ")
  .min(0, "Tỷ lệ không được âm")
  .max(100, "Tỷ lệ tối đa 100%")
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "Tối đa 2 chữ số thập phân");

export const taxConfigInput = z
  .object({
    exemptThreshold: money.refine((n) => n > 0, "Mốc phải lớn hơn 0"),
    invoiceThreshold: money.refine((n) => n > 0, "Mốc phải lớn hơn 0"),
    pitOnExcessOnly: z.boolean(),
    rates: z.object(
      Object.fromEntries(TAX_GROUPS.map((g) => [g, z.object({ vat: percent, pit: percent })])) as Record<
        (typeof TAX_GROUPS)[number],
        z.ZodObject<{ vat: typeof percent; pit: typeof percent }>
      >,
    ),
  })
  .refine((c) => c.invoiceThreshold > c.exemptThreshold, {
    message: "Mốc thứ hai phải lớn hơn mốc miễn thuế",
    path: ["invoiceThreshold"],
  });

export const bankAccountInput = z.object({
  bankBin: z.enum(BANK_BINS, "Chọn ngân hàng"),
  accountNo: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z]{4,19}$/, "Số tài khoản chỉ gồm chữ số hoặc chữ, từ 4 đến 19 ký tự"),
  accountName: z
    .string()
    .trim()
    .min(1, "Nhập tên chủ tài khoản")
    .max(50, "Tên tối đa 50 ký tự")
    .transform((v) => v.toUpperCase()),
});
