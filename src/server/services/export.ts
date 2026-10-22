import ExcelJS from "exceljs";
import type { Firestore } from "firebase-admin/firestore";
import { z } from "zod";
import { formatDate } from "@/lib/domain/dates";
import {
  EXPENSE_CATEGORY_LABEL,
  RECEIPT_KIND_LABEL,
  SALE_CHANNEL_LABEL,
  TAX_GROUP_LABEL,
  TAX_GROUPS,
  type Customer,
  type ExpenseDoc,
  type Product,
  type ReceiptDoc,
  type SaleDoc,
  type Supplier,
  type TaxGroup,
} from "@/lib/domain/models";
import { shopRef } from "@/server/services/membership";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ");

export const exportInput = z
  .object({ from: date, to: date })
  .refine((r) => r.from <= r.to, { message: "Ngày bắt đầu phải trước ngày kết thúc", path: ["to"] });

export interface ExportData {
  shopName: string;
  from: string;
  to: string;
  sales: SaleDoc[];
  expenses: ExpenseDoc[];
  receipts: ReceiptDoc[];
  products: Map<string, Product>;
  customers: Map<string, Customer>;
  suppliers: Map<string, Supplier>;
}

async function inRange<T>(db: Firestore, shopId: string, name: string, from: string, to: string): Promise<T[]> {
  const snap = await shopRef(db, shopId).collection(name).where("date", ">=", from).where("date", "<=", to).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as T & { date: string; id: string })
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

async function byId<T>(db: Firestore, shopId: string, name: string): Promise<Map<string, T>> {
  const snap = await shopRef(db, shopId).collection(name).get();
  return new Map(snap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as T]));
}

export async function loadExportData(db: Firestore, shopId: string, input: unknown): Promise<ExportData> {
  const { from, to } = exportInput.parse(input);
  const [shop, sales, expenses, receipts, products, customers, suppliers] = await Promise.all([
    shopRef(db, shopId).get(),
    inRange<SaleDoc>(db, shopId, "sales", from, to),
    inRange<ExpenseDoc>(db, shopId, "expenses", from, to),
    inRange<ReceiptDoc>(db, shopId, "receipts", from, to),
    byId<Product>(db, shopId, "products"),
    byId<Customer>(db, shopId, "customers"),
    byId<Supplier>(db, shopId, "suppliers"),
  ]);
  return { shopName: shop.get("name") as string, from, to, sales, expenses, receipts, products, customers, suppliers };
}

const MONEY = "#,##0";
const bold = { bold: true };

function header(sheet: ExcelJS.Worksheet, columns: { header: string; width: number; money?: boolean }[]) {
  sheet.columns = columns.map((c) => ({ header: c.header, width: c.width, style: c.money ? { numFmt: MONEY } : {} }));
  sheet.getRow(1).font = bold;
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

const statusLabel = (status: string) => (status === "voided" ? "Đã hủy" : "");

/** Sổ chi tiết doanh thu theo mẫu S1-HKD, cùng danh sách đơn bán, chi phí, nhập kho trong kỳ. */
export async function buildWorkbook(data: ExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sổ Yến";
  const productName = (id: string) => data.products.get(id)?.name ?? id;
  const activeSales = data.sales.filter((s) => s.status === "active");

  // Sổ doanh thu: tiêu đề theo mẫu, mỗi đơn một dòng, doanh thu chia theo nhóm ngành.
  const s1 = wb.addWorksheet("Sổ doanh thu S1-HKD");
  s1.columns = [
    { width: 12 },
    { width: 16 },
    { width: 12 },
    { width: 44 },
    ...TAX_GROUPS.map(() => ({ width: 18, style: { numFmt: MONEY } })),
    { width: 18, style: { numFmt: MONEY } },
    { width: 20 },
  ];
  const lastCol = 5 + TAX_GROUPS.length;
  s1.addRow([`HỘ, CÁ NHÂN KINH DOANH: ${data.shopName}`]).font = bold;
  s1.addRow(["Mẫu số S1-HKD"]);
  const title = s1.addRow(["SỔ CHI TIẾT DOANH THU BÁN HÀNG HÓA, DỊCH VỤ"]);
  title.font = { bold: true, size: 14 };
  s1.mergeCells(title.number, 1, title.number, lastCol + 1);
  title.alignment = { horizontal: "center" };
  const period = s1.addRow([`Từ ngày ${formatDate(data.from)} đến ngày ${formatDate(data.to)}`]);
  s1.mergeCells(period.number, 1, period.number, lastCol + 1);
  period.alignment = { horizontal: "center" };
  s1.addRow([]);
  const h1 = s1.addRow([
    "Ngày ghi sổ",
    "Chứng từ",
    "",
    "Diễn giải",
    "Doanh thu bán hàng hóa, dịch vụ chia theo nhóm",
    ...TAX_GROUPS.slice(1).map(() => ""),
    "",
    "Ghi chú",
  ]);
  const h2 = s1.addRow(["", "Số hiệu", "Ngày", "", ...TAX_GROUPS.map((g) => TAX_GROUP_LABEL[g]), "Tổng cộng", ""]);
  s1.mergeCells(h1.number, 1, h2.number, 1);
  s1.mergeCells(h1.number, 2, h1.number, 3);
  s1.mergeCells(h1.number, 4, h2.number, 4);
  s1.mergeCells(h1.number, 5, h1.number, lastCol);
  s1.mergeCells(h1.number, lastCol + 1, h2.number, lastCol + 1);
  for (const row of [h1, h2]) {
    row.font = bold;
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }
  const totals: Record<TaxGroup, number> = { self_raw: 0, resale: 0, processed: 0 };
  for (const sale of activeSales) {
    const byGroup: Record<TaxGroup, number> = { self_raw: 0, resale: 0, processed: 0 };
    for (const line of sale.lines) byGroup[line.taxGroup] += line.revenue;
    for (const g of TAX_GROUPS) totals[g] += byGroup[g];
    const customer = sale.customerId ? data.customers.get(sale.customerId)?.name : "Khách lẻ";
    s1.addRow([
      formatDate(sale.date),
      sale.code,
      formatDate(sale.date),
      `Bán hàng cho ${customer ?? ""}: ${sale.lines.map((l) => productName(l.productId)).join(", ")}`,
      ...TAX_GROUPS.map((g) => byGroup[g] || null),
      sale.total,
      sale.note || "",
    ]);
  }
  const sum = s1.addRow(["", "", "", "Tổng cộng", ...TAX_GROUPS.map((g) => totals[g]), activeSales.reduce((x, s) => x + s.total, 0), ""]);
  sum.font = bold;
  s1.addRow([]);
  s1.addRow([
    "Ghi chú: mẫu tham khảo theo S1-HKD (Thông tư 88/2021/TT-BTC). Hãy kiểm tra mẫu sổ hiện hành với cơ quan thuế.",
  ]).font = { italic: true };

  const salesSheet = wb.addWorksheet("Đơn bán");
  header(salesSheet, [
    { header: "Mã đơn", width: 14 },
    { header: "Ngày", width: 12 },
    { header: "Khách hàng", width: 22 },
    { header: "Kênh", width: 14 },
    { header: "Sản phẩm", width: 40 },
    { header: "Tạm tính", width: 14, money: true },
    { header: "Giảm giá", width: 12, money: true },
    { header: "Tổng", width: 14, money: true },
    { header: "Đã trả", width: 14, money: true },
    { header: "Còn nợ", width: 14, money: true },
    { header: "Giá vốn", width: 14, money: true },
    { header: "Lãi gộp", width: 14, money: true },
    { header: "Trạng thái", width: 10 },
  ]);
  for (const s of data.sales) {
    const cogs = s.lines.reduce((x, l) => x + l.totalCost, 0);
    salesSheet.addRow([
      s.code,
      formatDate(s.date),
      s.customerId ? (data.customers.get(s.customerId)?.name ?? "") : "Khách lẻ",
      SALE_CHANNEL_LABEL[s.channel],
      s.lines.map((l) => `${productName(l.productId)} × ${l.qty}`).join("; "),
      s.subtotal,
      s.discount,
      s.total,
      s.paid,
      s.debt,
      cogs,
      s.total - cogs,
      statusLabel(s.status),
    ]);
  }

  const expenseSheet = wb.addWorksheet("Chi phí");
  header(expenseSheet, [
    { header: "Ngày", width: 12 },
    { header: "Danh mục", width: 16 },
    { header: "Số tiền", width: 14, money: true },
    { header: "Ghi chú", width: 40 },
    { header: "Trạng thái", width: 10 },
  ]);
  for (const e of data.expenses) {
    expenseSheet.addRow([formatDate(e.date), EXPENSE_CATEGORY_LABEL[e.category], e.amount, e.note, statusLabel(e.status)]);
  }

  const receiptSheet = wb.addWorksheet("Nhập kho");
  header(receiptSheet, [
    { header: "Ngày", width: 12 },
    { header: "Loại", width: 18 },
    { header: "Nhà cung cấp", width: 22 },
    { header: "Sản phẩm", width: 28 },
    { header: "Số lượng", width: 12 },
    { header: "Thành tiền", width: 14, money: true },
    { header: "Trạng thái", width: 10 },
  ]);
  for (const r of data.receipts) {
    const supplier = r.supplierId ? (data.suppliers.get(r.supplierId)?.name ?? "") : "";
    for (const line of r.lines) {
      const p = data.products.get(line.productId);
      receiptSheet.addRow([
        formatDate(r.date),
        RECEIPT_KIND_LABEL[r.kind],
        supplier,
        p?.name ?? line.productId,
        `${line.qty} ${p?.unit === "g" ? "g" : "cái"}`,
        line.totalCost,
        statusLabel(r.status),
      ]);
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
