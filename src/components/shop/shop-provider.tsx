"use client";

import { Alert, Button, Card, Form, Input, Spin, Typography } from "antd";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useRunAction } from "@/components/common/use-run-action";
import { createShopAction, getMyShopAction } from "@/server/actions/shop";
import type { MyShop } from "@/server/services/membership";

interface ShopContextValue {
  shop: MyShop;
  refresh: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<{ loading: boolean; shop: MyShop | null; error: string | null }>({
    loading: true,
    shop: null,
    error: null,
  });

  const apply = useCallback((result: Awaited<ReturnType<typeof getMyShopAction>>) => {
    setState(
      result.ok
        ? { loading: false, shop: result.data, error: null }
        : { loading: false, shop: null, error: result.message },
    );
  }, []);

  const load = useCallback(async () => apply(await getMyShopAction()), [apply]);

  useEffect(() => {
    let cancelled = false;
    void getMyShopAction().then((result) => {
      if (!cancelled) apply(result);
    });
    return () => {
      cancelled = true;
    };
  }, [apply, user?.uid]);

  if (state.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Alert type="error" showIcon title={state.error} action={<Button onClick={() => void load()}>Thử lại</Button>} />
      </div>
    );
  }

  if (!state.shop) return <CreateShopCard onCreated={load} />;

  return <ShopContext.Provider value={{ shop: state.shop, refresh: load }}>{children}</ShopContext.Provider>;
}

function CreateShopCard({ onCreated }: { onCreated: () => Promise<void> }) {
  const run = useRunAction();
  const [saving, setSaving] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <Typography.Title level={3}>Tạo cửa hàng</Typography.Title>
        <Typography.Paragraph type="secondary">
          Nếu bạn được người nhà mời, hãy nhờ họ mời đúng email Google bạn vừa đăng nhập rồi tải lại trang.
        </Typography.Paragraph>
        <Form
          layout="vertical"
          onFinish={async (values: { name: string }) => {
            setSaving(true);
            const created = await run(createShopAction(values));
            setSaving(false);
            if (created) await onCreated();
          }}
        >
          <Form.Item name="name" label="Tên cửa hàng" rules={[{ required: true, message: "Nhập tên cửa hàng" }]}>
            <Input placeholder="VD: Yến sào Nhà Mình" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={saving}>
            Tạo cửa hàng
          </Button>
        </Form>
      </Card>
    </div>
  );
}

export function useShop(): ShopContextValue {
  const value = useContext(ShopContext);
  if (!value) throw new Error("useShop phải được dùng bên trong ShopGate.");
  return value;
}
