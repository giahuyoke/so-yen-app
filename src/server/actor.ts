/** Người dùng đã xác thực, lấy từ session cookie. */
export interface Actor {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}
