import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/domain/errors";
import { requireMember } from "@/server/auth";
import { getAdminDb } from "@/server/firebase-admin";
import { buildWorkbook, loadExportData } from "@/server/services/export";

/** Tải file Excel sổ sách của kỳ: /api/export?shopId=...&from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const shopId = params.get("shopId") ?? "";
  try {
    await requireMember(shopId);
    const data = await loadExportData(getAdminDb(), shopId, { from: params.get("from"), to: params.get("to") });
    const file = await buildWorkbook(data);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="so-yen_${data.from}_${data.to}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400;
      return new Response(error.message, { status });
    }
    if (error instanceof ZodError) return new Response(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", { status: 400 });
    console.error(error);
    return new Response("Có lỗi xảy ra, vui lòng thử lại.", { status: 500 });
  }
}
