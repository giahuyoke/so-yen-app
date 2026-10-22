"use server";

import { requireMember } from "@/server/auth";
import { getAdminDb } from "@/server/firebase-admin";
import { runAction } from "@/server/run-action";
import { createPayment, voidPayment } from "@/server/services/payments";
import { createSale, voidSale } from "@/server/services/sales";

export async function createSaleAction(shopId: string, input: unknown) {
  return runAction(async () => createSale(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function voidSaleAction(shopId: string, input: unknown) {
  return runAction(async () => voidSale(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function createPaymentAction(shopId: string, input: unknown) {
  return runAction(async () => createPayment(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function voidPaymentAction(shopId: string, input: unknown) {
  return runAction(async () => voidPayment(getAdminDb(), shopId, await requireMember(shopId), input));
}
