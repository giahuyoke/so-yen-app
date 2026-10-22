"use server";

import { requireMember } from "@/server/auth";
import { getAdminDb } from "@/server/firebase-admin";
import { runAction } from "@/server/run-action";
import { createAdjustment, voidAdjustment } from "@/server/services/adjustments";
import { createProduct, updateProduct } from "@/server/services/products";
import { createProduction, voidProduction } from "@/server/services/productions";
import { createReceipt, voidReceipt } from "@/server/services/receipts";

export async function createProductAction(shopId: string, input: unknown) {
  return runAction(async () => createProduct(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function updateProductAction(shopId: string, input: unknown) {
  return runAction(async () => {
    await requireMember(shopId);
    return updateProduct(getAdminDb(), shopId, input);
  });
}

export async function createReceiptAction(shopId: string, input: unknown) {
  return runAction(async () => createReceipt(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function voidReceiptAction(shopId: string, input: unknown) {
  return runAction(async () => voidReceipt(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function createProductionAction(shopId: string, input: unknown) {
  return runAction(async () => createProduction(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function voidProductionAction(shopId: string, input: unknown) {
  return runAction(async () => voidProduction(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function createAdjustmentAction(shopId: string, input: unknown) {
  return runAction(async () => createAdjustment(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function voidAdjustmentAction(shopId: string, input: unknown) {
  return runAction(async () => voidAdjustment(getAdminDb(), shopId, await requireMember(shopId), input));
}
