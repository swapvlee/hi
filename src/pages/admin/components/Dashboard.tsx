import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";
import type { Profile, SubscriptionOrder } from "@/types/billing";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === "CNY" ? "¥" : "$";
  return `${symbol}${amount.toFixed(2)}`;
}

export default function Dashboard() {
  const [stats, setStats] = useState({ users: 0, members: 0, revenue: 0, orders: 0 });
  const [recentUsers, setRecentUsers] = useState<Profile[]>([]);
  const [recentOrders, setRecentOrders] = useState<SubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, subsRes, ordersRes, recentUsersRes, recentOrdersRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("subscription_orders").select("id, amount, currency, status"),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("subscription_orders").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      for (const r of [usersRes, subsRes, ordersRes, recentUsersRes, recentOrdersRes]) {
        if (r.error) throw r.error;
      }
      const allOrders = (ordersRes.data ?? []) as { amount: number | null; currency: string; status: string }[];
      const paid = allOrders.filter((o) => o.status === "paid");
      const revenue = paid.reduce((s, o) => s + (Number(o.amount) || 0), 0);
      setStats({
        users: usersRes.count ?? 0,
        members: subsRes.count ?? 0,
        revenue,
        orders: allOrders.length,
      });
      setRecentUsers((recentUsersRes.data ?? []) as Profile[]);
      setRecentOrders((recentOrdersRes.data ?? []) as SubscriptionOrder[]);
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cards = [
    { label: "总用户数", value: stats.users, icon: "ri-user-line", accent: "bg-primary-100 text-primary-600" },
    { label: "付费会员", value: stats.members, icon: "ri-vip-crown-line", accent: "bg-accent-100 text-accent-600" },
    { label: "累计营收", value: formatCurrency(stats.revenue, "CNY"), icon: "ri-money-cny-circle-line", accent: "bg-secondary-100 text-secondary-700" },
    { label: "订单总数", value: stats.orders, icon: "ri-receipt-line", accent: "bg-primary-100 text-primary-600" },
  ];

  return (
    <div className="space-y-5">
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
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {cards.map((c) => (
              <div key={c.label} className="flex flex-col gap-3 rounded-lg bg-background-50 border border-background-200 p-4">
                <span className={`w-10 h-10 flex items-center justify-center rounded-lg ${c.accent}`}>
                  <i className={`${c.icon} text-lg`} />
                </span>
                <div>
                  <p className="text-2xl font-heading font-bold text-foreground-900">{c.value}</p>
                  <p className="mt-0.5 text-sm text-foreground-500">{c.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 近期注册 */}
            <div className="rounded-lg bg-background-50 border border-background-200 p-5">
              <h4 className="text-sm font-semibold text-foreground-700 mb-4">
                <a href="#" className="text-inherit hover:text-primary-600 transition-colors">近期注册用户</a>
              </h4>
              {recentUsers.length === 0 ? (
                <p className="text-sm text-foreground-400 py-6 text-center">暂无用户</p>
              ) : (
                <ul className="space-y-3">
                  {recentUsers.map((u) => (
                    <li key={u.id} className="flex items-center gap-3">
                      <div className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary-500 text-background-50 font-heading font-bold text-sm shrink-0">
                        {(u.username ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground-900 truncate">{u.username ?? "未命名"}</p>
                        <p className="text-xs text-foreground-400 truncate">{u.email ?? "—"}</p>
                      </div>
                      <span className="text-xs text-foreground-400 shrink-0">{formatDate(u.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 近期订单 */}
            <div className="rounded-lg bg-background-50 border border-background-200 p-5">
              <h4 className="text-sm font-semibold text-foreground-700 mb-4">
                <a href="#" className="text-inherit hover:text-primary-600 transition-colors">近期订单</a>
              </h4>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-foreground-400 py-6 text-center">暂无订单</p>
              ) : (
                <ul className="space-y-3">
                  {recentOrders.map((o) => (
                    <li key={o.id} className="flex items-center gap-3">
                      <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 shrink-0">
                        <i className="ri-receipt-line" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground-900 truncate">{o.plan_name ?? "—"}</p>
                        <p className="text-xs text-foreground-400">{formatDate(o.created_at)}</p>
                      </div>
                      <span className="text-sm font-medium text-foreground-900 shrink-0">
                        {formatCurrency(Number(o.amount) || 0, o.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}