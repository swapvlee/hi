import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import HabitModal from "@/pages/habits/components/HabitModal";
import HabitCalendar from "@/pages/habits/components/HabitCalendar";
import EmptyState from "@/components/base/EmptyState";

import type { Habit, HabitLog } from "@/pages/habits/types";

import { colorMap, todayStr } from "@/pages/habits/constants";

export default function Habits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const today = todayStr();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [habitsRes, logsRes] = await Promise.all([
        supabase.from("habits").select("*").order("created_at", { ascending: true }),
        supabase.from("habit_logs").select("*"),
      ]);
      if (habitsRes.error) throw habitsRes.error;
      if (logsRes.error) throw logsRes.error;
      setHabits((habitsRes.data ?? []) as Habit[]);
      setLogs((logsRes.data ?? []) as HabitLog[]);
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const logsByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const l of logs) {
      if (!map.has(l.log_date)) map.set(l.log_date, new Set());
      map.get(l.log_date)!.add(l.habit_id);
    }
    return map;
  }, [logs]);

  const todayDoneIds = logsByDate.get(today) ?? new Set<string>();

  const toggleToday = async (habit: Habit) => {
    const done = todayDoneIds.has(habit.id);
    if (done) {
      const target = logs.find((l) => l.habit_id === habit.id && l.log_date === today);
      if (target) {
        const { error: err } = await supabase.from("habit_logs").delete().eq("id", target.id);
        if (err) {
          setError(getErrorMessage(err, "操作失败，请稍后重试"));
          return;
        }
        setLogs((prev) => prev.filter((l) => l.id !== target.id));
      }
    } else {
      const { data, error: err } = await supabase
        .from("habit_logs")
        .insert({ habit_id: habit.id, user_id: user!.id, log_date: today, completed: true })
        .select()
        .single();
      if (err) {
        setError(getErrorMessage(err, "操作失败，请稍后重试"));
        return;
      }
      setLogs((prev) => [...prev, data as HabitLog]);
    }
  };

  const toggleArchive = async (habit: Habit) => {
    const { error: err } = await supabase
      .from("habits")
      .update({ archived: !habit.archived })
      .eq("id", habit.id);
    if (err) {
      setError(getErrorMessage(err, "操作失败，请稍后重试"));
      return;
    }
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, archived: !h.archived } : h)));
  };

  const visibleHabits = habits.filter((h) => showArchived || !h.archived);
  const activeHabits = habits.filter((h) => !h.archived);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (habit: Habit) => {
    setEditing(habit);
    setModalOpen(true);
  };
  const handleSaved = () => {
    setModalOpen(false);
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground-900">习惯打卡</h1>
          <p className="mt-1 text-sm text-foreground-500">每天坚持一点点，慢慢变成更好的自己</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" />
          新建习惯
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-accent-100/70 text-accent-800 px-4 py-3 text-sm">
          <span>{error}</span>
          <button onClick={load} className="font-medium underline cursor-pointer whitespace-nowrap">
            重试
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* 今日打卡卡片 */}
          <div>
            <h4 className="text-sm font-semibold text-foreground-700 mb-3">
              <a href="#" className="text-inherit hover:text-primary-600 transition-colors">今日打卡</a>
            </h4>
            {activeHabits.length === 0 ? (
              <EmptyState
                icon="ri-repeat-line"
                accent="bg-secondary-100 text-secondary-700"
                title="还没有习惯"
                description="每天坚持一点点，慢慢变成更好的自己"
                actionLabel="新建习惯"
                onAction={openAdd}
              />
            ) : (
              <ul className="space-y-2">
                {activeHabits.map((habit) => {
                  const c = colorMap[habit.color] ?? colorMap.primary;
                  const done = todayDoneIds.has(habit.id);
                  return (
                    <li
                      key={habit.id}
                      className="group flex items-center gap-3 rounded-lg bg-background-50 border border-background-200 p-4 hover:border-background-300 transition-colors"
                    >
                      <span className={`w-11 h-11 flex items-center justify-center rounded-lg ${c.bg} ${c.text} shrink-0`}>
                        <i className={`${habit.icon} text-xl`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground-900">{habit.name}</p>
                        <p className="mt-0.5 text-xs text-foreground-500">
                          每日 · 已连续打卡
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(habit)}
                          className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          aria-label="编辑"
                        >
                          <i className="ri-edit-line" />
                        </button>
                        <button
                          onClick={() => toggleToday(habit)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            done
                              ? "bg-primary-500 text-background-50 hover:bg-primary-600"
                              : "bg-background-100 text-foreground-600 hover:bg-background-200"
                          }`}
                        >
                          <i className={done ? "ri-check-fill" : "ri-check-line"} />
                          {done ? "已打卡" : "打卡"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* 打卡日历 */}
          <HabitCalendar habits={activeHabits} logsByDate={logsByDate} />

          {/* 已归档 */}
          {habits.some((h) => h.archived) && (
            <div>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-1 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
              >
                <i className={showArchived ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} />
                已归档 ({habits.filter((h) => h.archived).length})
              </button>
              {showArchived && (
                <ul className="mt-3 space-y-2">
                  {habits.filter((h) => h.archived).map((habit) => {
                    const c = colorMap[habit.color] ?? colorMap.primary;
                    return (
                      <li
                        key={habit.id}
                        className="flex items-center gap-3 rounded-lg bg-background-100 border border-background-200 p-4 opacity-70"
                      >
                        <span className={`w-11 h-11 flex items-center justify-center rounded-lg ${c.bg} ${c.text} shrink-0`}>
                          <i className={`${habit.icon} text-xl`} />
                        </span>
                        <span className="flex-1 text-sm text-foreground-600 line-through">{habit.name}</span>
                        <button
                          onClick={() => toggleArchive(habit)}
                          className="px-3 py-1.5 rounded-md bg-background-50 border border-background-200 text-xs text-foreground-600 hover:bg-background-200 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          恢复
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <HabitModal
          editing={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}