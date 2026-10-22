import { collection, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import type { CustomerType } from "@/lib/domain/models";
import { getClientDb } from "@/lib/firebase/client";

export interface CustomerValues {
  name: string;
  phone: string;
  type: CustomerType;
  note: string;
}

/** Client chỉ ghi thông tin liên hệ; công nợ và doanh số do server cập nhật. Trả về id khách. */
export async function saveCustomer(shopId: string, uid: string, id: string | null, values: CustomerValues): Promise<string> {
  const customers = collection(getClientDb(), "shops", shopId, "customers");
  const data = { name: values.name.trim(), phone: values.phone.trim(), type: values.type, note: values.note.trim() };
  if (id) {
    await updateDoc(doc(customers, id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = doc(customers);
  await setDoc(ref, { ...data, createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
