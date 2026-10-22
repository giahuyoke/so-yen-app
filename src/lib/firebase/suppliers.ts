import { collection, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";

export interface SupplierValues {
  name: string;
  phone: string;
  note: string;
}

/** Nhà cung cấp là dữ liệu đơn giản nên client ghi trực tiếp; rules kiểm tra dữ liệu. */
export async function saveSupplier(shopId: string, uid: string, id: string | null, values: SupplierValues) {
  const suppliers = collection(getClientDb(), "shops", shopId, "suppliers");
  const data = { name: values.name.trim(), phone: values.phone.trim(), note: values.note.trim() };
  if (id) {
    await updateDoc(doc(suppliers, id), { ...data, updatedAt: serverTimestamp() });
  } else {
    await setDoc(doc(suppliers), { ...data, createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}
