"use server";

import { requireMember } from "@/server/auth";
import { getAdminDb } from "@/server/firebase-admin";
import { runAction } from "@/server/run-action";
import { createExpense, voidExpense } from "@/server/services/expenses";

export async function createExpenseAction(shopId: string, input: unknown) {
  return runAction(async () => createExpense(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function voidExpenseAction(shopId: string, input: unknown) {
  return runAction(async () => voidExpense(getAdminDb(), shopId, await requireMember(shopId), input));
}
