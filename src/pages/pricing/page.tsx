import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import type { Plan, Coupon } from "@/types/billing";

function currencySymbol(c: string) {
  return c === "CNY" ? "¥" : c === "USD" ? "$" : c;
}

function intervalLabel(i: string) {
  return i === "month" ? "/月" : i === "year" ? "/年" : "";
}

export default function Pricing() {
  const { user } = useAuth();
  const { plan: currentPlan, refresh } = usePlan();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase
        .from("plans")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (err) throw err;
      setPlans((data ?? []) as Plan[]);
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCheckout = (p: Plan) => {
    setCheckoutPlan(p);
    setCouponCode("");
    setCheckoutError("");
  };

  const confirmCheckout = async () => {
    if (!checkoutPlan || !user) return;
    setProcessing(true);
    setCheckoutError("");
    try {
      let coupon: Coupon | null = null;
      const code = couponCode.trim();
      if (code) {
        const { data } = await supabase.from("coupons").select("*").eq("code", code).maybeSingle();
        if (!data) throw new Error("优惠码无效");
        if (!data.active) throw new Error("优惠码已失效");
        if (data.expires_at && new Date(data.expires_at) < new Date()) throw new Error("优惠码已过期");
        const { count } = await supabase
          .from("coupon_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("coupon_id", data.id);
        if (data.max_uses && (count ?? 0) >= data.max_uses) throw new Error("优惠码已用完");
        coupon = data as Coupon;
      }

      // 切换到免费版：取消当前订阅
      if (checkoutPlan.slug === "free") {
        const { data: subs } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active");
        for (const s of subs ?? []) {
          await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", s.id);
        }
        await refresh();
        setCheckoutPlan(null);
        return;
      }

      let amount = Number(checkoutPlan.price) || 0;
      if (coupon) {
        if (coupon.discount_type === "percent") {
          amount = amount * (1 - Number(coupon.discount_value) / 100);
        } else {
          amount = Math.max(0, amount - Number(coupon.discount_value));
        }
      }
      amount = Math.round(amount * 100) / 100;

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active");
      for (const s of subs ?? []) {
        await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", s.id);
      }

      const { error: subErr } = await supabase.from("subscriptions").insert({
        user_id: user.id,
        plan_id: checkoutPlan.id,
        status: "active",
        started_at: new Date().toISOString(),
      });
      if (subErr) throw subErr;

      const { error: orderErr } = await supabase.from("subscription_orders").insert({
        user_id: user.id,
        plan_id: checkoutPlan.id,
        plan_name: checkoutPlan.name,
        amount,
        currency: checkoutPlan.currency,
        status: "paid",
        payment_method: "mock",
      });
      if (orderErr) throw orderErr;

      if (coupon) {
        await supabase.from("coupon_redemptions").insert({ coupon_id: coupon.id, user_id: user.id });
      }

      await refresh();
      setCheckoutPlan(null);
    } catch (e) {
      setCheckoutError(getErrorMessage(e, "操作失败，请稍后重试"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-heading font-bold text-2xl text-foreground-900">选择你的套餐</h1>
        <p className="mt-1 text-sm text-foreground-500">
          当前套餐：<span className="font-medium text-foreground-700">{currentPlan?.name ?? "免费版"}</span>
        </p>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isCurrent = currentPlan?.id === p.id;
            const isPopular = p.slug === "pro";
            return (
              <div
                key={p.id}
                className={`relative rounded-lg border p-5 flex flex-col ${
                  isPopular
                    ? "border-primary-300 bg-primary-50/50"
                    : "border-background-200 bg-background-50"
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary-500 text-background-50 text-xs font-medium whitespace-nowrap">
                    最受欢迎
                  </span>
                )}
                <h3 className="font-heading font-bold text-lg text-foreground-900">{p.name}</h3>
                {p.description && (
                  <p className="mt-1 text-xs text-foreground-500 leading-relaxed">{p.description}</p>
                )}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-heading font-bold text-3xl text-foreground-900">
                    {currencySymbol(p.currency)}
                    {Number(p.price) === 0 ? "0" : Number(p.price)}
                  </span>
                  <span className="text-sm text-foreground-500">{intervalLabel(p.interval)}</span>
                </div>

                {p.features && p.features.length > 0 && (
                  <ul className="mt-4 space-y-2 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground-600">
                        <i className="ri-check-line text-primary-500 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => openCheckout(p)}
                  disabled={isCurrent}
                  className={`mt-5 w-full py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isCurrent
                      ? "bg-background-100 text-foreground-400 cursor-not-allowed"
                      : isPopular
                        ? "bg-primary-500 text-background-50 hover:bg-primary-600"
                        : "bg-background-100 text-foreground-700 hover:bg-background-200"
                  }`}
                >
                  {isCurrent ? "当前套餐" : p.slug === "free" ? "切换到免费版" : "立即开通"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-lg bg-secondary-100/60 border border-secondary-200 p-5">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-secondary-500 text-background-50 shrink-0">
            <i className="ri-information-line text-lg" />
          </span>
          <p className="text-sm text-foreground-600 leading-relaxed">
            当前为体验模式，开通套餐不会产生真实扣费。后续接入支付通道（Stripe / Toss / PayPal）后，
            这里将无缝切换为真实支付流程。
          </p>
        </div>
      </div>

      {/* 开通确认弹窗 */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground-950/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-background-50 p-6">
            <h3 className="font-heading font-bold text-lg text-foreground-900">确认开通</h3>
            <p className="mt-1 text-sm text-foreground-500">
              开通「{checkoutPlan.name}」套餐
              {checkoutPlan.slug === "free" ? "（将取消当前付费订阅）" : ""}
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground-700 mb-1.5">优惠码（可选）</label>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="输入优惠码"
                className="w-full px-4 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400 transition-colors"
              />
            </div>

            {checkoutError && (
              <p className="mt-3 text-sm text-accent-700 bg-accent-100/70 rounded-md px-3 py-2">{checkoutError}</p>
            )}

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => setCheckoutPlan(null)}
                className="flex-1 py-2.5 rounded-md bg-background-100 text-foreground-600 text-sm font-medium hover:bg-background-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                取消
              </button>
              <button
                onClick={confirmCheckout}
                disabled={processing}
                className="flex-1 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
              >
                {processing ? "处理中..." : "确认开通"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}