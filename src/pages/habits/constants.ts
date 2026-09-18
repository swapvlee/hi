export const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
  primary: { bg: "bg-primary-100", text: "text-primary-600", dot: "bg-primary-500" },
  accent: { bg: "bg-accent-100", text: "text-accent-600", dot: "bg-accent-500" },
  secondary: { bg: "bg-secondary-100", text: "text-secondary-700", dot: "bg-secondary-500" },
};

export function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
