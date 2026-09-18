import { useMemo } from "react";
import type { CalEvent } from "@/pages/calendar/calendarUtils";
import { colorOf, timeLabel } from "@/pages/calendar/calendarUtils";

interface MonthViewProps {
  year: number;
  month: number;
  eventsByDay: Map<string, CalEvent[]>;
  today: string;
  onAddDay: (date: string) => void;
  onEditEvent: (event: CalEvent) => void;
}

const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

export default function MonthView({
  year,
  month,
  eventsByDay,
  today,
  onAddDay,
  onEditEvent,
}: MonthViewProps) {
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    let offset = first.getDay() - 1;
    if (offset < 0) offset = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < offset; i++) {
      result.push({ date: "", day: 0, isCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      result.push({ date: ds, day: d, isCurrentMonth: true });
    }
    return result;
  }, [year, month]);

  return (
    <div className="rounded-lg bg-background-50 border border-background-200 p-3 md:p-4">
      <div className="grid grid-cols-7 gap-1.5 mb-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs text-foreground-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => {
          if (!cell.isCurrentMonth) {
            return <div key={i} className="min-h-[72px] rounded-md" />;
          }
          const dayEvents = eventsByDay.get(cell.date) ?? [];
          const isToday = cell.date === today;

          return (
            <div
              key={i}
              onClick={() => onAddDay(cell.date)}
              className={`min-h-[72px] rounded-md p-1.5 flex flex-col gap-1 transition-colors cursor-pointer ${
                isToday
                  ? "bg-primary-50 ring-2 ring-primary-300"
                  : "bg-background-50 border border-background-100 hover:border-background-300"
              }`}
            >
              <span
                className={`text-xs self-end ${
                  isToday ? "font-bold text-primary-700" : "text-foreground-600"
                }`}
              >
                {cell.day}
              </span>

              {dayEvents.slice(0, 2).map((e) => {
                const c = colorOf(e.color);
                return (
                  <button
                    key={e.id}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEditEvent(e);
                    }}
                    className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate ${c.chip} cursor-pointer`}
                  >
                    {!e.all_day && (
                      <span className="mr-0.5 opacity-70">{timeLabel(e.start_time)}</span>
                    )}
                    {e.title}
                  </button>
                );
              })}

              {dayEvents.length > 2 && (
                <span className="text-[10px] text-foreground-400 px-1.5">
                  还有 {dayEvents.length - 2} 项
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}