"use client";

import { useState } from "react";
import { SaleForm } from "@/components/sales/sale-form";

export default function NewSalePage() {
  // Đổi key để có form trống và ID đơn mới.
  const [round, setRound] = useState(0);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Bán hàng</h1>
      <SaleForm key={round} onNew={() => setRound((r) => r + 1)} />
    </div>
  );
}
