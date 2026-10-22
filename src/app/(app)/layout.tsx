import { AuthGate } from "@/components/auth/auth-gate";
import { ShopGate } from "@/components/shop/shop-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <ShopGate>{children}</ShopGate>
    </AuthGate>
  );
}
