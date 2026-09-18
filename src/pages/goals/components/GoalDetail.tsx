import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import type { Goal, Milestone } from "@/pages/goals/types";
import { goalColorMap } from "@/pages/goals/constants";

interface GoalDetailProps {
  goal: Goal;
  milestones: Milestone[];
  onClose: () => void;
  onChanged: () => void;
  onEdit: (goal: Goal) => void;
}

export default function GoalDetail({ goal, milestones, onClose, onChanged, onEdit }: GoalDetailProps) {
  const { user } = useAuth();
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const done = milestones.filter((m) => m.completed).length;
  const progress = milestones.length > 0 ? Math.round((done / milestones.length) * 100) : goal.progress;
  const c = goalColorMap[goal.color] ?? goalColorMap.primary;

  const syncProgress = async (ms: Milestone[]) => {
    const total = ms.length;
    const completedCount = ms.filter((m) => m.completed).length;
    const p = total > 0 ? Math.round((completedCount / total) * 100) : goal.progress;
    await supabase.from("goals").update({ progress: p }).eq("id", goal.id);
  };

  const addMilestone = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    setErr("");
    const nextSort = milestones.length;
    const { data, error } = await supabase
      .from("milestones")
      .insert({ goal_id: goal.id, user_id: user!.id, title: newTitle.trim(), sort_order: nextSort })
      .select()
      .single();
    if (error) {
      setErr(getErrorMessage(error, "操作失败，请稍后重试"));
      setAdding(false);
      return;
    }
    const updated = [...milestones, data as Milestone];
    await syncProgress(updated);
    setNewTitle("");
    setAdding(false);
    onChanged();
  };

  const toggleMilestone = async (m: Milestone) => {
    const { error } = await supabase
      .from("milestones")
      .update({ completed: !m.completed })
      .eq("id", m.id);
    if (error) {
      setErr(getErrorMessage(error, "操作失败，请稍后重试"));
      return;
    }
    const updated = milestones.map((x) => (x.id === m.id ? { ...x, completed: !x.completed } : x));
    await syncProgress(updated);
    onChanged();
  };

  const deleteMilestone = async (id: string) => {
    const { error } = await supabase.from("milestones").delete().eq("id", id);
    if (error) {
      setErr(getErrorMessage(error, "操作失败，请稍后重试"));
      return;
    }
    const updated = milestones.filter((x) => x.id !== id);
    await syncProgress(updated);
    onChanged();
  };

  const setProgress = async (p: number) => {
    const { error } = await supabase.from("goals").update({ progress: p }).eq("id", goal.id);
    if (error) {
      setErr(getErrorMessage(error, "操作失败，请稍后重试"));
      return;
    }
    onChanged();
  };

  const toggleStatus = async () => {
    const next = goal.status === "completed" ? "active" : "completed";
    const { error } = await supabase.from("goals").update({ status: next }).eq("id", goal.id);
    if (error) {
      setErr(getErrorMessage(error, "操作失败，请稍后重试"));
      return;
    }
    onChanged();
    onClose();
  };

  const deleteGoal = async () => {
    await supabase.from("milestones").delete().eq("goal_id", goal.id);
    const { error } = await supabase.from("goals").delete().eq("id", goal.id);
    if (error) {
      setErr(getErrorMessage(error, "操作失败，请稍后重试"));
      return;
    }
    onChanged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground-950/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-background-50 rounded-t-2xl sm:rounded-lg px-5 py-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-start justify-between mb-1">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.badge}`}>
            {goal.category}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(goal)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 cursor-pointer"
              aria-label="编辑"
            >
              <i className="ri-edit-line" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 cursor-pointer"
              aria-label="关闭"
            >
              <i className="ri-close-line text-lg" />
            </button>
          </div>
        </div>

        <h2 className="font-heading font-bold text-xl text-foreground-900">{goal.title}</h2>
        {goal.description && (
          <p className="mt-1 text-sm text-foreground-500 leading-relaxed">{goal.description}</p>
        )}
        {goal.target_date && (
          <p className="mt-1 text-xs text-foreground-400">目标日期：{goal.target_date}</p>
        )}

        {/* 进度 */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-foreground-700">整体进度</p>
            <span className="text-sm font-heading font-bold text-foreground-900">{progress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-background-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${c.bar} transition-all`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          {milestones.length === 0 && (
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full mt-3 accent-oklch cursor-pointer"
              style={{ accentColor: "oklch(var(--primary-500))" }}
            />
          )}
        </div>

        {/* 里程碑拆解 */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-foreground-700 mb-3">
            目标拆解 {milestones.length > 0 && `(${done}/${milestones.length})`}
          </h3>

          {milestones.length > 0 ? (
            <ul className="space-y-2">
              {milestones.map((m) => (
                <li
                  key={m.id}
                  className="group flex items-center gap-3 rounded-lg bg-background-100 p-3"
                >
                  <button
                    onClick={() => toggleMilestone(m)}
                    className="w-6 h-6 shrink-0 flex items-center justify-center cursor-pointer"
                    aria-label={m.completed ? "标记未完成" : "标记完成"}
                  >
                    {m.completed ? (
                      <i className="ri-checkbox-circle-fill text-2xl text-primary-500" />
                    ) : (
                      <i className="ri-checkbox-blank-circle-line text-2xl text-foreground-300 hover:text-primary-500" />
                    )}
                  </button>
                  <span
                    className={`flex-1 text-sm ${
                      m.completed ? "text-foreground-400 line-through" : "text-foreground-800"
                    }`}
                  >
                    {m.title}
                  </span>
                  <button
                    onClick={() => deleteMilestone(m.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-accent-100 hover:text-accent-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    aria-label="删除"
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground-500">还没有拆解步骤，添加一个小步骤开始吧</p>
          )}

          {/* 添加里程碑 */}
          <div className="mt-3 flex gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addMilestone();
              }}
              placeholder="添加一个小步骤..."
              className="flex-1 px-3 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400"
            />
            <button
              onClick={addMilestone}
              disabled={adding || !newTitle.trim()}
              className="flex items-center gap-1 px-3 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line" />
              添加
            </button>
          </div>
        </div>

        {err && <p className="mt-3 text-sm text-accent-700">{err}</p>}

        {/* 底部操作 */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={toggleStatus}
            className="flex-1 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            {goal.status === "completed" ? "重新激活" : "标记完成"}
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                onClick={deleteGoal}
                className="px-3 py-2.5 rounded-md bg-accent-500 text-background-50 text-sm font-medium cursor-pointer whitespace-nowrap"
              >
                确认删除
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-2.5 rounded-md bg-background-100 text-foreground-600 text-sm cursor-pointer whitespace-nowrap"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 px-4 py-2.5 rounded-md border border-background-200 text-foreground-600 text-sm hover:bg-accent-100 hover:text-accent-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-delete-bin-line" />
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}