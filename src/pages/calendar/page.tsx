import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import MonthView from "@/pages/calendar/components/MonthView";
import WeekView from "@/pages/calendar/components/WeekView";
import EventModal from "@/pages/calendar/components/EventModal";
import {
  CalEvent,
  dayKey,
  monthLabel,
  startOfWeek,
  todayKey,
} from "@/pages/calendar/calendarUtils";

type View = "month" | "week";

export default function Calendar() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [initialDate, setInitialDate] = useState<string | null>(null);

  const today = todayKey();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase
        .from("events")
        .select("*")
        .order("start_time", { ascending: true });
      if (err) throw err;
      setEvents((data ?? []) as CalEvent[]);
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const k = dayKey(e.start_time);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const weekStart = startOfWeek(cursor);

  const goPrev = () => {
    if (view === "month") {
      setCursor(new Date(year, month - 1, 1));
    } else {
      const d = new Date(weekStart);
      d.setDate(d.getDate() - 7);
      setCursor(d);
    }
  };

  const goNext = () => {
    if (view === "month") {
      setCursor(new Date(year, month + 1, 1));
    } else {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + 7);
      setCursor(d);
    }
  };

  const goToday = () => setCursor(new Date());

  const openNew = (date?: string) => {
    setEditing(null);
    setInitialDate(date ?? null);
    setModalOpen(true);
  };

  const openEdit = (event: CalEvent) => {
    setEditing(event);
    setInitialDate(null);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditing(null);
    setInitialDate(null);
    load();
  };

  const headerLabel =
    view === "month"
      ? monthLabel(year, month)
      : `${weekStart.getMonth() + 1}月${weekStart.getDate()}日 - ${(() => {
          const end = new Date(weekStart);
          end.setDate(end.getDate() + 6);
          return `${end.getMonth() + 1}月${end.getDate()}日`;
        })()}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground-900">日程日历</h1>
          <p className="mt-1 text-sm text-foreground-500">安排每一天，从容不迫</p>
        </div>
        <button
          onClick={() => openNew()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" />
          新建日程
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

      {/* 视图切换 + 导航 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-full bg-background-100 w-fit">
          <button
            onClick={() => setView("month")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              view === "month" ? "bg-background-50 text-primary-700" : "text-foreground-500 hover:text-foreground-700"
            }`}
          >
            月历
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              view === "week" ? "bg-background-50 text-primary-700" : "text-foreground-500 hover:text-foreground-700"
            }`}
          >
            周历
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-background-100 text-foreground-600 hover:bg-background-200 transition-colors cursor-pointer"
            aria-label="上一页"
          >
            <i className="ri-arrow-left-s-line" />
          </button>
          <span className="text-sm font-medium text-foreground-900 min-w-[120px] text-center">
            {headerLabel}
          </span>
          <button
            onClick={goNext}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-background-100 text-foreground-600 hover:bg-background-200 transition-colors cursor-pointer"
            aria-label="下一页"
          >
            <i className="ri-arrow-right-s-line" />
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-md text-sm text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            今天
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : view === "month" ? (
        <MonthView
          year={year}
          month={month}
          eventsByDay={eventsByDay}
          today={today}
          onAddDay={openNew}
          onEditEvent={openEdit}
        />
      ) : (
        <WeekView
          weekStart={weekStart}
          eventsByDay={eventsByDay}
          today={today}
          onAddDay={openNew}
          onEditEvent={openEdit}
        />
      )}

      {modalOpen && (
        <EventModal
          editing={editing}
          initialDate={initialDate}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
            setInitialDate(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}