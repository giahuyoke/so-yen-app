import { AuthGate } from "@/components/auth/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { ShopGate } from "@/components/shop/shop-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <ShopGate>
        <AppShell>{children}</AppShell>
      </ShopGate>
    </AuthGate>
  );
}
