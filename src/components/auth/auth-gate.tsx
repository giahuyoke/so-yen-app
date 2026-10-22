"use client";

import { Alert, Spin } from "antd";
import { type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { LoginScreen } from "@/components/auth/login-screen";
import { isFirebaseConfigured, missingFirebaseEnvVars } from "@/lib/firebase/config";

export function AuthGate({ children }: { children: ReactNode }) {
  const { loading, sessionError, signIn, user } = useAuth();

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

  if (!user) return <LoginScreen sessionError={sessionError} signIn={signIn} />;

  return children;
}
