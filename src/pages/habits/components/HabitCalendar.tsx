import { useMemo, useState } from "react";
import type { Habit } from "@/pages/habits/types";
import { colorMap, todayStr } from "@/pages/habits/constants";

interface HabitCalendarProps {
  habits: Habit[];
  logsByDate: Map<string, Set<string>>;
}

const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

export default function HabitCalendar({ habits, logsByDate }: HabitCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based

  const today = todayStr();

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    // 周一为起始，getDay() 周日=0
    let offset = first.getDay() - 1;
    if (offset < 0) offset = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // 前导空白
    for (let i = 0; i < offset; i++) {
      result.push({ date: "", day: 0, isCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      result.push({ date: ds, day: d, isCurrentMonth: true });
    }
    return result;
  }, [year, month]);

  const monthLabel = `${year}年${month + 1}月`;

  const goPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };
  const goNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const totalHabits = habits.length;

  return (
    <div className="rounded-lg bg-background-50 border border-background-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-foreground-700">
          <a href="#" className="text-inherit hover:text-primary-600 transition-colors">打卡日历</a>
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-background-100 text-foreground-600 hover:bg-background-200 transition-colors cursor-pointer"
            aria-label="上个月"
          >
            <i className="ri-arrow-left-s-line" />
          </button>
          <span className="text-sm font-medium text-foreground-900 w-20 text-center">{monthLabel}</span>
          <button
            onClick={goNext}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-background-100 text-foreground-600 hover:bg-background-200 transition-colors cursor-pointer"
            aria-label="下个月"
          >
            <i className="ri-arrow-right-s-line" />
          </button>
        </div>
      </div>

      {/* 图例 */}
      {totalHabits > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {habits.slice(0, 6).map((h) => {
            const c = colorMap[h.color] ?? colorMap.primary;
            return (
              <span key={h.id} className="flex items-center gap-1.5 text-xs text-foreground-500">
                <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                {h.name}
              </span>
            );
          })}
          {totalHabits > 6 && (
            <span className="text-xs text-foreground-400">+{totalHabits - 6}</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs text-foreground-400 py-1">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell.isCurrentMonth) {
            return <div key={i} className="aspect-square rounded-md" />;
          }
          const doneIds = logsByDate.get(cell.date) ?? new Set<string>();
          const doneCount = doneIds.size;
          const isToday = cell.date === today;
          const full = totalHabits > 0 && doneCount >= totalHabits;

          return (
            <div
              key={i}
              className={`aspect-square rounded-md flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
                isToday
                  ? "ring-2 ring-primary-400 bg-primary-50"
                  : full
                  ? "bg-primary-100"
                  : doneCount > 0
                  ? "bg-background-100"
                  : "bg-background-50 border border-background-100"
              }`}
            >
              <span className={isToday ? "font-bold text-primary-700" : "text-foreground-700"}>
                {cell.day}
              </span>
              {totalHabits > 0 && doneCount > 0 && (
                <span className="flex flex-wrap justify-center gap-0.5 px-1">
                  {Array.from(doneIds)
                    .slice(0, 3)
                    .map((hid) => {
                      const h = habits.find((x) => x.id === hid);
                      const c = colorMap[h?.color ?? "primary"] ?? colorMap.primary;
                      return <span key={hid} className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />;
                    })}
                  {doneCount > 3 && (
                    <span className="text-[9px] text-foreground-400 leading-none">+{doneCount - 3}</span>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}