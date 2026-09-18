import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import type { Todo } from "@/pages/todos/page";

interface TodoModalProps {
  editing: Todo | null;
  onClose: () => void;
  onSaved: () => void;
}

const priorities = [
  { value: 2, label: "高", icon: "ri-flag-fill", cls: "bg-accent-100 text-accent-700" },
  { value: 1, label: "中", icon: "ri-flag-line", cls: "bg-primary-100 text-primary-700" },
  { value: 0, label: "低", icon: "ri-flag-line", cls: "bg-background-100 text-foreground-500" },
];

export default function TodoModal({ editing, onClose, onSaved }: TodoModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [priority, setPriority] = useState(editing?.priority ?? 1);
  const [dueDate, setDueDate] = useState(editing?.due_date ?? "");
  const [dueTime, setDueTime] = useState(editing?.due_time?.slice(0, 5) ?? "");
  const [tags, setTags] = useState((editing?.tags ?? []).join(" "));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErr("请输入任务内容");
      return;
    }
    setSaving(true);
    setErr("");

    const payload = {
      title: title.trim(),
      notes: notes.trim() || null,
      priority,
      due_date: dueDate || null,
      due_time: dueTime ? dueTime + ":00" : null,
      tags: tags.trim() ? tags.trim().split(/\s+/).filter(Boolean) : null,
    };

    if (editing) {
      const { error } = await supabase.from("todos").update(payload).eq("id", editing.id);
      if (error) {
        setErr(getErrorMessage(error, "保存失败，请稍后重试"));
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("todos").insert({ ...payload, user_id: user!.id });
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
        className="w-full sm:max-w-md bg-background-50 rounded-t-2xl sm:rounded-lg px-5 py-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-lg text-foreground-900">
            {editing ? "编辑任务" : "添加任务"}
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
          placeholder="准备做点什么？"
          className="w-full px-4 py-3 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="备注（可选）"
          rows={3}
          className="mt-3 w-full px-4 py-3 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none"
        />

        {/* 优先级 */}
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-500 mb-2">优先级</p>
          <div className="flex gap-2">
            {priorities.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  priority === p.value
                    ? p.cls + " ring-2 ring-offset-1 ring-primary-300"
                    : "bg-background-100 text-foreground-500 hover:bg-background-200"
                }`}
              >
                <i className={p.icon} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 截止日期 */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-foreground-500 mb-2">截止日期</p>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 focus:outline-none focus:border-primary-400"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground-500 mb-2">时间（可选）</p>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 focus:outline-none focus:border-primary-400"
            />
          </div>
        </div>

        {/* 标签 */}
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-500 mb-2">标签（空格分隔，可选）</p>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="工作 重要"
            className="w-full px-4 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400"
          />
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