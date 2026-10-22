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
