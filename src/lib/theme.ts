export type Theme = "light" | "dark" | "system";

const THEME_KEY = "shiguang.theme";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getTheme(): Theme {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {
    // 忽略存储读取失败
  }
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "light";
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolveTheme(theme) === "dark");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // 忽略存储失败
  }
}

export function initTheme() {
  applyTheme(getTheme());
  if (typeof window !== "undefined" && window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (getTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
  }
}