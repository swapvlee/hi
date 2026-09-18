export type ReviewType = "daily" | "weekly";

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function periodRange(type: ReviewType, anchor: Date) {
  if (type === "daily") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    const end = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 1);
    return { start, end, label: `${anchor.getMonth() + 1}月${anchor.getDate()}日` };
  }
  const monday = startOfWeek(anchor);
  const sunday = addDays(monday, 6);
  const end = addDays(monday, 7);
  return {
    start: monday,
    end,
    label: `${monday.getMonth() + 1}月${monday.getDate()}日 - ${sunday.getMonth() + 1}月${sunday.getDate()}日`,
  };
}

export function periodDateKey(type: ReviewType, anchor: Date): string {
  return type === "daily" ? dateKey(anchor) : dateKey(startOfWeek(anchor));
}

export function formatReviewDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}