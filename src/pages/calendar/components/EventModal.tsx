import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import {
  CalEvent,
  dayKey,
  eventColorKeys,
  timeLabel,
  todayKey,
  toIso,
} from "@/pages/calendar/calendarUtils";

interface EventModalProps {
  editing: CalEvent | null;
  initialDate: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const colorOptions = [
  { key: "primary", label: "青绿", dot: "bg-primary-500" },
  { key: "accent", label: "琥珀", dot: "bg-accent-500" },
  { key: "secondary", label: "薄荷", dot: "bg-secondary-500" },
];

export default function EventModal({ editing, initialDate, onClose, onSaved }: EventModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [location, setLocation] = useState(editing?.location ?? "");
  const [allDay, setAllDay] = useState(editing?.all_day ?? false);
  const [date, setDate] = useState(editing ? dayKey(editing.start_time) : initialDate ?? todayKey());
  const [startTime, setStartTime] = useState(editing && !editing.all_day ? timeLabel(editing.start_time) : "09:00");
  const [endTime, setEndTime] = useState(
    editing && !editing.all_day && editing.end_time ? timeLabel(editing.end_time) : "10:00"
  );
  const [color, setColor] = useState(eventColorKeys.includes(editing?.color ?? "") ? editing!.color : "primary");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErr("请输入日程标题");
      return;
    }
    setSaving(true);
    setErr("");

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      all_day: allDay,
      color,
      start_time: allDay ? toIso(date) : toIso(date, startTime),
      end_time: allDay ? null : toIso(date, endTime),
    };

    if (editing) {
      const { error } = await supabase.from("events").update(payload).eq("id", editing.id);
      if (error) {
        setErr(getErrorMessage(error, "保存失败，请稍后重试"));
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("events").insert({ ...payload, user_id: user!.id });
      if (error) {
        setErr(getErrorMessage(error, "保存失败，请稍后重试"));
        setSaving(false);
        return;
      }
    }

    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground-950/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-background-50 rounded-t-2xl sm:rounded-lg px-5 py-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-lg text-foreground-900">
            {editing ? "编辑日程" : "新建日程"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 cursor-pointer"
            aria-label="关闭"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="日程标题，如「产品评审会」"
          className="w-full px-4 py-3 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />

        {/* 全天 */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-foreground-700">全天日程</span>
          <button
            onClick={() => setAllDay(!allDay)}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              allDay ? "bg-primary-500" : "bg-background-300"
            }`}
            aria-label="全天"
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-background-50 transition-all ${
                allDay ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {/* 日期时间 */}
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-500 mb-2">日期</p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 focus:outline-none focus:border-primary-400"
          />
        </div>

        {!allDay && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-foreground-500 mb-2">开始时间</p>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 focus:outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground-500 mb-2">结束时间</p>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 focus:outline-none focus:border-primary-400"
              />
            </div>
          </div>
        )}

        {/* 地点 */}
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-500 mb-2">地点（可选）</p>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="会议室 / 咖啡馆 / 线上"
            className="w-full px-4 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400"
          />
        </div>

        {/* 备注 */}
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-500 mb-2">备注（可选）</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="补充说明..."
            className="w-full px-4 py-3 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 resize-none"
          />
        </div>

        {/* 颜色 */}
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-500 mb-2">标记颜色</p>
          <div className="flex gap-2">
            {colorOptions.map((c) => (
              <button
                key={c.key}
                onClick={() => setColor(c.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors cursor-pointer whitespace-nowrap ${
                  color === c.key ? "bg-background-100 ring-2 ring-primary-300" : "hover:bg-background-100"
                }`}
              >
                <span className={`w-4 h-4 rounded-full ${c.dot}`} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {err && <p className="mt-3 text-sm text-accent-700">{err}</p>}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-md border border-background-200 text-sm text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}