import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { getTheme, applyTheme, type Theme } from "@/lib/theme";

const FOCUS_KEY = "shiguang.focusMinutes";
const BREAK_KEY = "shiguang.breakMinutes";

const FOCUS_OPTIONS = [15, 25, 30, 45, 60];
const BREAK_OPTIONS = [5, 10, 15];

const NOTIFY_ITEMS = [
  { key: "review", label: "每日复盘提醒", desc: "每天提醒你写一篇复盘", icon: "ri-history-line" },
  { key: "habit", label: "习惯打卡提醒", desc: "提醒你完成当天习惯打卡", icon: "ri-repeat-line" },
  { key: "todo", label: "待办到期提醒", desc: "待办临近到期时提醒你", icon: "ri-checkbox-circle-line" },
  { key: "goal", label: "目标进度提醒", desc: "目标里程碑临近时提醒", icon: "ri-flag-line" },
];

const EXPORT_TABLES = [
  "todos",
  "habits",
  "habit_logs",
  "goals",
  "notes",
  "pomodoro_sessions",
  "events",
  "reviews",
  "milestones",
  "custom_modules",
  "custom_entries",
];

function readNumber(key: string, fallback: number) {
  const raw = localStorage.getItem(key);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function readBool(key: string, fallback: boolean) {
  const raw = localStorage.getItem(key);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return fallback;
}

export default function Settings() {
  const { user } = useAuth();
  const { plan, isPro } = usePlan();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  const [focusMinutes, setFocusMinutes] = useState(() => readNumber(FOCUS_KEY, 25));
  const [breakMinutes, setBreakMinutes] = useState(() => readNumber(BREAK_KEY, 5));
  const [prefMsg, setPrefMsg] = useState("");

  const [theme, setThemeState] = useState<Theme>(() => getTheme());

  const [notify, setNotify] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NOTIFY_ITEMS.forEach((item) => {
      init[item.key] = readBool(`shiguang.notify.${item.key}`, true);
    });
    return init;
  });

  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [exportError, setExportError] = useState(false);

  useEffect(() => {
    const initial =
      (user?.user_metadata?.username as string | undefined) ??
      user?.email?.split("@")[0] ??
      "";
    setUsername(initial);
  }, [user]);

  const email = user?.email ?? "未绑定邮箱";

  const handleSaveName = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setNameMsg("昵称不能为空");
      return;
    }
    if (trimmed.length > 24) {
      setNameMsg("昵称最多 24 个字符");
      return;
    }
    setSavingName(true);
    setNameMsg("");
    try {
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { username: trimmed },
      });
      if (metaErr) throw metaErr;
      if (user) {
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ username: trimmed })
          .eq("id", user.id);
        if (profileErr) throw profileErr;
      }
      setNameMsg("已保存");
      setTimeout(() => setNameMsg(""), 2500);
    } catch (err) {
      setNameMsg(getErrorMessage(err, "保存失败，请重试"));
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePrefs = () => {
    localStorage.setItem(FOCUS_KEY, String(focusMinutes));
    localStorage.setItem(BREAK_KEY, String(breakMinutes));
    setPrefMsg("已保存，下次专注将使用新时长");
    setTimeout(() => setPrefMsg(""), 2500);
  };

  const handleSetTheme = (t: Theme) => {
    applyTheme(t);
    setThemeState(t);
  };

  const toggleNotify = (key: string) => {
    const next = !notify[key];
    setNotify((prev) => ({ ...prev, [key]: next }));
    localStorage.setItem(`shiguang.notify.${key}`, String(next));
  };

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    setExportMsg("");
    setExportError(false);
    try {
      const responses = await Promise.all(
        EXPORT_TABLES.map((t) => supabase.from(t).select("*").eq("user_id", user.id))
      );

      const data: Record<string, unknown> = {};
      EXPORT_TABLES.forEach((t, i) => {
        const res = responses[i];
        if (res.error) throw res.error;
        data[t] = res.data ?? [];
      });

      const payload = {
        app: "拾光",
        exported_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          username: user.user_metadata?.username ?? null,
        },
        data,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.href = url;
      a.download = `shiguang-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setExportMsg("导出成功，备份文件已下载");
    } catch (err) {
      setExportError(true);
      setExportMsg(getErrorMessage(err, "导出失败，请重试"));
    } finally {
      setExporting(false);
      setTimeout(() => setExportMsg(""), 4000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground-900">设置</h1>
        <p className="mt-1 text-sm text-foreground-500">集中管理你的个人配置与偏好</p>
      </div>

      {/* 个人资料 */}
      <section className="rounded-lg bg-background-50 border border-background-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <i className="ri-user-line" />
          </span>
          <h4 className="text-sm font-semibold text-foreground-700">个人资料</h4>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">昵称</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={24}
              placeholder="给自己取个名字"
              className="w-full px-4 py-3 rounded-lg border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">邮箱</label>
            <input
              type="text"
              value={email}
              readOnly
              className="w-full px-4 py-3 rounded-lg border border-background-200 bg-background-100 text-sm text-foreground-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-foreground-400">邮箱用于登录，暂不支持修改</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveName}
              disabled={savingName}
              className="px-5 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              {savingName ? "保存中..." : "保存资料"}
            </button>
            {nameMsg && (
              <span className={`text-sm ${nameMsg === "已保存" ? "text-primary-600" : "text-accent-700"}`}>
                {nameMsg}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 外观主题 */}
      <section className="rounded-lg bg-background-50 border border-background-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-100 text-accent-600">
            <i className="ri-contrast-2-line" />
          </span>
          <h4 className="text-sm font-semibold text-foreground-700">外观主题</h4>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground-900">主题模式</p>
            <p className="mt-0.5 text-xs text-foreground-500">暗色模式夜间更护眼，也可跟随系统自动切换</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-full bg-background-100">
            <button
              onClick={() => handleSetTheme("light")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                theme === "light"
                  ? "bg-background-50 text-primary-700"
                  : "text-foreground-500 hover:text-foreground-700"
              }`}
            >
              <i className="ri-sun-line" />
              亮色
            </button>
            <button
              onClick={() => handleSetTheme("dark")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                theme === "dark"
                  ? "bg-background-50 text-primary-700"
                  : "text-foreground-500 hover:text-foreground-700"
              }`}
            >
              <i className="ri-moon-line" />
              暗色
            </button>
            <button
              onClick={() => handleSetTheme("system")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                theme === "system"
                  ? "bg-background-50 text-primary-700"
                  : "text-foreground-500 hover:text-foreground-700"
              }`}
            >
              <i className="ri-contrast-2-line" />
              跟随系统
            </button>
          </div>
        </div>
      </section>

      {/* 专注偏好 */}
      <section className="rounded-lg bg-background-50 border border-background-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-100 text-accent-600">
            <i className="ri-timer-line" />
          </span>
          <h4 className="text-sm font-semibold text-foreground-700">专注偏好</h4>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-foreground-700 mb-2">默认专注时长</p>
            <div className="flex flex-wrap gap-2">
              {FOCUS_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setFocusMinutes(m)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    focusMinutes === m
                      ? "bg-primary-500 text-background-50"
                      : "bg-background-100 text-foreground-600 hover:bg-background-200"
                  }`}
                >
                  {m} 分钟
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground-700 mb-2">默认休息时长</p>
            <div className="flex flex-wrap gap-2">
              {BREAK_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setBreakMinutes(m)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    breakMinutes === m
                      ? "bg-primary-500 text-background-50"
                      : "bg-background-100 text-foreground-600 hover:bg-background-200"
                  }`}
                >
                  {m} 分钟
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSavePrefs}
              className="px-5 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              保存偏好
            </button>
            {prefMsg && <span className="text-sm text-primary-600">{prefMsg}</span>}
          </div>
        </div>
      </section>

      {/* 通知偏好 */}
      <section className="rounded-lg bg-background-50 border border-background-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-100 text-secondary-700">
            <i className="ri-notification-3-line" />
          </span>
          <h4 className="text-sm font-semibold text-foreground-700">通知偏好</h4>
        </div>

        <div className="space-y-1">
          {NOTIFY_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center gap-3 py-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-background-100 text-foreground-500 shrink-0">
                <i className={`${item.icon} text-base`} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground-900">{item.label}</p>
                <p className="text-xs text-foreground-500 mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => toggleNotify(item.key)}
                aria-pressed={notify[item.key]}
                aria-label={item.label}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                  notify[item.key] ? "bg-primary-500" : "bg-background-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background-50 transition-transform ${
                    notify[item.key] ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 数据与备份 */}
      <section className="rounded-lg bg-background-50 border border-background-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <i className="ri-download-2-line" />
          </span>
          <h4 className="text-sm font-semibold text-foreground-700">数据与备份</h4>
        </div>

        <p className="text-sm text-foreground-600 leading-relaxed mb-4">
          一键导出你的待办、习惯、目标、笔记、复盘、日程等全部个人数据，生成 JSON 文件保存到本地，方便备份或迁移。
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className={exporting ? "ri-loader-4-line animate-spin" : "ri-download-2-line"} />
            {exporting ? "导出中..." : "导出我的数据"}
          </button>
          {exportMsg && (
            <span className={`text-sm ${exportError ? "text-accent-700" : "text-primary-600"}`}>
              {exportMsg}
            </span>
          )}
        </div>
      </section>

      {/* 账户 */}
      <section className="rounded-lg bg-background-50 border border-background-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-100 text-secondary-700">
            <i className="ri-vip-crown-line" />
          </span>
          <h4 className="text-sm font-semibold text-foreground-700">账户</h4>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-background-100 px-4 py-3 mb-4">
          <div>
            <p className="text-sm font-medium text-foreground-900">当前套餐</p>
            <p className="text-xs text-foreground-500 mt-0.5">{plan?.name ?? "免费版"}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
              isPro ? "bg-accent-100 text-accent-700" : "bg-background-200 text-foreground-600"
            }`}
          >
            {isPro ? "会员" : "免费"}
          </span>
        </div>

        {!isPro && (
          <button
            onClick={() => navigate("/pricing")}
            className="mb-4 flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-arrow-right-up-line" />
            升级会员解锁全部功能
          </button>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-md border border-background-200 text-sm text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-logout-box-r-line" />
          退出登录
        </button>
      </section>
    </div>
  );
}