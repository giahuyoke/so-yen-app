import { cookies } from "next/headers";
import { AppError } from "@/lib/domain/errors";
import type { Actor } from "@/server/actor";
import { getAdminAuth, getAdminDb } from "@/server/firebase-admin";
import { assertMember } from "@/server/services/membership";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 14;

const expired = () => new AppError("UNAUTHORIZED", "Phiên đăng nhập đã hết, vui lòng đăng nhập lại.");

export async function requireUser(): Promise<Actor> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  if (!value) throw expired();
  try {
    const decoded = await getAdminAuth().verifySessionCookie(value);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
      name: typeof decoded.name === "string" ? decoded.name : null,
    };
  } catch {
    throw expired();
  }
}

export async function requireMember(shopId: string): Promise<Actor> {
  const actor = await requireUser();
  await assertMember(getAdminDb(), shopId, actor.uid);
  return actor;
}
