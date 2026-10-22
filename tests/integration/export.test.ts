import ExcelJS from "exceljs";
import { beforeEach, describe, expect, test } from "vitest";
import { createExpense } from "@/server/services/expenses";
import { createPayment } from "@/server/services/payments";
import { createProduction } from "@/server/services/productions";
import { buildWorkbook, loadExportData } from "@/server/services/export";
import { createSale, voidSale } from "@/server/services/sales";
import { C, db, owner, P, SHOP_ID } from "./helpers";
import { baseSale, S1, S2, seedSalesData } from "./sales-fixtures";

beforeEach(seedSalesData);

async function readBack(buffer: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb;
}

describe("export", () => {
  test("chỉ lấy chứng từ trong kỳ; sổ S1 bỏ đơn đã hủy", async () => {
    await createSale(db(), SHOP_ID, owner, baseSale);
    await createSale(db(), SHOP_ID, owner, { ...baseSale, id: S2, paid: 5_000_000 });
    await voidSale(db(), SHOP_ID, owner, { id: S2, reason: "Khách hủy" });
    await createSale(db(), SHOP_ID, owner, { ...baseSale, id: "sale_00000009", date: "2026-11-02", paid: 5_000_000 });
    await createExpense(db(), SHOP_ID, owner, { id: "exp_000000001", date: "2026-10-05", category: "ads", amount: 300_000 });

    const data = await loadExportData(db(), SHOP_ID, { from: "2026-10-01", to: "2026-10-31" });
    expect(data.sales.map((s) => s.id)).toEqual([S1, S2]);
    expect(data.expenses).toHaveLength(1);

    const wb = await readBack(await buildWorkbook(data));
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Sổ doanh thu S1-HKD", "Đơn bán", "Thu nợ", "Chi phí", "Nhập kho", "Chế biến"]);
    const s1 = wb.getWorksheet("Sổ doanh thu S1-HKD")!;
    const values = s1.getSheetValues().flat().filter((v) => typeof v === "string" || typeof v === "number");
    expect(values).toContain("DH-2026-0001");
    expect(values).not.toContain("DH-2026-0002");
    const total = s1.getRows(1, s1.rowCount)!.find((r) => r.getCell(4).value === "Tổng cộng")!;
    expect(total.getCell(8).value).toBe(5_000_000);
    expect(wb.getWorksheet("Đơn bán")!.rowCount).toBe(3);
  });

  test("sheet thu nợ ghi mã đơn được trả; sheet chế biến có đầu vào, đầu ra và hao hụt", async () => {
    // Đơn tháng 9 còn nợ 2tr, thu tháng 10 gắn đơn: mã đơn vẫn có dù đơn nằm ngoài kỳ.
    await createSale(db(), SHOP_ID, owner, { ...baseSale, date: "2026-09-30" });
    await createPayment(db(), SHOP_ID, owner, {
      id: "pay_000000001", customerId: C.lan, saleId: S1, date: "2026-10-03", amount: 500_000, method: "cash", note: "",
    });
    await createProduction(db(), SHOP_ID, owner, {
      id: "prod_00000001", kind: "steam", date: "2026-10-04",
      inputs: [{ productId: P.clean, qty: 30 }, { productId: P.sugar, qty: 10 }],
      outputs: [{ productId: P.steamed, qty: 10, gramPerUnit: 3 }],
    });

    const wb = await readBack(await buildWorkbook(await loadExportData(db(), SHOP_ID, { from: "2026-10-01", to: "2026-10-31" })));
    const payRow = wb.getWorksheet("Thu nợ")!.getRow(2);
    expect([payRow.getCell(2).value, payRow.getCell(3).value, payRow.getCell(5).value]).toEqual(["Chị Lan", 500_000, "DH-2026-0001"]);
    const prod = wb.getWorksheet("Chế biến")!;
    expect(prod.rowCount).toBe(4);
    expect([prod.getRow(2).getCell(3).value, prod.getRow(4).getCell(3).value, prod.getRow(4).getCell(4).value]).toEqual(["Vào", "Ra", "Yến chưng 70ml"]);
  });

  test("từ chối kỳ ngược", async () => {
    await expect(loadExportData(db(), SHOP_ID, { from: "2026-10-31", to: "2026-10-01" })).rejects.toThrow();
  });
});
