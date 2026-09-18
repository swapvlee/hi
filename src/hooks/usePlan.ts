import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Plan, Subscription } from "@/types/billing";

export function usePlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setPlan(null);
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;

      const activeSub = (subs?.[0] as Subscription) ?? null;
      setSubscription(activeSub);

      let target: Plan | null = null;
      if (activeSub?.plan_id) {
        const { data: p } = await supabase
          .from("plans")
          .select("*")
          .eq("id", activeSub.plan_id)
          .maybeSingle();
        target = (p as Plan) ?? null;
      }
      if (!target) {
        const { data: freePlan } = await supabase
          .from("plans")
          .select("*")
          .eq("slug", "free")
          .maybeSingle();
        target = (freePlan as Plan) ?? null;
      }
      setPlan(target);
    } catch {
      setPlan(null);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const isPro = plan?.slug === "pro" || plan?.slug === "lifetime";

  return { plan, subscription, loading, isPro, refresh: load };
}