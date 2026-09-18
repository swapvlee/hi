import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";
import type { Coupon } from "@/types/billing";

function formatDate(iso: string | null) {
  if (!iso) return "永久";
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function discountLabel(c: Coupon) {
  if (c.discount_type === "percent") return `-${Number(c.discount_value)}%`;
  return `-¥${Number(c.discount_value)}`;
}

interface CouponModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function CouponModal({ onClose, onSaved }: CouponModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const { error: err } = await supabase.from("coupons").insert({
        code: code.trim().toUpperCase(),
        name: name.trim() || null,
        discount_type: discountType,
        discount_value: Number(discountValue) || 0,
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        active: true,
      });
      if (err) throw err;
      onSaved();
    } catch (e) {
      setError(getErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground-950/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-background-50 p-6">
        <h3 className="font-heading font-bold text-lg text-foreground-900">新建优惠码</h3>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">优惠码</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="如 WELCOME10"
              className="w-full px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">名称（可选）</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如 新用户优惠"
              className="w-full px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1.5">优惠类型</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400 cursor-pointer"
              >
                <option value="percent">百分比折扣</option>
                <option value="fixed">固定减免</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1.5">
                {discountType === "percent" ? "折扣比例 (%)" : "减免金额 (¥)"}
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1.5">最大使用次数（可选）</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="不限"
                className="w-full px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1.5">过期日期（可选）</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-accent-700 bg-accent-100/70 rounded-md px-3 py-2">{error}</p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md bg-background-100 text-foreground-600 text-sm font-medium hover:bg-background-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            取消
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            {saving ? "保存中..." : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Coupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [usedCounts, setUsedCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [couponsRes, redemptionsRes] = await Promise.all([
        supabase.from("coupons").select("*").order("created_at", { ascending: false }),
        supabase.from("coupon_redemptions").select("coupon_id"),
      ]);
      if (couponsRes.error) throw couponsRes.error;
      if (redemptionsRes.error) throw redemptionsRes.error;
      setCoupons((couponsRes.data ?? []) as Coupon[]);
      const counts: Record<string, number> = {};
      for (const r of (redemptionsRes.data ?? []) as { coupon_id: string }[]) {
        counts[r.coupon_id] = (counts[r.coupon_id] ?? 0) + 1;
      }
      setUsedCounts(counts);
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = () => {
    setModalOpen(false);
    load();
  };

  const toggleActive = async (c: Coupon) => {
    const { error: err } = await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
    if (err) {
      setError(err.message);
      return;
    }
    load();
  };

  const deleteCoupon = async (c: Coupon) => {
    const { error: err } = await supabase.from("coupons").delete().eq("id", c.id);
    if (err) {
      setError(err.message);
      return;
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground-500">共 {coupons.length} 个优惠码</span>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" />
          新建优惠码
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
      ) : coupons.length === 0 ? (
        <p className="text-sm text-foreground-400 py-10 text-center">还没有优惠码</p>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => {
            const used = usedCounts[c.id] ?? 0;
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-lg bg-background-50 border border-background-200 p-4"
              >
                <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-accent-100 text-accent-600 shrink-0">
                  <i className="ri-coupon-3-line text-lg" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-heading font-bold text-foreground-900">{c.code}</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                      {discountLabel(c)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.active ? "bg-accent-100 text-accent-700" : "bg-background-100 text-foreground-400"
                      }`}
                    >
                      {c.active ? "启用" : "停用"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-foreground-500">
                    已用 {used}{c.max_uses ? `/${c.max_uses}` : ""} · 截止 {formatDate(c.expires_at)}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(c)}
                  className="px-3 py-1.5 rounded-md bg-background-100 text-foreground-600 text-xs font-medium hover:bg-background-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {c.active ? "停用" : "启用"}
                </button>
                <button
                  onClick={() => deleteCoupon(c)}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-background-100 text-foreground-500 hover:bg-accent-100 hover:text-accent-700 transition-colors cursor-pointer"
                  aria-label="删除"
                >
                  <i className="ri-delete-bin-line" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && <CouponModal onClose={() => setModalOpen(false)} onSaved={handleSaved} />}
    </div>
  );
}