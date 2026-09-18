import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";
import type { Plan } from "@/types/billing";

function currencySymbol(c: string) {
  return c === "CNY" ? "¥" : "$";
}

function intervalLabel(i: string) {
  return i === "month" ? "/月" : i === "year" ? "/年" : "买断";
}

interface PlanModalProps {
  editing: Plan | null;
  onClose: () => void;
  onSaved: () => void;
}

function PlanModal({ editing, onClose, onSaved }: PlanModalProps) {
  const [name, setName] = useState(editing?.name ?? "");
  const [slug, setSlug] = useState(editing?.slug ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [price, setPrice] = useState(editing ? String(editing.price) : "0");
  const [interval, setInterval] = useState(editing?.interval ?? "month");
  const [featuresText, setFeaturesText] = useState((editing?.features ?? []).join("\n"));
  const [active, setActive] = useState(editing?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const features = featuresText.split("\n").map((f) => f.trim()).filter(Boolean);
      const payload = {
        name,
        slug,
        description: description.trim() || null,
        price: Number(price) || 0,
        interval,
        features,
        active,
      };
      if (editing) {
        const { error: err } = await supabase.from("plans").update(payload).eq("id", editing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("plans").insert(payload);
        if (err) throw err;
      }
      onSaved();
    } catch (e) {
      setError(getErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground-950/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-background-50 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-heading font-bold text-lg text-foreground-900">
          {editing ? "编辑套餐" : "新建套餐"}
        </h3>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">套餐名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">标识（英文，如 pro）</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400 resize-y"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1.5">价格</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1.5">周期</label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400 cursor-pointer"
              >
                <option value="month">按月</option>
                <option value="year">按年</option>
                <option value="lifetime">买断</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">权益（每行一条）</label>
            <textarea
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400 resize-y"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-sm text-foreground-700">上架中（对用户可见）</span>
          </label>
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
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase
        .from("plans")
        .select("*")
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

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (p: Plan) => {
    setEditing(p);
    setModalOpen(true);
  };
  const handleSaved = () => {
    setModalOpen(false);
    setEditing(null);
    load();
  };

  const toggleActive = async (p: Plan) => {
    const { error: err } = await supabase.from("plans").update({ active: !p.active }).eq("id", p.id);
    if (err) {
      setError(err.message);
      return;
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground-500">共 {plans.length} 个套餐</span>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" />
          新建套餐
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
      ) : (
        <div className="space-y-2">
          {plans.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg bg-background-50 border border-background-200 p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground-900">{p.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.active ? "bg-accent-100 text-accent-700" : "bg-background-100 text-foreground-400"
                    }`}
                  >
                    {p.active ? "上架中" : "已下架"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-foreground-500">
                  {currencySymbol(p.currency)}{Number(p.price)} {intervalLabel(p.interval)} · {p.features?.length ?? 0} 项权益
                </p>
              </div>
              <button
                onClick={() => toggleActive(p)}
                className="px-3 py-1.5 rounded-md bg-background-100 text-foreground-600 text-xs font-medium hover:bg-background-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                {p.active ? "下架" : "上架"}
              </button>
              <button
                onClick={() => openEdit(p)}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-background-100 text-foreground-500 hover:bg-background-200 transition-colors cursor-pointer"
                aria-label="编辑"
              >
                <i className="ri-edit-line" />
              </button>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <PlanModal
          editing={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}