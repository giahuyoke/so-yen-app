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
  /** Gram yến trong một cái (hũ chưng, hộp quà), điền sẵn khi chế biến. */
  gramPerUnit?: number | null;
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

export const EXPENSE_CATEGORIES = ["nest", "shipping", "ads", "platform_fee", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface ExpenseDoc extends DocBase {
  category: ExpenseCategory;
  amount: number;
  note: string;
}

export interface MonthStats {
  id: string;
  revenue?: number;
  cogs?: number;
  saleCount?: number;
  expenses?: number;
  byChannel?: Partial<Record<SaleChannel, { revenue: number; cogs: number; count: number }>>;
  byProduct?: Record<string, { qty: number; revenue: number; cogs: number }>;
  byTaxGroup?: Partial<Record<TaxGroup, number>>;
  expensesByCategory?: Partial<Record<ExpenseCategory, number>>;
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

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  nest: "Nhà yến",
  shipping: "Vận chuyển",
  ads: "Quảng cáo",
  platform_fee: "Phí sàn",
  other: "Khác",
};
