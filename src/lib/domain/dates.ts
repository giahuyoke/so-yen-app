const vnDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function todayVN(now: Date = new Date()): string {
  return vnDate.format(now);
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

/** "2026-10-22" → "22/10/2026" */
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}
