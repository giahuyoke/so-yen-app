/** ID chứng từ do client sinh trước khi gửi, để gửi lại không bị ghi hai lần. */
export function newId(): string {
  return crypto.randomUUID().replaceAll("-", "");
}
