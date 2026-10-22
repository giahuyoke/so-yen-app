"use server";

import { requireMember, requireUser } from "@/server/auth";
import { getAdminDb } from "@/server/firebase-admin";
import { runAction } from "@/server/run-action";
import { cancelInvite, createShop, findMyShop, inviteMember, removeMember, updateBankAccount, updateTaxConfig } from "@/server/services/membership";

export async function getMyShopAction() {
  return runAction(async () => findMyShop(getAdminDb(), await requireUser()));
}

export async function createShopAction(input: unknown) {
  return runAction(async () => createShop(getAdminDb(), await requireUser(), input));
}

export async function inviteMemberAction(shopId: string, input: unknown) {
  return runAction(async () => inviteMember(getAdminDb(), shopId, await requireMember(shopId), input));
}

export async function cancelInviteAction(shopId: string, input: unknown) {
  return runAction(async () => {
    await requireMember(shopId);
    return cancelInvite(getAdminDb(), shopId, input);
  });
}

export async function removeMemberAction(shopId: string, input: unknown) {
  return runAction(async () => {
    await requireMember(shopId);
    return removeMember(getAdminDb(), shopId, input);
  });
}

export async function updateTaxConfigAction(shopId: string, input: unknown) {
  return runAction(async () => {
    await requireMember(shopId);
    return updateTaxConfig(getAdminDb(), shopId, input);
  });
}

export async function updateBankAccountAction(shopId: string, input: unknown) {
  return runAction(async () => {
    await requireMember(shopId);
    return updateBankAccount(getAdminDb(), shopId, input);
  });
}
