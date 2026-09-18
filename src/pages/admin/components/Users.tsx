import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";
import type { Profile, Subscription, Plan } from "@/types/billing";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function Users() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profilesRes, subsRes, plansRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*").eq("status", "active"),
        supabase.from("plans").select("*"),
      ]);
      for (const r of [profilesRes, subsRes, plansRes]) {
        if (r.error) throw r.error;
      }
      setProfiles((profilesRes.data ?? []) as Profile[]);
      setSubscriptions((subsRes.data ?? []) as Subscription[]);
      setPlans((plansRes.data ?? []) as Plan[]);
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const planNameById = (id: string | null) => {
    if (!id) return "免费版";
    return plans.find((p) => p.id === id)?.name ?? "免费版";
  };

  const subByUser = (userId: string) =>
    subscriptions.find((s) => s.user_id === userId) ?? null;

  const filtered = profiles.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.username ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索用户名或邮箱"
            className="w-full pl-9 pr-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400 transition-colors"
          />
        </div>
        <span className="text-sm text-foreground-500 whitespace-nowrap">共 {profiles.length} 位用户</span>
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
      ) : filtered.length === 0 ? (
        <p className="text-sm text-foreground-400 py-10 text-center">暂无匹配的用户</p>
      ) : (
        <div className="rounded-lg border border-background-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background-100 text-left text-foreground-500">
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">邮箱</th>
                <th className="px-4 py-3 font-medium">套餐</th>
                <th className="px-4 py-3 font-medium">注册时间</th>
                <th className="px-4 py-3 font-medium">身份</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const sub = subByUser(p.id);
                return (
                  <tr key={p.id} className="border-t border-background-200 hover:bg-background-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-500 text-background-50 font-heading font-bold text-sm shrink-0">
                          {(p.username ?? "?").slice(0, 1).toUpperCase()}
                        </div>
                        <span className="text-foreground-900 font-medium">{p.username ?? "未命名"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground-600">{p.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          sub ? "bg-primary-100 text-primary-700" : "bg-background-100 text-foreground-500"
                        }`}
                      >
                        {planNameById(sub?.plan_id ?? null)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground-500">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      {p.is_admin ? (
                        <span className="px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 text-xs font-medium whitespace-nowrap">
                          管理员
                        </span>
                      ) : (
                        <span className="text-foreground-400 text-xs">普通用户</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}