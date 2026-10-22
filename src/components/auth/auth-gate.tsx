"use client";

import { GoogleOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Spin, Typography } from "antd";
import { FirebaseError } from "firebase/app";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { isFirebaseConfigured, missingFirebaseEnvVars } from "@/lib/firebase/config";

const { Paragraph, Title } = Typography;

export function AuthGate({ children }: { children: ReactNode }) {
  const { message } = App.useApp();
  const { loading, sessionError, signIn, user } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  if (!isFirebaseConfigured) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-4">
        <Alert
          type="warning"
          showIcon
          title="Firebase chưa được cấu hình"
          description={`Sao chép .env.example thành .env.local. Biến còn thiếu: ${missingFirebaseEnvVars.join(", ")}`}
        />
      </div>
    );
  }

  if (loading && !sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm overflow-hidden" styles={{ body: { padding: 0 } }}>
          <div className="bg-brand px-6 pb-6 pt-8 text-white">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-dark text-xl font-semibold">SY</div>
            <Title level={2} className="mb-1! text-white!">Sổ Yến</Title>
            <Paragraph className="mb-0! text-brand-tint!">Sổ sách kho, bán hàng và thuế cho hộ kinh doanh yến sào.</Paragraph>
          </div>
          <div className="space-y-4 p-6">
            {sessionError && (
              <Alert type="error" showIcon title="Không tạo được phiên đăng nhập. Vui lòng thử lại." />
            )}
            <Button
              block
              type="primary"
              size="large"
              icon={<GoogleOutlined />}
              loading={signingIn}
              onClick={async () => {
                setSigningIn(true);
                try {
                  await signIn();
                } catch (error) {
                  if (error instanceof FirebaseError && error.code === "auth/popup-closed-by-user") return;
                  void message.error(
                    error instanceof FirebaseError && error.code === "auth/popup-blocked"
                      ? "Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép pop-up rồi thử lại."
                      : "Không thể đăng nhập bằng Google.",
                  );
                } finally {
                  setSigningIn(false);
                }
              }}
            >
              Tiếp tục với Google
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return children;
}
