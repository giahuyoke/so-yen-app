import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Với Emulator (FIRESTORE_EMULATOR_HOST có giá trị) admin SDK không cần
 * credential. Production đọc service account JSON từ FIREBASE_SERVICE_ACCOUNT.
 * Không import file này từ code client.
 */
function ensureApp() {
  if (getApps().length) return;
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({
      projectId:
        process.env.GCLOUD_PROJECT ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-so-yen",
    });
    return;
  }
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
  initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
}

export function getAdminDb() {
  ensureApp();
  return getFirestore();
}

export function getAdminAuth() {
  ensureApp();
  return getAuth();
}
