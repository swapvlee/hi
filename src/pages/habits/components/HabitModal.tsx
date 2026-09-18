import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import type { Habit } from "@/pages/habits/types";

interface HabitModalProps {
  editing: Habit | null;
  onClose: () => void;
  onSaved: () => void;
}

const iconOptions = [
  "ri-water-flash-line",
  "ri-book-open-line",
  "ri-run-line",
  "ri-mental-health-line",
  "ri-rest-time-line",
  "ri-cup-line",
  "ri-sun-line",
  "ri-moon-line",
  "ri-heart-pulse-line",
  "ri-basketball-line",
  "ri-english-input",
  "ri-plant-line",
];

const colorOptions = [
  { key: "primary", label: "青绿", dot: "bg-primary-500" },
  { key: "accent", label: "琥珀", dot: "bg-accent-500" },
  { key: "secondary", label: "薄荷", dot: "bg-secondary-500" },
];

export default function HabitModal({ editing, onClose, onSaved }: HabitModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState(editing?.name ?? "");
  const [icon, setIcon] = useState(editing?.icon ?? "ri-water-flash-line");
  const [color, setColor] = useState(editing?.color ?? "primary");
  const [reminderTime, setReminderTime] = useState(editing?.reminder_time?.slice(0, 5) ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErr("请输入习惯名称");
      return;
    }
    setSaving(true);
    setErr("");

    const payload = {
      name: name.trim(),
      icon,
      color,
      reminder_time: reminderTime || null,
    };

    if (editing) {
      const { error } = await supabase.from("habits").update(payload).eq("id", editing.id);
      if (error) {
        setErr(getErrorMessage(error, "保存失败，请稍后重试"));
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("habits").insert({ ...payload, user_id: user!.id });
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
            {editing ? "编辑习惯" : "新建习惯"}
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="习惯名称，如「每天喝水」"
          className="w-full px-4 py-3 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />

        {/* 图标选择 */}
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-500 mb-2">图标</p>
          <div className="grid grid-cols-6 gap-2">
            {iconOptions.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg transition-colors cursor-pointer ${
                  icon === ic
                    ? "bg-primary-100 text-primary-600 ring-2 ring-primary-300"
                    : "bg-background-100 text-foreground-500 hover:bg-background-200"
                }`}
                aria-label={ic}
              >
                <i className={ic} />
              </button>
            ))}
          </div>
        </div>

        {/* 颜色选择 */}
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-500 mb-2">颜色</p>
          <div className="flex gap-2">
            {colorOptions.map((c) => (
              <button
                key={c.key}
                onClick={() => setColor(c.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors cursor-pointer whitespace-nowrap ${
                  color === c.key
                    ? "bg-background-100 ring-2 ring-primary-300"
                    : "hover:bg-background-100"
                }`}
              >
                <span className={`w-4 h-4 rounded-full ${c.dot}`} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 提醒时间 */}
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-500 mb-2">提醒时间（可选）</p>
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="w-full px-3 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 focus:outline-none focus:border-primary-400"
          />
        </div>

        {editing && (
          <div className="mt-4 text-sm text-foreground-500">
            已连续培养这个习惯，加油！
          </div>
        )}

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