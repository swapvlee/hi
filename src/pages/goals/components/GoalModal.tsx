import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import type { Goal } from "@/pages/goals/types";
import { goalCategories, goalColorMap } from "@/pages/goals/constants";

interface GoalModalProps {
  editing: Goal | null;
  onClose: () => void;
  onSaved: () => void;
}

const colorOptions = [
  { key: "primary", label: "青绿", dot: "bg-primary-500" },
  { key: "accent", label: "琥珀", dot: "bg-accent-500" },
  { key: "secondary", label: "薄荷", dot: "bg-secondary-500" },
];

export default function GoalModal({ editing, onClose, onSaved }: GoalModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [category, setCategory] = useState(editing?.category ?? "事业");
  const [startDate, setStartDate] = useState(editing?.start_date ?? "");
  const [targetDate, setTargetDate] = useState(editing?.target_date ?? "");
  const [color, setColor] = useState(editing?.color ?? "primary");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErr("请输入目标名称");
      return;
    }
    setSaving(true);
    setErr("");

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      category,
      start_date: startDate || null,
      target_date: targetDate || null,
      color,
    };

    if (editing) {
      const { error } = await supabase.from("goals").update(payload).eq("id", editing.id);
      if (error) {
        setErr(getErrorMessage(error, "保存失败，请稍后重试"));
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("goals")
        .insert({ ...payload, user_id: user!.id, progress: 0 });
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
            {editing ? "编辑目标" : "新建目标"}
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
          placeholder="目标名称，如「读完 20 本书」"
          className="w-full px-4 py-3 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="描述一下为什么要实现这个目标（可选）"
          rows={3}
          className="mt-3 w-full px-4 py-3 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none"
        />

        {/* 分类 */}
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-500 mb-2">分类</p>
          <div className="flex flex-wrap gap-2">
            {goalCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer whitespace-nowrap ${
                  category === cat
                    ? "bg-primary-100 text-primary-700 ring-2 ring-primary-300"
                    : "bg-background-100 text-foreground-500 hover:bg-background-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 日期 */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-foreground-500 mb-2">开始日期</p>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 focus:outline-none focus:border-primary-400"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground-500 mb-2">目标日期</p>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 focus:outline-none focus:border-primary-400"
            />
          </div>
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