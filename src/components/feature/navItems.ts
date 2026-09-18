export interface NavItem {
  path: string;
  label: string;
  icon: string;
  accent: string;
}

export const navItems: NavItem[] = [
  { path: "/", label: "首页", icon: "ri-home-5-line", accent: "bg-primary-100 text-primary-600" },
  { path: "/todos", label: "待办", icon: "ri-checkbox-circle-line", accent: "bg-accent-100 text-accent-600" },
  { path: "/habits", label: "习惯", icon: "ri-repeat-line", accent: "bg-secondary-100 text-secondary-700" },
  { path: "/goals", label: "目标", icon: "ri-flag-line", accent: "bg-primary-100 text-primary-600" },
  { path: "/focus", label: "专注", icon: "ri-timer-line", accent: "bg-accent-100 text-accent-600" },
  { path: "/notes", label: "笔记", icon: "ri-sticky-note-line", accent: "bg-secondary-100 text-secondary-700" },
  { path: "/calendar", label: "日程", icon: "ri-calendar-line", accent: "bg-primary-100 text-primary-600" },
  { path: "/review", label: "复盘", icon: "ri-history-line", accent: "bg-accent-100 text-accent-600" },
  { path: "/drive", label: "网盘", icon: "ri-hard-drive-2-line", accent: "bg-secondary-100 text-secondary-700" },
  { path: "/apps", label: "应用", icon: "ri-apps-2-line", accent: "bg-secondary-100 text-secondary-700" },
  { path: "/pricing", label: "会员", icon: "ri-vip-crown-line", accent: "bg-primary-100 text-primary-600" },
  { path: "/marketing", label: "推广", icon: "ri-megaphone-line", accent: "bg-accent-100 text-accent-600" },
  { path: "/settings", label: "设置", icon: "ri-settings-3-line", accent: "bg-secondary-100 text-secondary-700" },
];

// 移动端底部导航展示的 5 个主项
export const bottomNavItems: NavItem[] = [
  navItems[0],
  navItems[1],
  navItems[2],
  navItems[3],
];