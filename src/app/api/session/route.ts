import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/server/auth";
import { getAdminAuth } from "@/server/firebase-admin";

/** Đổi Firebase ID token lấy session cookie httpOnly để Server Actions xác thực. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { idToken?: unknown } | null;
  if (typeof body?.idToken !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    const auth = getAdminAuth();
    await auth.verifyIdToken(body.idToken);
    const cookie = await auth.createSessionCookie(body.idToken, {
      expiresIn: SESSION_MAX_AGE_SEC * 1000,
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEC,
    });
    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
