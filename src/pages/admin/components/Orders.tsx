import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";
import type { SubscriptionOrder, Profile } from "@/types/billing";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === "CNY" ? "¥" : "$";
  return `${symbol}${amount.toFixed(2)}`;
}

const statusMap: Record<string, { label: string; cls: string }> = {
  paid: { label: "已支付", cls: "bg-accent-100 text-accent-700" },
  refunded: { label: "已退款", cls: "bg-background-100 text-foreground-500" },
  pending: { label: "待支付", cls: "bg-secondary-100 text-secondary-700" },
};

export default function Orders() {
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ordersRes, profilesRes] = await Promise.all([
        supabase.from("subscription_orders").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*"),
      ]);
      if (ordersRes.error) throw ordersRes.error;
      if (profilesRes.error) throw profilesRes.error;
      setOrders((ordersRes.data ?? []) as SubscriptionOrder[]);
      setProfiles((profilesRes.data ?? []) as Profile[]);
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const userById = (id: string) => profiles.find((p) => p.id === id) ?? null;

  const refund = async (o: SubscriptionOrder) => {
    const { error: err } = await supabase
      .from("subscription_orders")
      .update({ status: "refunded" })
      .eq("id", o.id);
    if (err) {
      setError(err.message);
      return;
    }
    load();
  };

  return (
    <div className="space-y-4">
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
      ) : orders.length === 0 ? (
        <p className="text-sm text-foreground-400 py-10 text-center">暂无订单</p>
      ) : (
        <div className="rounded-lg border border-background-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background-100 text-left text-foreground-500">
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">套餐</th>
                <th className="px-4 py-3 font-medium">金额</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const u = userById(o.user_id);
                const st = statusMap[o.status] ?? statusMap.pending;
                return (
                  <tr key={o.id} className="border-t border-background-200 hover:bg-background-50">
                    <td className="px-4 py-3">
                      <p className="text-foreground-900 font-medium">{u?.username ?? "未知用户"}</p>
                      <p className="text-xs text-foreground-400">{u?.email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-foreground-600">{o.plan_name ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground-900 font-medium">
                      {formatCurrency(Number(o.amount) || 0, o.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground-500">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {o.status === "paid" && (
                        <button
                          onClick={() => refund(o)}
                          className="px-3 py-1.5 rounded-md bg-background-100 text-foreground-600 text-xs font-medium hover:bg-accent-100 hover:text-accent-700 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          退款
                        </button>
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