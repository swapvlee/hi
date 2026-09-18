import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

interface Session {
  id: string;
  task_id: string | null;
  start_time: string;
  duration_minutes: number;
  type: string;
}

type Mode = "focus" | "break";

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatSessionTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86400000);
  const time = `${hh}:${mm}`;
  if (diffDays === 0) return `今天 ${time}`;
  if (diffDays === 1) return `昨天 ${time}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${time}`;
}

export default function Focus() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const [focusMinutes, setFocusMinutes] = useState(() => {
    const n = Number(localStorage.getItem("shiguang.focusMinutes"));
    return Number.isFinite(n) && n > 0 ? n : 25;
  });
  const [breakMinutes, setBreakMinutes] = useState(() => {
    const n = Number(localStorage.getItem("shiguang.breakMinutes"));
    return Number.isFinite(n) && n > 0 ? n : 5;
  });
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const n = Number(localStorage.getItem("shiguang.focusMinutes"));
    return (Number.isFinite(n) && n > 0 ? n : 25) * 60;
  });
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [loadingTodos, setLoadingTodos] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState({ today: 0, week: 0, count: 0 });

  const startedAtRef = useRef<string | null>(null);

  const totalSeconds = mode === "focus" ? focusMinutes * 60 : breakMinutes * 60;
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  const loadTodos = useCallback(async () => {
    setLoadingTodos(true);
    try {
      const { data, error: err } = await supabase
        .from("todos")
        .select("id, title, completed")
        .eq("completed", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (err) throw err;
      setTodos((data ?? []) as Todo[]);
    } catch (e) {
      setError(getErrorMessage(e, "加载任务失败"));
    } finally {
      setLoadingTodos(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const week = startOfWeek(now).toISOString();
      const { data, error: err } = await supabase
        .from("pomodoro_sessions")
        .select("id, task_id, start_time, duration_minutes, type")
        .order("start_time", { ascending: false })
        .limit(100);
      if (err) throw err;
      const list = (data ?? []) as Session[];
      const focusList = list.filter((s) => s.type === "focus");
      const todayList = focusList.filter((s) => s.start_time >= startOfDay);
      const weekList = focusList.filter((s) => s.start_time >= week);
      setStats({
        today: todayList.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0),
        week: weekList.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0),
        count: todayList.length,
      });
      setSessions(list.slice(0, 8));
    } catch (e) {
      setError(getErrorMessage(e, "加载统计失败"));
    }
  }, []);

  useEffect(() => {
    loadTodos();
    loadStats();
  }, [loadTodos, loadStats]);

  // 计时器
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [running]);

  // 完成处理
  useEffect(() => {
    if (!running || secondsLeft !== 0) return;
    (async () => {
      setRunning(false);
      if (mode === "focus") {
        const { error: err } = await supabase.from("pomodoro_sessions").insert({
          user_id: user!.id,
          task_id: taskId,
          start_time: startedAtRef.current ?? new Date().toISOString(),
          end_time: new Date().toISOString(),
          duration_minutes: focusMinutes,
          type: "focus",
        });
        if (err) setError(getErrorMessage(err, "保存专注记录失败"));
        setToast("专注完成！起来休息一下吧");
        setMode("break");
        setSecondsLeft(breakMinutes * 60);
        setRunning(true);
        loadStats();
      } else {
        setToast("休息结束，继续加油！");
        setMode("focus");
        setSecondsLeft(focusMinutes * 60);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const start = () => {
    if (running) {
      setRunning(false);
      return;
    }
    startedAtRef.current = new Date().toISOString();
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setSecondsLeft(totalSeconds);
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setRunning(false);
    setMode(m);
    setSecondsLeft(m === "focus" ? focusMinutes * 60 : breakMinutes * 60);
  };

  const changeFocus = (delta: number) => {
    const next = Math.min(120, Math.max(5, focusMinutes + delta));
    setFocusMinutes(next);
    if (!running && mode === "focus") setSecondsLeft(next * 60);
  };

  const changeBreak = (delta: number) => {
    const next = Math.min(60, Math.max(1, breakMinutes + delta));
    setBreakMinutes(next);
    if (!running && mode === "break") setSecondsLeft(next * 60);
  };

  const selectedTask = todos.find((t) => t.id === taskId) ?? null;
  const taskTitleById = (id: string | null) =>
    id ? todos.find((t) => t.id === id)?.title ?? "（已删除任务）" : "自由专注";

  const statCards = [
    { label: "今日专注", value: stats.today, unit: "分钟", icon: "ri-timer-line" },
    { label: "本周专注", value: stats.week, unit: "分钟", icon: "ri-calendar-line" },
    { label: "今日番茄", value: stats.count, unit: "个", icon: "ri-timer-flash-line" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground-900">专注计时</h1>
        <p className="mt-1 text-sm text-foreground-500">选一件任务，投入一段不被打扰的时间</p>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-accent-100/70 text-accent-800 px-4 py-3 text-sm">
          <span>{error}</span>
          <button
            onClick={() => {
              loadTodos();
              loadStats();
            }}
            className="font-medium underline cursor-pointer whitespace-nowrap"
          >
            重试
          </button>
        </div>
      )}

      {/* 模式切换 */}
      <div className="flex items-center gap-1 p-1 rounded-full bg-background-100 w-fit">
        <button
          onClick={() => switchMode("focus")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
            mode === "focus" ? "bg-background-50 text-primary-700" : "text-foreground-500 hover:text-foreground-700"
          }`}
        >
          专注
        </button>
        <button
          onClick={() => switchMode("break")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
            mode === "break" ? "bg-background-50 text-primary-700" : "text-foreground-500 hover:text-foreground-700"
          }`}
        >
          休息
        </button>
      </div>

      {/* 任务选择 */}
      <div className="relative">
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-md bg-background-50 border border-background-200 text-sm text-foreground-700 hover:border-background-300 transition-colors cursor-pointer"
        >
          <i className="ri-task-line text-foreground-500" />
          <span className="flex-1 text-left truncate">
            {selectedTask ? selectedTask.title : "自由专注（不选任务）"}
          </span>
          <i className={pickerOpen ? "ri-arrow-up-s-line text-foreground-500" : "ri-arrow-down-s-line text-foreground-500"} />
        </button>

        {pickerOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
            <div className="absolute z-20 left-0 right-0 mt-1 rounded-lg bg-background-50 border border-background-200 shadow-sm max-h-64 overflow-y-auto py-1">
              <button
                onClick={() => {
                  setTaskId(null);
                  setPickerOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
              >
                <i className="ri-timer-line text-foreground-400" />
                自由专注（不选任务）
              </button>
              {loadingTodos ? (
                <p className="px-4 py-3 text-sm text-foreground-400">加载中...</p>
              ) : todos.length === 0 ? (
                <p className="px-4 py-3 text-sm text-foreground-400">暂无进行中的任务</p>
              ) : (
                todos.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTaskId(t.id);
                      setPickerOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                      t.id === taskId
                        ? "bg-primary-50 text-primary-700"
                        : "text-foreground-600 hover:bg-background-100"
                    }`}
                  >
                    <i
                      className={`${
                        t.id === taskId ? "ri-checkbox-circle-fill text-primary-500" : "ri-checkbox-blank-circle-line text-foreground-300"
                      }`}
                    />
                    <span className="truncate">{t.title}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* 计时圆环 */}
      <div className="flex flex-col items-center pt-2">
        <div
          className="relative w-64 h-64 rounded-full"
          style={{
            background: `conic-gradient(oklch(var(--primary-500)) ${progress * 360}deg, oklch(var(--background-100)) ${progress * 360}deg)`,
          }}
        >
          <div className="absolute inset-3 rounded-full bg-background-50 flex flex-col items-center justify-center">
            <span className="font-heading font-bold text-5xl text-foreground-900 tabular-nums">
              {formatClock(secondsLeft)}
            </span>
            <span className="mt-1 text-sm text-foreground-500">
              {running ? (mode === "focus" ? "专注中..." : "休息中...") : "准备就绪"}
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-5 py-3 rounded-full border border-background-200 text-sm font-medium text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-refresh-line" />
            重置
          </button>
          <button
            onClick={start}
            className={`flex items-center gap-2 px-8 py-3 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              running
                ? "bg-background-200 text-foreground-700 hover:bg-background-300"
                : "bg-primary-500 text-background-50 hover:bg-primary-600"
            }`}
          >
            <i className={running ? "ri-pause-fill" : "ri-play-fill"} />
            {running ? "暂停" : "开始"}
          </button>
        </div>
      </div>

      {/* 时长设置 */}
      <div className="flex flex-wrap justify-center gap-4">
        <div className="flex items-center gap-2 rounded-full bg-background-100 px-2 py-1.5">
          <span className="text-xs text-foreground-500 px-1">专注</span>
          <button
            onClick={() => changeFocus(-5)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-background-50 text-foreground-600 hover:text-primary-600 cursor-pointer"
            aria-label="减少专注时长"
          >
            <i className="ri-subtract-line" />
          </button>
          <span className="text-sm font-medium text-foreground-900 w-10 text-center">{focusMinutes}分</span>
          <button
            onClick={() => changeFocus(5)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-background-50 text-foreground-600 hover:text-primary-600 cursor-pointer"
            aria-label="增加专注时长"
          >
            <i className="ri-add-line" />
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-background-100 px-2 py-1.5">
          <span className="text-xs text-foreground-500 px-1">休息</span>
          <button
            onClick={() => changeBreak(-1)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-background-50 text-foreground-600 hover:text-primary-600 cursor-pointer"
            aria-label="减少休息时长"
          >
            <i className="ri-subtract-line" />
          </button>
          <span className="text-sm font-medium text-foreground-900 w-10 text-center">{breakMinutes}分</span>
          <button
            onClick={() => changeBreak(1)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-background-50 text-foreground-600 hover:text-primary-600 cursor-pointer"
            aria-label="增加休息时长"
          >
            <i className="ri-add-line" />
          </button>
        </div>
      </div>

      {/* 统计 */}
      <div>
        <h4 className="text-sm font-semibold text-foreground-700 mb-3">
          <a href="#" className="text-inherit hover:text-primary-600 transition-colors">专注统计</a>
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="flex flex-col gap-2 rounded-lg bg-background-50 border border-background-200 p-4"
            >
              <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <i className={`${card.icon} text-base`} />
              </span>
              <p className="text-xl font-heading font-bold text-foreground-900">
                {card.value}
                <span className="ml-1 text-xs font-normal text-foreground-500">{card.unit}</span>
              </p>
              <p className="text-xs text-foreground-500">{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 最近记录 */}
      {sessions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground-700 mb-3">
            <a href="#" className="text-inherit hover:text-primary-600 transition-colors">最近专注</a>
          </h4>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-lg bg-background-50 border border-background-200 p-3"
              >
                <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent-100 text-accent-600 shrink-0">
                  <i className="ri-timer-flash-line" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground-900 truncate">{taskTitleById(s.task_id)}</p>
                  <p className="text-xs text-foreground-500">{formatSessionTime(s.start_time)}</p>
                </div>
                <span className="text-sm font-heading font-bold text-foreground-900 shrink-0">
                  {s.duration_minutes} 分钟
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 提示浮层 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-foreground-900 text-background-50 text-sm shadow-sm whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}