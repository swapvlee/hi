import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import { CustomEntry, CustomModule, CustomValue, CustomRelationValue, RelationEntity } from "@/pages/apps/appsUtils";

interface EntryModalProps {
  module: CustomModule;
  entry?: CustomEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EntryModal({ module, entry, onClose, onSaved }: EntryModalProps) {
  const { user } = useAuth();
  const initialValues = entry?.data ?? Object.fromEntries(
    module.fields.filter((field) => !field.archived && field.defaultValue !== undefined).map((field) => [field.id, field.defaultValue as CustomValue])
  );
  const [values, setValues] = useState<Record<string, CustomValue>>(initialValues);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [relationOptions, setRelationOptions] = useState<Record<string, { value: string; label: string }[]>>({});

  useEffect(() => {
    let active = true;
    const loadRelations = async () => {
      const relationFields = module.fields.filter((field) => !field.archived && field.type === "relation" && field.relation);
      const results = await Promise.all(relationFields.map(async (field) => {
        const relation = field.relation as RelationEntity;
        const table = relation === "todo" ? "todos" : relation === "goal" ? "goals" : relation === "habit" ? "habits" : "events";
        const labelColumn = relation === "habit" ? "name" : "title";
        const { data } = await supabase.from(table).select(`id, ${labelColumn}`).eq("user_id", user!.id).order(labelColumn, { ascending: true }).limit(100);
        return [field.id, (data ?? []).map((item: { id: string; [key: string]: string }) => ({
          value: item.id,
          label: item[labelColumn],
        }))] as const;
      }));
      if (active) setRelationOptions(Object.fromEntries(results));
    };
    loadRelations();
    return () => { active = false; };
  }, [module, user]);

  const setValue = (fieldId: string, value: CustomValue) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    const activeFields = module.fields.filter((field) => !field.archived);
    const missing = activeFields.find((field) => field.required && (values[field.id] === undefined || values[field.id] === ""));
    if (missing) {
      setErr(`请填写「${missing.label}」`);
      return;
    }
    const invalidRelation = activeFields.find((field) => {
      if (field.type !== "relation" || !values[field.id]) return false;
      const selected = values[field.id];
      const selectedValue = typeof selected === "object" ? selected.id : String(selected).split("|")[0];
      return !(relationOptions[field.id] ?? []).some((option) => option.value === selectedValue);
    });
    if (invalidRelation) {
      setErr(`「${invalidRelation.label}」的关联记录无效或已失效，请重新选择`);
      return;
    }
    setSaving(true);
    setErr("");
    const query = entry
      ? supabase.from("custom_entries").update({ data: values }).eq("id", entry.id)
      : supabase.from("custom_entries").insert({ user_id: user!.id, module_id: module.id, data: values });
    const { error } = await query;
    if (error) {
      setErr(getErrorMessage(error, "保存失败，请稍后重试"));
      setSaving(false);
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground-950/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-background-50 rounded-t-2xl sm:rounded-lg px-5 py-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-lg text-foreground-900">{entry ? "编辑记录" : "添加记录"}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 cursor-pointer"
            aria-label="关闭"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {module.fields.filter((field) => !field.archived).length === 0 ? (
          <p className="text-sm text-foreground-500 py-4">
            这个模块还没有字段，先在「编辑模块」里添加字段，再回来记录吧。
          </p>
        ) : (
          <div className="space-y-4">
            {module.fields.filter((field) => !field.archived).map((f) => (
              <div key={f.id}>
                <label className="block text-xs font-medium text-foreground-500 mb-1.5">
                  {f.label}{f.required ? <span className="ml-1 text-accent-600">*</span> : null}
                </label>
                {f.type === "formula" ? (
                  <p className="text-xs text-foreground-400">该字段会根据记录自动计算，无需填写</p>
                ) : f.type === "relation" ? (
                  <select
                    value={(() => {
                      const selected = values[f.id];
                      return typeof selected === "object" ? selected.id : String(selected ?? "").split("|")[0];
                    })()}
                    onChange={(e) => {
                      const option = (relationOptions[f.id] ?? []).find((item) => item.value === e.target.value);
                      setValue(f.id, option ? { id: option.value, label: option.label, entity: f.relation as RelationEntity } satisfies CustomRelationValue : "");
                    }}
                    className="w-full px-4 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 focus:outline-none focus:border-primary-400 cursor-pointer"
                  >
                    <option value="">请选择关联记录</option>
                    {(relationOptions[f.id] ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : f.type === "select" ? (
                  <select
                    value={String(values[f.id] ?? "")}
                    onChange={(e) => setValue(f.id, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 focus:outline-none focus:border-primary-400 cursor-pointer"
                  >
                    <option value="">请选择</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : f.type === "boolean" ? (
                  <label className="flex items-center gap-2 text-sm text-foreground-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(values[f.id] ?? false)}
                      onChange={(e) => setValue(f.id, e.target.checked)}
                      className="w-4 h-4 accent-primary-500"
                    />
                    已完成
                  </label>
                ) : f.type === "number" ? (
                  <div>
                    <input
                      type="number"
                      value={String(values[f.id] ?? "")}
                      onChange={(e) => setValue(f.id, e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder={`请输入${f.label}`}
                      min={f.min}
                      max={f.max}
                      className="w-full px-4 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400"
                    />
                    {(f.min !== undefined || f.max !== undefined) && (
                      <p className="mt-1 text-xs text-foreground-400">
                        范围: {f.min !== undefined ? f.min : "无限制"} ~ {f.max !== undefined ? f.max : "无限制"}{f.unit ? ` ${f.unit}` : ""}
                      </p>
                    )}
                  </div>
                ) : f.type === "date" ? (
                  <input
                    type="date"
                    value={String(values[f.id] ?? "")}
                    onChange={(e) => setValue(f.id, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 focus:outline-none focus:border-primary-400"
                  />
                ) : f.type === "textarea" ? (
                  <textarea
                    value={String(values[f.id] ?? "")}
                    onChange={(e) => setValue(f.id, e.target.value)}
                    placeholder={`请输入${f.label}`}
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 resize-y"
                  />
                ) : (
                  <input
                    type="text"
                    value={String(values[f.id] ?? "")}
                    onChange={(e) => setValue(f.id, e.target.value)}
                    placeholder={`请输入${f.label}`}
                    className="w-full px-4 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400"
                  />
                )}
              </div>
            ))}
          </div>
        )}

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
            disabled={saving || module.fields.filter((field) => !field.archived && field.type !== "formula").length === 0}
            className="flex-1 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {saving ? "保存中..." : entry ? "保存修改" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}