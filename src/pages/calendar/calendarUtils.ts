export interface CalEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  color: string;
  location: string | null;
}

export const eventColorMap: Record<string, { dot: string; chip: string }> = {
  primary: { dot: "bg-primary-500", chip: "bg-primary-100 text-primary-700" },
  accent: { dot: "bg-accent-500", chip: "bg-accent-100 text-accent-700" },
  secondary: { dot: "bg-secondary-500", chip: "bg-secondary-100 text-secondary-700" },
};

export const eventColorKeys = ["primary", "accent", "secondary"];

export function colorOf(color: string) {
  return eventColorMap[color] ?? eventColorMap.primary;
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function timeLabel(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function toIso(dateStr: string, timeStr?: string) {
  const base = timeStr ? `${dateStr}T${timeStr}:00` : `${dateStr}T00:00:00`;
  return new Date(base).toISOString();
}

export function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function monthLabel(year: number, month: number) {
  return `${year}年${month + 1}月`;
}

export function weekdayShort(d: Date) {
  const names = ["日", "一", "二", "三", "四", "五", "六"];
  return names[d.getDay()];
}