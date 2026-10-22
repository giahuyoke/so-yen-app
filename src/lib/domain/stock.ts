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
