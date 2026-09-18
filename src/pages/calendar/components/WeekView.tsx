import type { CalEvent } from "@/pages/calendar/calendarUtils";
import { colorOf, timeLabel, weekdayShort } from "@/pages/calendar/calendarUtils";

interface WeekViewProps {
  weekStart: Date;
  eventsByDay: Map<string, CalEvent[]>;
  today: string;
  onAddDay: (date: string) => void;
  onEditEvent: (event: CalEvent) => void;
}

export default function WeekView({
  weekStart,
  eventsByDay,
  today,
  onAddDay,
  onEditEvent,
}: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="space-y-2">
      {days.map((d) => {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
        const dayEvents = eventsByDay.get(key) ?? [];
        const isToday = key === today;

        return (
          <div
            key={key}
            className={`flex items-start gap-3 rounded-lg p-3 md:p-4 border ${
              isToday ? "bg-primary-50 border-primary-200" : "bg-background-50 border-background-200"
            }`}
          >
            <div className="w-14 shrink-0 text-center">
              <p className={`text-xs ${isToday ? "text-primary-600" : "text-foreground-400"}`}>
                周{weekdayShort(d)}
              </p>
              <p className={`text-xl font-heading font-bold ${isToday ? "text-primary-700" : "text-foreground-900"}`}>
                {d.getDate()}
              </p>
            </div>

            <div className="flex-1 min-w-0">
              {dayEvents.length === 0 ? (
                <p className="text-sm text-foreground-400 py-2">暂无日程</p>
              ) : (
                <ul className="space-y-1.5">
                  {dayEvents.map((e) => {
                    const c = colorOf(e.color);
                    return (
                      <li key={e.id}>
                        <button
                          onClick={() => onEditEvent(e)}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md bg-background-100 hover:bg-background-200 transition-colors cursor-pointer"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                          <span className="text-xs text-foreground-500 shrink-0 tabular-nums">
                            {e.all_day ? "全天" : timeLabel(e.start_time)}
                          </span>
                          <span className="text-sm text-foreground-900 truncate flex-1">{e.title}</span>
                          {e.location && (
                            <span className="hidden sm:flex items-center gap-1 text-xs text-foreground-400 shrink-0">
                              <i className="ri-map-pin-line" />
                              {e.location}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button
              onClick={() => onAddDay(key)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 hover:text-primary-600 transition-colors cursor-pointer shrink-0"
              aria-label="添加日程"
            >
              <i className="ri-add-line" />
            </button>
          </div>
        );
      })}
    </div>
  );
}