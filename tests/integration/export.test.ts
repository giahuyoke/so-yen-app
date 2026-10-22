import ExcelJS from "exceljs";
import { beforeEach, describe, expect, test } from "vitest";
import { createExpense } from "@/server/services/expenses";
import { buildWorkbook, loadExportData } from "@/server/services/export";
import { createSale, voidSale } from "@/server/services/sales";
import { db, owner, SHOP_ID } from "./helpers";
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
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Sổ doanh thu S1-HKD", "Đơn bán", "Chi phí", "Nhập kho"]);
    const s1 = wb.getWorksheet("Sổ doanh thu S1-HKD")!;
    const values = s1.getSheetValues().flat().filter((v) => typeof v === "string" || typeof v === "number");
    expect(values).toContain("DH-2026-0001");
    expect(values).not.toContain("DH-2026-0002");
    const total = s1.getRows(1, s1.rowCount)!.find((r) => r.getCell(4).value === "Tổng cộng")!;
    expect(total.getCell(8).value).toBe(5_000_000);
    expect(wb.getWorksheet("Đơn bán")!.rowCount).toBe(3);
  });

  test("từ chối kỳ ngược", async () => {
    await expect(loadExportData(db(), SHOP_ID, { from: "2026-10-31", to: "2026-10-01" })).rejects.toThrow();
  });
});
