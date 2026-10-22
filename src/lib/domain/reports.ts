import type {
  ExpenseCategory,
  MonthStats,
  ProductionDoc,
  ReceiptDoc,
  SaleChannel,
  TaxGroup,
} from "@/lib/domain/models";

export type PeriodKind = "month" | "quarter" | "year";

export interface Period {
  kind: PeriodKind;
  year: number;
  /** Tháng 1..12 hoặc quý 1..4; bỏ qua khi kind = year. */
  index: number;
}

export interface PeriodRange {
  from: string;
  to: string;
  months: string[];
  label: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function periodRange(period: Period): PeriodRange {
  const { kind, year, index } = period;
  const [first, last] = kind === "month" ? [index, index] : kind === "quarter" ? [index * 3 - 2, index * 3] : [1, 12];
  const months: string[] = [];
  for (let m = first; m <= last; m++) months.push(`${year}-${pad(m)}`);
  const lastDay = new Date(Date.UTC(year, last, 0)).getUTCDate();
  const label = kind === "month" ? `Tháng ${index}/${year}` : kind === "quarter" ? `Quý ${index}/${year}` : `Năm ${year}`;
  return { from: `${year}-${pad(first)}-01`, to: `${year}-${pad(last)}-${pad(lastDay)}`, months, label };
}

export interface PeriodTotals {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  saleCount: number;
  byChannel: Partial<Record<SaleChannel, { revenue: number; cogs: number; count: number }>>;
  byProduct: Record<string, { qty: number; revenue: number; cogs: number }>;
  byTaxGroup: Partial<Record<TaxGroup, number>>;
  expensesByCategory: Partial<Record<ExpenseCategory, number>>;
}

function addInto<K extends string>(target: Partial<Record<K, number>>, source: Partial<Record<K, number>> | undefined) {
  for (const [key, value] of Object.entries(source ?? {}) as [K, number][]) {
    target[key] = (target[key] ?? 0) + value;
  }
}

/** Cộng dồn stats các tháng trong kỳ. */
export function sumStats(stats: MonthStats[]): PeriodTotals {
  const t: PeriodTotals = {
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    expenses: 0,
    netProfit: 0,
    saleCount: 0,
    byChannel: {},
    byProduct: {},
    byTaxGroup: {},
    expensesByCategory: {},
  };
  for (const s of stats) {
    t.revenue += s.revenue ?? 0;
    t.cogs += s.cogs ?? 0;
    t.expenses += s.expenses ?? 0;
    t.saleCount += s.saleCount ?? 0;
    for (const [channel, c] of Object.entries(s.byChannel ?? {}) as [SaleChannel, { revenue: number; cogs: number; count: number }][]) {
      const target = (t.byChannel[channel] ??= { revenue: 0, cogs: 0, count: 0 });
      target.revenue += c.revenue;
      target.cogs += c.cogs;
      target.count += c.count;
    }
    for (const [productId, p] of Object.entries(s.byProduct ?? {})) {
      const target = (t.byProduct[productId] ??= { qty: 0, revenue: 0, cogs: 0 });
      target.qty += p.qty;
      target.revenue += p.revenue;
      target.cogs += p.cogs;
    }
    addInto(t.byTaxGroup, s.byTaxGroup);
    addInto(t.expensesByCategory, s.expensesByCategory);
  }
  t.grossProfit = t.revenue - t.cogs;
  t.netProfit = t.grossProfit - t.expenses;
  return t;
}

/** "harvest" cho hàng tự thu hoạch, "supplier:<id>" cho hàng mua, "unknown" khi không tìm được phiếu nhập. */
export type LossSource = "harvest" | "unknown" | `supplier:${string}`;

export interface LossGroup {
  source: LossSource;
  count: number;
  inputQty: number;
  lossQty: number;
  lossRate: number;
}

/**
 * Hao hụt làm sạch theo nguồn hàng. Nguồn của một lần làm sạch là phiếu nhập
 * còn hiệu lực gần nhất (theo ngày, không sau ngày làm sạch) của sản phẩm đầu
 * vào. Lần làm sạch có nhiều đầu vào chia hao hụt theo số gram đầu vào.
 */
export function lossBySource(
  productions: Pick<ProductionDoc, "kind" | "status" | "date" | "inputs" | "lossQty">[],
  receipts: Pick<ReceiptDoc, "kind" | "status" | "date" | "supplierId" | "lines">[],
): LossGroup[] {
  const activeReceipts = receipts.filter((r) => r.status === "active").sort((a, b) => b.date.localeCompare(a.date));
  const sourceOf = (productId: string, date: string): LossSource => {
    const r = activeReceipts.find((x) => x.date <= date && x.lines.some((l) => l.productId === productId));
    if (!r) return "unknown";
    return r.kind === "harvest" ? "harvest" : `supplier:${r.supplierId ?? ""}`;
  };

  const groups = new Map<LossSource, { count: number; inputQty: number; lossQty: number }>();
  for (const p of productions) {
    if (p.kind !== "clean" || p.status !== "active") continue;
    const inputQty = p.inputs.reduce((sum, l) => sum + l.qty, 0);
    if (inputQty === 0) continue;
    const seen = new Set<LossSource>();
    for (const line of p.inputs) {
      const source = sourceOf(line.productId, p.date);
      const g = groups.get(source) ?? { count: 0, inputQty: 0, lossQty: 0 };
      if (!seen.has(source)) g.count++;
      seen.add(source);
      g.inputQty += line.qty;
      g.lossQty += (p.lossQty * line.qty) / inputQty;
      groups.set(source, g);
    }
  }
  return [...groups.entries()]
    .map(([source, g]) => ({
      source,
      count: g.count,
      inputQty: g.inputQty,
      lossQty: Math.round(g.lossQty),
      lossRate: g.inputQty > 0 ? g.lossQty / g.inputQty : 0,
    }))
    .sort((a, b) => b.inputQty - a.inputQty);
}
