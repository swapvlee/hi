import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import { navItems } from "@/components/feature/navItems";

interface Stats {
  todoCount: number;
  habitTotal: number;
  habitDone: number;
  goalCount: number;
  focusMinutes: number;
}

interface RecentNote {
  id: string;
  title: string;
  content: string | null;
  mood: string | null;
  updated_at: string;
}

interface TodayEvent {
  id: string;
  title: string;
  start_time: string;
  all_day: boolean;
  color: string;
  location: string | null;
}

interface CustomAppSummary {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

function stripHtml(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function formatNoteDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatEventTime(iso: string, allDay: boolean) {
  if (allDay) return "全天";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const eventColorMap: Record<string, string> = {
  primary: "bg-primary-500",
  accent: "bg-accent-500",
  secondary: "bg-secondary-500",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "早上好";
  if (h >= 11 && h < 13) return "中午好";
  if (h >= 13 && h < 18) return "下午好";
  if (h >= 18 && h < 23) return "晚上好";
  return "夜深了";
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [notes, setNotes] = useState<RecentNote[]>([]);
  const [events, setEvents] = useState<TodayEvent[]>([]);
  const [customApps, setCustomApps] = useState<CustomAppSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const username = (user?.user_metadata?.username as string | undefined)
    ?? user?.email?.split("@")[0]
    ?? "朋友";

  const todayStr = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  // 瞬时错误（后端 schema 缓存刷新等）可自动重试，避免首页闪现报错
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const isTransient = (err: unknown) => {
    const e = err as { code?: string; status?: number; message?: string };
    const msg = String(e?.message ?? "").toLowerCase();
    return (
      e?.code === "PGRST002" ||
      e?.code === "PGRST116" ||
      e?.status === 503 ||
      msg.includes("schema cache") ||
      msg.includes("retrying") ||
      msg.includes("503")
    );
  };

  const load = async () => {
    setLoading(true);
    setError("");

    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const today = new Date();
        const todayDate = today.toISOString().slice(0, 10);
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

        const [todosRes, habitsRes, goalsRes, pomodoroRes, logsRes, notesRes, eventsRes, modulesRes, entriesRes] = await Promise.all([
          supabase.from("todos").select("id", { count: "exact" }).eq("completed", false),
          supabase.from("habits").select("id", { count: "exact" }).eq("archived", false),
          supabase.from("goals").select("id", { count: "exact" }).eq("status", "active"),
          supabase.from("pomodoro_sessions").select("duration_minutes").gte("start_time", startOfDay),
          supabase.from("habit_logs").select("id", { count: "exact" }).eq("log_date", todayDate).eq("completed", true),
          supabase.from("notes").select("id, title, content, mood, updated_at").order("updated_at", { ascending: false }).limit(3),
          supabase.from("events").select("id, title, start_time, all_day, color, location").gte("start_time", startOfDay).lt("start_time", endOfDay).order("start_time", { ascending: true }),
          supabase.from("custom_modules").select("id, name, icon, color").eq("user_id", user!.id).order("created_at", { ascending: true }).limit(6),
          supabase.from("custom_entries").select("module_id").eq("user_id", user!.id),
        ]);

        const results = [todosRes, habitsRes, goalsRes, pomodoroRes, logsRes, notesRes, eventsRes, modulesRes, entriesRes];
        for (const r of results) {
          if (r.error) throw r.error;
        }

        const focusMinutes = (pomodoroRes.data ?? []).reduce(
          (sum, s) => sum + (s.duration_minutes ?? 0),
          0
        );

        setStats({
          todoCount: todosRes.count ?? 0,
          habitTotal: habitsRes.count ?? 0,
          habitDone: logsRes.count ?? 0,
          goalCount: goalsRes.count ?? 0,
          focusMinutes,
        });
        setNotes((notesRes.data ?? []) as RecentNote[]);
        setEvents((eventsRes.data ?? []) as TodayEvent[]);
        const counts: Record<string, number> = {};
        for (const entry of (entriesRes.data ?? []) as { module_id: string }[]) counts[entry.module_id] = (counts[entry.module_id] ?? 0) + 1;
        setCustomApps((modulesRes.data ?? []).map((app) => ({ ...(app as Omit<CustomAppSummary, "count">), count: counts[(app as { id: string }).id] ?? 0 })));
        setLoading(false);
        return;
      } catch (err) {
        if (attempt < MAX_ATTEMPTS && isTransient(err)) {
          await sleep(400 * attempt);
          continue;
        }
        setError(getErrorMessage(err, "加载失败，请稍后重试"));
        setLoading(false);
        return;
      }
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statCards = [
    { label: "今日待办", value: loading ? "—" : `${stats?.todoCount ?? 0}`, unit: "项", icon: "ri-checkbox-circle-line", accent: "bg-accent-100 text-accent-600", path: "/todos" },
    { label: "习惯打卡", value: loading ? "—" : `${stats?.habitDone ?? 0}/${stats?.habitTotal ?? 0}`, unit: "完成", icon: "ri-repeat-line", accent: "bg-secondary-100 text-secondary-700", path: "/habits" },
    { label: "专注时长", value: loading ? "—" : `${stats?.focusMinutes ?? 0}`, unit: "分钟", icon: "ri-timer-line", accent: "bg-primary-100 text-primary-600", path: "/focus" },
    { label: "进行中目标", value: loading ? "—" : `${stats?.goalCount ?? 0}`, unit: "个", icon: "ri-flag-line", accent: "bg-accent-100 text-accent-600", path: "/goals" },
  ];

  const quickActions = [
    { label: "添加任务", icon: "ri-add-line", path: "/todos", color: "bg-primary-500" },
    { label: "开始专注", icon: "ri-play-fill", path: "/focus", color: "bg-accent-500" },
    { label: "写日记", icon: "ri-edit-line", path: "/notes", color: "bg-secondary-500" },
  ];

  return (
    <div className="space-y-6">
      {/* 顶部问候 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground-900">
            {getGreeting()}，{username}
          </h1>
          <p className="mt-1 text-sm text-foreground-500">{todayStr}</p>
        </div>
        <div className="w-11 h-11 flex items-center justify-center rounded-full bg-secondary-500 text-background-50 font-heading font-bold text-lg">
          {username.slice(0, 1).toUpperCase()}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-accent-100/70 text-accent-800 px-4 py-3 text-sm">
          <span>{error}</span>
          <button onClick={load} className="font-medium underline cursor-pointer whitespace-nowrap">
            重试
          </button>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.path}
            className="flex min-w-0 items-center gap-3 rounded-lg bg-background-50 border border-background-200 p-4 hover:bg-background-100 transition-colors cursor-pointer"
          >
            <span className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-lg ${card.accent}`}>
              <i className={`${card.icon} text-lg`} />
            </span>
            <div className="min-w-0">
              <p className="whitespace-nowrap text-2xl font-heading font-bold text-foreground-900">
                {card.value}
                <span className="ml-1 text-xs font-normal text-foreground-500">{card.unit}</span>
              </p>
              <p className="mt-0.5 whitespace-nowrap text-sm text-foreground-500">{card.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* 今日日程 & 近期日记 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 今日日程 */}
        <div className="rounded-lg bg-background-50 border border-background-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-foreground-700">
              <a href="#" className="text-inherit hover:text-primary-600 transition-colors">今日日程</a>
            </h4>
            <Link to="/calendar" className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">
              查看全部
            </Link>
          </div>
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-background-100 text-foreground-400 mb-2">
                <i className="ri-calendar-line text-lg" />
              </div>
              <p className="text-sm text-foreground-500">今天没有日程安排</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${eventColorMap[e.color] ?? eventColorMap.primary}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground-900 truncate">{e.title}</p>
                    {e.location && <p className="text-xs text-foreground-400 truncate">{e.location}</p>}
                  </div>
                  <span className="text-xs text-foreground-500 shrink-0">{formatEventTime(e.start_time, e.all_day)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 近期日记 */}
        <div className="rounded-lg bg-background-50 border border-background-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-foreground-700">
              <a href="#" className="text-inherit hover:text-primary-600 transition-colors">近期日记</a>
            </h4>
            <Link to="/notes" className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">
              写一篇
            </Link>
          </div>
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-background-100 text-foreground-400 mb-2">
                <i className="ri-sticky-note-line text-lg" />
              </div>
              <p className="text-sm text-foreground-500">还没有日记，记录一下今天吧</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => {
                const snippet = stripHtml(n.content ?? "").trim();
                return (
                  <li key={n.id} className="flex items-start gap-3">
                    {n.mood ? (
                      <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-background-100 text-lg shrink-0">
                        {n.mood}
                      </span>
                    ) : (
                      <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-background-100 text-foreground-400 shrink-0">
                        <i className="ri-sticky-note-line" />
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground-900 truncate">{n.title || "无标题"}</p>
                      {snippet && <p className="mt-0.5 text-xs text-foreground-500 line-clamp-1">{snippet}</p>}
                    </div>
                    <span className="text-xs text-foreground-400 shrink-0">{formatNoteDate(n.updated_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* 快捷操作 */}
      <div>
        <h4 className="text-sm font-semibold text-foreground-700 mb-3">
          <a href="#" className="text-inherit hover:text-primary-600 transition-colors">快捷操作</a>
        </h4>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.path}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-background-50 border border-background-200 text-sm text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className={`w-6 h-6 flex items-center justify-center rounded-full ${action.color} text-background-50`}>
                <i className={`${action.icon} text-sm`} />
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {customApps.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground-700">我的应用</h4>
            <Link to="/apps" className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">管理应用</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {customApps.map((app) => (
              <div key={app.id} className="rounded-lg bg-background-50 border border-background-200 p-3 hover:bg-background-100 transition-colors group">
                <Link to={`/apps/${app.id}`} className="block cursor-pointer">
                  <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600"><i className={`${app.icon} text-lg`} /></span>
                  <p className="mt-2 text-sm font-medium text-foreground-800 truncate">{app.name}</p>
                  <p className="mt-0.5 text-xs text-foreground-400">{app.count} 条记录</p>
                </Link>
                <Link
                  to={`/apps/${app.id}?new=1`}
                  className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-primary-500 text-background-50 text-xs font-medium hover:bg-primary-600 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  <i className="ri-add-line" />快速记录
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 功能模块 */}
      <div>
        <h4 className="text-sm font-semibold text-foreground-700 mb-3">
          <a href="#" className="text-inherit hover:text-primary-600 transition-colors">全部功能</a>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {navItems.slice(1).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 rounded-lg bg-background-50 border border-background-200 p-4 hover:bg-background-100 transition-colors cursor-pointer"
            >
              <span className={`w-10 h-10 flex items-center justify-center rounded-lg ${item.accent}`}>
                <i className={`${item.icon} text-lg`} />
              </span>
              <span className="text-sm font-medium text-foreground-800 whitespace-nowrap">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 引导文案 */}
      <div className="rounded-lg bg-primary-50 border border-primary-100 p-5">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 shrink-0">
            <i className="ri-lightbulb-line text-lg" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground-900">开始你的第一步</p>
            <p className="mt-1 text-sm text-foreground-600 leading-relaxed">
              从「待办」记录一件今天要做的小事，或者设定一个长期「目标」，
              让拾光陪你一点点成长为更好的自己。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}