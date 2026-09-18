import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import {
  ReviewType,
  periodRange,
  periodDateKey,
  addDays,
  dateKey,
  formatReviewDate,
} from "@/pages/review/reviewUtils";
import { toPng } from "html-to-image";
import EmptyState from "@/components/base/EmptyState";

interface ReviewStats {
  todoDone: number;
  todoCreated: number;
  habitDone: number;
  habitTotal: number;
  focusMinutes: number;
  focusCount: number;
  noteCount: number;
  moods: string[];
  eventCount: number;
}

interface Review {
  id: string;
  review_type: string;
  period_date: string;
  content: string | null;
  created_at: string;
}

const emptyStats: ReviewStats = {
  todoDone: 0,
  todoCreated: 0,
  habitDone: 0,
  habitTotal: 0,
  focusMinutes: 0,
  focusCount: 0,
  noteCount: 0,
  moods: [],
  eventCount: 0,
};

function weekdayLabel(d: Date) {
  const names = ["日", "一", "二", "三", "四", "五", "六"];
  return `星期${names[d.getDay()]}`;
}

export default function Review() {
  const { user } = useAuth();
  const [type, setType] = useState<ReviewType>("daily");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [stats, setStats] = useState<ReviewStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Review[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);
  const reflectionRef = useRef<HTMLTextAreaElement>(null);
  const [exporting, setExporting] = useState(false);

  const periodDate = periodDateKey(type, anchor);
  const { label } = periodRange(type, anchor);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { start, end } = periodRange(type, anchor);
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const startKey = dateKey(start);
      const endKey = dateKey(addDays(end, -1));

      const [todosDoneRes, todosCreatedRes, habitsRes, logsRes, pomodoroRes, notesRes, eventsRes] =
        await Promise.all([
          supabase
            .from("todos")
            .select("id", { count: "exact", head: true })
            .eq("completed", true)
            .gte("completed_at", startIso)
            .lt("completed_at", endIso),
          supabase
            .from("todos")
            .select("id", { count: "exact", head: true })
            .gte("created_at", startIso)
            .lt("created_at", endIso),
          supabase.from("habits").select("id", { count: "exact", head: true }).eq("archived", false),
          supabase
            .from("habit_logs")
            .select("id", { count: "exact", head: true })
            .eq("completed", true)
            .gte("log_date", startKey)
            .lte("log_date", endKey),
          supabase
            .from("pomodoro_sessions")
            .select("duration_minutes, type")
            .eq("type", "focus")
            .gte("start_time", startIso)
            .lt("start_time", endIso),
          supabase.from("notes").select("mood").gte("created_at", startIso).lt("created_at", endIso),
          supabase
            .from("events")
            .select("id", { count: "exact", head: true })
            .gte("start_time", startIso)
            .lt("start_time", endIso),
        ]);

      for (const r of [todosDoneRes, todosCreatedRes, habitsRes, logsRes, pomodoroRes, notesRes, eventsRes]) {
        if (r.error) throw r.error;
      }

      const focusList = (pomodoroRes.data ?? []) as { duration_minutes: number | null }[];
      const notesList = (notesRes.data ?? []) as { mood: string | null }[];

      setStats({
        todoDone: todosDoneRes.count ?? 0,
        todoCreated: todosCreatedRes.count ?? 0,
        habitDone: logsRes.count ?? 0,
        habitTotal: habitsRes.count ?? 0,
        focusMinutes: focusList.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0),
        focusCount: focusList.length,
        noteCount: notesList.length,
        moods: notesList.map((n) => n.mood).filter(Boolean) as string[],
        eventCount: eventsRes.count ?? 0,
      });
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, [type, anchor]);

  const loadHistory = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from("reviews")
        .select("*")
        .order("period_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (err) throw err;
      setHistory((data ?? []) as Review[]);
    } catch (e) {
      setError(getErrorMessage(e, "加载历史失败"));
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 切换周期时回填已保存的思考
  useEffect(() => {
    const existing = history.find((r) => r.review_type === type && r.period_date === periodDate);
    setReflection(existing?.content ?? "");
  }, [type, periodDate, history]);

  const shift = (delta: number) => {
    const next = addDays(anchor, type === "daily" ? delta : delta * 7);
    setAnchor(next);
  };

  const switchType = (t: ReviewType) => {
    if (t === type) return;
    setType(t);
  };

  const backToToday = () => {
    setAnchor(new Date());
  };

  const habitRate =
    stats.habitTotal > 0 ? Math.round((stats.habitDone / stats.habitTotal) * 100) : 0;

  const summaryItems = [
    {
      icon: "ri-checkbox-circle-line",
      text: `完成待办 ${stats.todoDone} 项${stats.todoCreated > 0 ? `，新增 ${stats.todoCreated} 项` : ""}`,
    },
    {
      icon: "ri-repeat-line",
      text:
        stats.habitTotal > 0
          ? `习惯打卡 ${stats.habitDone}/${stats.habitTotal}，达成率 ${habitRate}%`
          : "还没有建立习惯，去添加一个吧",
    },
    {
      icon: "ri-timer-line",
      text:
        stats.focusMinutes > 0
          ? `专注 ${stats.focusMinutes} 分钟，共 ${stats.focusCount} 次`
          : "这段时间还没有专注记录",
    },
    {
      icon: "ri-sticky-note-line",
      text: stats.noteCount > 0 ? `写了 ${stats.noteCount} 篇日记` : "还没有写日记",
    },
    {
      icon: "ri-calendar-line",
      text: stats.eventCount > 0 ? `安排了 ${stats.eventCount} 项日程` : "这段时间没有日程安排",
    },
  ];

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const existing = history.find((r) => r.review_type === type && r.period_date === periodDate);
      if (existing) {
        const { error: err } = await supabase
          .from("reviews")
          .update({ content: reflection.trim() || null, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("reviews").insert({
          user_id: user!.id,
          review_type: type,
          period_date: periodDate,
          content: reflection.trim() || null,
        });
        if (err) throw err;
      }
      await loadHistory();
    } catch (e) {
      setError(getErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const deleteReview = async (r: Review) => {
    const { error: err } = await supabase.from("reviews").delete().eq("id", r.id);
    if (err) {
      setError(getErrorMessage(err, "删除失败，请稍后重试"));
      return;
    }
    setHistory((prev) => prev.filter((x) => x.id !== r.id));
  };

  const exportImage = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `拾光-${type === "daily" ? "日报" : "周报"}-${periodDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      setError(getErrorMessage(e, "导出图片失败"));
    } finally {
      setExporting(false);
    }
  };

  const statCards = [
    { label: "完成待办", value: stats.todoDone, unit: "项", icon: "ri-checkbox-circle-line", accent: "bg-accent-100 text-accent-600" },
    { label: "习惯打卡", value: stats.habitTotal > 0 ? `${stats.habitDone}/${stats.habitTotal}` : "—", unit: "完成", icon: "ri-repeat-line", accent: "bg-secondary-100 text-secondary-700" },
    { label: "专注时长", value: stats.focusMinutes, unit: "分钟", icon: "ri-timer-line", accent: "bg-primary-100 text-primary-600" },
    { label: "日记", value: stats.noteCount, unit: "篇", icon: "ri-sticky-note-line", accent: "bg-accent-100 text-accent-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground-900">复盘回顾</h1>
          <p className="mt-1 text-sm text-foreground-500">回望这段时光，看见自己的成长</p>
        </div>
        <button
          onClick={exportImage}
          disabled={exporting}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
        >
          <i className="ri-download-2-line" />
          {exporting ? "生成中..." : "导出图片"}
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-accent-100/70 text-accent-800 px-4 py-3 text-sm">
          <span>{error}</span>
          <button
            onClick={() => {
              loadStats();
              loadHistory();
            }}
            className="font-medium underline cursor-pointer whitespace-nowrap"
          >
            重试
          </button>
        </div>
      )}

      {/* 周期选择 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-full bg-background-100 w-fit">
          <button
            onClick={() => switchType("daily")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              type === "daily" ? "bg-background-50 text-primary-700" : "text-foreground-500 hover:text-foreground-700"
            }`}
          >
            日报
          </button>
          <button
            onClick={() => switchType("weekly")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              type === "weekly" ? "bg-background-50 text-primary-700" : "text-foreground-500 hover:text-foreground-700"
            }`}
          >
            周报
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-background-100 text-foreground-600 hover:bg-background-200 transition-colors cursor-pointer"
            aria-label="上一个"
          >
            <i className="ri-arrow-left-s-line" />
          </button>
          <span className="text-sm font-medium text-foreground-900 min-w-[120px] text-center whitespace-nowrap">
            {label}
          </span>
          <button
            onClick={() => shift(1)}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-background-100 text-foreground-600 hover:bg-background-200 transition-colors cursor-pointer"
            aria-label="下一个"
          >
            <i className="ri-arrow-right-s-line" />
          </button>
          <button
            onClick={backToToday}
            className="px-3 py-1.5 rounded-md bg-background-100 text-xs text-foreground-600 hover:bg-background-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            回到今天
          </button>
        </div>
      </div>

      {/* 导出区域：品牌头 + 统计卡片 + 汇总 */}
      <div ref={reportRef} className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-background-200">
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary-500 text-background-50">
            <i className="ri-sparkling-2-line text-lg" />
          </div>
          <div>
            <p className="font-heading font-bold text-foreground-900">拾光 · {type === "daily" ? "日报" : "周报"}</p>
            <p className="text-xs text-foreground-500">{label}</p>
          </div>
        </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="flex flex-col gap-3 rounded-lg bg-background-50 border border-background-200 p-4">
            <span className={`w-10 h-10 flex items-center justify-center rounded-lg ${card.accent}`}>
              <i className={`${card.icon} text-lg`} />
            </span>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground-900">
                {card.value}
                <span className="ml-1 text-xs font-normal text-foreground-500">{card.unit}</span>
              </p>
              <p className="mt-0.5 text-sm text-foreground-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 自动汇总报告 */}
      <div className="rounded-lg bg-background-50 border border-background-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-foreground-700">
            <a href="#" className="text-inherit hover:text-primary-600 transition-colors">自动汇总</a>
          </h4>
          <span className="px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-700 text-xs">
            {type === "daily" ? "今日" : "本周"}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-7 h-7 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-sm text-foreground-600 leading-relaxed">
              {type === "daily" ? `${label}${weekdayLabel(anchor)}` : label}，这里是拾光为你整理的数据回顾。
            </p>
            <ul className="mt-4 space-y-2.5">
              {summaryItems.map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="w-7 h-7 flex items-center justify-center rounded-md bg-background-100 text-foreground-500 shrink-0">
                    <i className={`${item.icon} text-sm`} />
                  </span>
                  <span className="text-sm text-foreground-700 leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>
            {stats.moods.length > 0 && (
              <div className="mt-4 pt-4 border-t border-background-200">
                <p className="text-xs text-foreground-500 mb-2">这段时间的心情</p>
                <div className="flex flex-wrap gap-1.5">
                  {stats.moods.slice(0, 12).map((m, i) => (
                    <span key={i} className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-100 text-lg">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>

      {/* 我的思考 */}
      <div className="rounded-lg bg-background-50 border border-background-200 p-5">
        <h4 className="text-sm font-semibold text-foreground-700 mb-3">
          <a href="#" className="text-inherit hover:text-primary-600 transition-colors">我的思考</a>
        </h4>
        <textarea
          ref={reflectionRef}
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="写下这段时间的感悟、收获或想记住的事……"
          maxLength={500}
          className="w-full min-h-[120px] px-4 py-3 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-y"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-foreground-400">{reflection.length}/500</span>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-save-line" />
            {saving ? "保存中..." : "保存复盘"}
          </button>
        </div>
      </div>

      {/* 历史复盘 */}
      <div>
        <h4 className="text-sm font-semibold text-foreground-700 mb-3">
          <a href="#" className="text-inherit hover:text-primary-600 transition-colors">历史复盘</a>
        </h4>
        {history.length === 0 ? (
          <EmptyState
            icon="ri-history-line"
            accent="bg-accent-100 text-accent-600"
            title="还没有保存过复盘"
            description="写下第一条思考，留住成长的足迹"
            actionLabel="写下思考"
            actionIcon="ri-edit-line"
            onAction={() => reflectionRef.current?.focus()}
          />
        ) : (
          <ul className="space-y-2">
            {history.map((r) => (
              <li key={r.id} className="group flex items-start gap-3 rounded-lg bg-background-50 border border-background-200 p-4">
                <span
                  className={`w-9 h-9 flex items-center justify-center rounded-lg shrink-0 ${
                    r.review_type === "daily" ? "bg-accent-100 text-accent-600" : "bg-primary-100 text-primary-600"
                  }`}
                >
                  <i className={r.review_type === "daily" ? "ri-sun-line" : "ri-calendar-check-line"} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground-500">
                      {r.review_type === "daily" ? "日报" : "周报"}
                    </span>
                    <span className="text-sm font-medium text-foreground-900">{formatReviewDate(r.period_date)}</span>
                  </div>
                  {r.content && (
                    <p className="mt-1 text-sm text-foreground-600 leading-relaxed line-clamp-3">{r.content}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteReview(r)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-accent-100 hover:text-accent-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="删除"
                >
                  <i className="ri-delete-bin-line" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}