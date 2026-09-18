import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import GoalModal from "@/pages/goals/components/GoalModal";
import GoalDetail from "@/pages/goals/components/GoalDetail";
import EmptyState from "@/components/base/EmptyState";

import type { Goal, Milestone } from "@/pages/goals/types";

import { goalCategories, goalColorMap } from "@/pages/goals/constants";

function daysLeft(target: string | null) {
  if (!target) return null;
  const t = new Date(target + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.ceil((t.getTime() - today.getTime()) / 86400000);
  return diff;
}

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [detailGoal, setDetailGoal] = useState<Goal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [goalsRes, msRes] = await Promise.all([
        supabase.from("goals").select("*").order("created_at", { ascending: false }),
        supabase.from("milestones").select("*").order("sort_order", { ascending: true }),
      ]);
      if (goalsRes.error) throw goalsRes.error;
      if (msRes.error) throw msRes.error;
      const gs = (goalsRes.data ?? []) as Goal[];
      setGoals(gs);
      setMilestones((msRes.data ?? []) as Milestone[]);
      setDetailGoal((prev) => (prev ? gs.find((g) => g.id === prev.id) ?? prev : prev));
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const milestonesByGoal = useMemo(() => {
    const map = new Map<string, Milestone[]>();
    for (const m of milestones) {
      if (!map.has(m.goal_id)) map.set(m.goal_id, []);
      map.get(m.goal_id)!.push(m);
    }
    return map;
  }, [milestones]);

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (g: Goal) => {
    setEditing(g);
    setModalOpen(true);
  };
  const handleSaved = () => {
    setModalOpen(false);
    setEditing(null);
    load();
  };

  const handleMilestonesChanged = () => {
    load();
  };

  const handleEditGoal = (g: Goal) => {
    setDetailGoal(null);
    setEditing(g);
    setModalOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground-900">目标管理</h1>
          <p className="mt-1 text-sm text-foreground-500">把大目标拆成小步骤，一步步实现</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" />
          新建目标
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
      ) : goals.length === 0 ? (
        <EmptyState
          icon="ri-flag-line"
          accent="bg-primary-100 text-primary-600"
          title="还没有目标"
          description="设定一个长期目标，把它拆成小步骤，让努力有方向"
          actionLabel="新建目标"
          onAction={openAdd}
        />
      ) : (
        <div className="space-y-3">
          {activeGoals.map((goal) => {
            const ms = milestonesByGoal.get(goal.id) ?? [];
            const done = ms.filter((m) => m.completed).length;
            const progress = ms.length > 0 ? Math.round((done / ms.length) * 100) : goal.progress;
            const c = goalColorMap[goal.color] ?? goalColorMap.primary;
            const left = daysLeft(goal.target_date);
            return (
              <button
                key={goal.id}
                onClick={() => setDetailGoal(goal)}
                className="w-full text-left rounded-lg bg-background-50 border border-background-200 p-4 hover:border-background-300 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.badge}`}>
                        {goal.category}
                      </span>
                      {left !== null && (
                        <span className={`text-xs ${left < 0 ? "text-accent-600" : "text-foreground-500"}`}>
                          {left < 0 ? `已过期 ${Math.abs(left)} 天` : left === 0 ? "今天到期" : `剩余 ${left} 天`}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 text-sm font-medium text-foreground-900 truncate">{goal.title}</h3>
                    {goal.description && (
                      <p className="mt-0.5 text-xs text-foreground-500 line-clamp-2">{goal.description}</p>
                    )}
                  </div>
                  <span className="text-sm font-heading font-bold text-foreground-900 shrink-0">
                    {progress}%
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-background-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.bar} transition-all`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-foreground-500 shrink-0">
                    {ms.length > 0 ? `${done}/${ms.length} 步` : ""}
                  </span>
                </div>
              </button>
            );
          })}

          {completedGoals.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-foreground-400 mb-2">已完成 ({completedGoals.length})</p>
              <div className="space-y-2">
                {completedGoals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setDetailGoal(goal)}
                    className="w-full text-left flex items-center gap-3 rounded-lg bg-background-100 border border-background-200 p-3 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary-500 text-background-50">
                      <i className="ri-check-fill text-sm" />
                    </span>
                    <span className="flex-1 text-sm text-foreground-600 line-through truncate">{goal.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <GoalModal
          editing={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {detailGoal && (
        <GoalDetail
          goal={detailGoal}
          milestones={milestonesByGoal.get(detailGoal.id) ?? []}
          onClose={() => setDetailGoal(null)}
          onChanged={handleMilestonesChanged}
          onEdit={handleEditGoal}
        />
      )}
    </div>
  );
}