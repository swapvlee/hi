import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import {
  CustomField,
  CustomModule,
  FieldType,
  RelationEntity,
  fieldTypeLabels,
  appTemplates,
  moduleIcons,
  relationLabels,
} from "@/pages/apps/appsUtils";

interface ModuleModalProps {
  editing: CustomModule | null;
  onClose: () => void;
  onSaved: () => void;
}

const colorOptions = [
  { key: "primary", label: "绿色" },
  { key: "accent", label: "琥珀" },
  { key: "secondary", label: "青灰" },
];

function newField(): CustomField {
  return { id: crypto.randomUUID(), label: "", type: "text", options: [], required: false };
}

export default function ModuleModal({ editing, onClose, onSaved }: ModuleModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState(editing?.name ?? "");
  const [icon, setIcon] = useState(editing?.icon ?? "ri-star-line");
  const [color, setColor] = useState(editing?.color ?? "primary");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [fields, setFields] = useState<CustomField[]>(editing?.fields ?? []);
  const [template, setTemplate] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const addField = () => setFields((prev) => [...prev, newField()]);

  const applyTemplate = (templateName: string) => {
    setTemplate(templateName);
    const selected = appTemplates.find((item) => item.name === templateName);
    if (!selected) return;
    setName(selected.name);
    setIcon(selected.icon);
    setColor(selected.color);
    setDescription(selected.description);
    setFields(selected.fields.map((field) => ({ ...field, id: crypto.randomUUID(), options: [...field.options] })));
  };

  const updateField = (id: string, patch: Partial<CustomField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, archived: true } : f)));
  };

  const restoreField = (id: string) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, archived: false } : f)));
  };

  const updateOption = (id: string, index: number, value: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const options = [...f.options];
        options[index] = value;
        return { ...f, options };
      })
    );
  };

  const addOption = (id: string) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, options: [...f.options, ""] } : f)));
  };

  const removeOption = (id: string, index: number) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const options = f.options.filter((_, i) => i !== index);
        return { ...f, options };
      })
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErr("给模块起个名字吧");
      return;
    }
    const validFields = fields.filter((f) => f.label.trim());
    for (const f of validFields) {
      if (f.type === "select" && f.options.filter((o) => o.trim()).length === 0) {
        setErr(`「${f.label}」是选项类型，需要至少一个选项`);
        return;
      }
      if (f.type === "formula" && !f.formula?.sourceFieldId) {
        setErr(`「${f.label}」需要选择一个数字字段作为统计来源`);
        return;
      }
    }

    setSaving(true);
    setErr("");

    const payload = {
      name: name.trim(),
      icon,
      color,
      description: description.trim() || null,
      fields: validFields.map((f) => ({
        ...f,
        label: f.label.trim(),
        archived: f.archived ?? false,
        options: f.type === "select" ? f.options.map((o) => o.trim()).filter(Boolean) : [],
        formula: f.type === "formula" ? f.formula : undefined,
      })),
    };

    if (editing) {
      const { error } = await supabase
        .from("custom_modules")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
      if (error) {
        setErr(getErrorMessage(error, "保存失败，请稍后重试"));
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("custom_modules").insert({ ...payload, user_id: user!.id });
      if (error) {
        setErr(getErrorMessage(error, "保存失败，请稍后重试"));
        setSaving(false);
        return;
      }
    }

    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground-950/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-background-50 rounded-t-2xl sm:rounded-lg px-5 py-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-lg text-foreground-900">
            {editing ? "编辑模块" : "新建模块"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 cursor-pointer"
            aria-label="关闭"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {!editing && (
          <>
            <label className="block text-xs font-medium text-foreground-500 mb-1.5">从模板开始</label>
            <select
              value={template}
              onChange={(e) => applyTemplate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-700 focus:outline-none focus:border-primary-400 cursor-pointer"
            >
              <option value="">空白模块</option>
              {appTemplates.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </>
        )}

        <label className="block text-xs font-medium text-foreground-500 mb-1.5">名称</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：饮水记录、体重记录"
          className="w-full px-4 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400"
        />

        <label className="block text-xs font-medium text-foreground-500 mb-1.5 mt-4">图标</label>
        <div className="grid grid-cols-6 gap-2">
          {moduleIcons.map((ic) => (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg transition-colors cursor-pointer ${
                icon === ic ? "bg-primary-500 text-background-50" : "bg-background-100 text-foreground-600 hover:bg-background-200"
              }`}
              aria-label="选择图标"
            >
              <i className={ic} />
            </button>
          ))}
        </div>

        <label className="block text-xs font-medium text-foreground-500 mb-1.5 mt-4">颜色</label>
        <div className="flex gap-2">
          {colorOptions.map((c) => (
            <button
              key={c.key}
              onClick={() => setColor(c.key)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors cursor-pointer whitespace-nowrap ${
                color === c.key
                  ? "bg-primary-100 text-primary-700 ring-2 ring-primary-300"
                  : "bg-background-100 text-foreground-500 hover:bg-background-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label className="block text-xs font-medium text-foreground-500 mb-1.5 mt-4">描述（可选）</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="这个模块用来记录什么？"
          className="w-full px-4 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400"
        />

        <div className="flex items-center justify-between mt-5 mb-2">
          <label className="text-xs font-medium text-foreground-500">自定义字段</label>
          <button
            onClick={addField}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line" />
            添加字段
          </button>
        </div>

        {fields.length === 0 ? (
          <p className="text-xs text-foreground-400 py-2">
            还没有字段，添加字段来定义每条记录需要填写的内容
          </p>
        ) : (
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.id} className={`rounded-lg border border-background-200 p-3 ${f.archived ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-2">
                  <input
                    value={f.label}
                    onChange={(e) => updateField(f.id, { label: e.target.value })}
                    placeholder="字段名称，如：饮水量"
                    className="flex-1 px-3 py-2 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400"
                  />
                  <select
                    value={f.type}
                    onChange={(e) => updateField(f.id, { type: e.target.value as FieldType })}
                    className="px-3 py-2 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-700 focus:outline-none cursor-pointer"
                  >
                    {(Object.keys(fieldTypeLabels) as FieldType[]).map((t) => (
                      <option key={t} value={t}>
                        {fieldTypeLabels[t]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => f.archived ? restoreField(f.id) : removeField(f.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-accent-100 hover:text-accent-700 cursor-pointer"
                    aria-label={f.archived ? "恢复字段" : "归档字段"}
                  >
                    <i className={f.archived ? "ri-refresh-line" : "ri-archive-line"} />
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-foreground-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={f.required ?? false}
                      disabled={f.type === "formula"}
                      onChange={(e) => updateField(f.id, { required: e.target.checked })}
                      className="accent-primary-500 disabled:opacity-50"
                    />
                    必填
                  </label>
                  {f.type === "number" && (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        value={f.unit ?? ""}
                        onChange={(e) => updateField(f.id, { unit: e.target.value })}
                        placeholder="单位，如：公斤"
                        className="flex-1 px-3 py-1.5 rounded-md border border-background-200 bg-background-50 text-xs text-foreground-900 placeholder:text-foreground-400 focus:outline-none"
                      />
                      <input
                        type="number"
                        value={f.min ?? ""}
                        onChange={(e) => updateField(f.id, { min: e.target.value === "" ? undefined : Number(e.target.value) })}
                        placeholder="最小值"
                        className="w-20 px-2 py-1.5 rounded-md border border-background-200 bg-background-50 text-xs text-foreground-900 placeholder:text-foreground-400 focus:outline-none"
                      />
                      <input
                        type="number"
                        value={f.max ?? ""}
                        onChange={(e) => updateField(f.id, { max: e.target.value === "" ? undefined : Number(e.target.value) })}
                        placeholder="最大值"
                        className="w-20 px-2 py-1.5 rounded-md border border-background-200 bg-background-50 text-xs text-foreground-900 placeholder:text-foreground-400 focus:outline-none"
                      />
                    </div>
                  )}
                  {f.type !== "formula" && f.type !== "relation" && f.type !== "boolean" && (
                    <input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      value={String(f.defaultValue ?? "")}
                      onChange={(e) => updateField(f.id, { defaultValue: f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value })}
                      placeholder="默认值（可选）"
                      className="flex-1 min-w-0 px-3 py-1.5 rounded-md border border-background-200 bg-background-50 text-xs text-foreground-900 placeholder:text-foreground-400 focus:outline-none"
                    />
                  )}
                  {f.type === "boolean" && (
                    <label className="flex items-center gap-1.5 text-xs text-foreground-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={f.defaultValue === true}
                        onChange={(e) => updateField(f.id, { defaultValue: e.target.checked })}
                        className="accent-primary-500"
                      />
                      默认开启
                    </label>
                  )}
                </div>

                {f.type === "formula" && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <select
                      value={f.formula?.operation ?? "sum"}
                      onChange={(e) => updateField(f.id, { formula: { operation: e.target.value as "sum" | "average" | "count" | "min" | "max", sourceFieldId: f.formula?.sourceFieldId ?? "" } })}
                      className="px-3 py-1.5 rounded-md border border-background-200 bg-background-50 text-xs text-foreground-700 focus:outline-none"
                    >
                      <option value="sum">合计</option>
                      <option value="average">平均值</option>
                      <option value="count">计数</option>
                      <option value="min">最小值</option>
                      <option value="max">最大值</option>
                    </select>
                    <select
                      value={f.formula?.sourceFieldId ?? ""}
                      onChange={(e) => updateField(f.id, { formula: { operation: f.formula?.operation ?? "sum", sourceFieldId: e.target.value } })}
                      className="px-3 py-1.5 rounded-md border border-background-200 bg-background-50 text-xs text-foreground-700 focus:outline-none"
                    >
                      <option value="">选择数字字段</option>
                      {fields.filter((source) => source.type === "number" && source.id !== f.id).map((source) => (
                        <option key={source.id} value={source.id}>{source.label || "未命名字段"}</option>
                      ))}
                    </select>
                  </div>
                )}

                {f.type === "relation" && (
                  <select
                    value={f.relation ?? "todo"}
                    onChange={(e) => updateField(f.id, { relation: e.target.value as RelationEntity })}
                    className="mt-2 w-full px-3 py-1.5 rounded-md border border-background-200 bg-background-50 text-xs text-foreground-700 focus:outline-none"
                  >
                    {(Object.keys(relationLabels) as RelationEntity[]).map((entity) => (
                      <option key={entity} value={entity}>{relationLabels[entity]}</option>
                    ))}
                  </select>
                )}

                {f.type === "select" && (
                  <div className="mt-2 space-y-1.5">
                    {f.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={opt}
                          onChange={(e) => updateOption(f.id, i, e.target.value)}
                          placeholder={`选项 ${i + 1}`}
                          className="flex-1 px-3 py-1.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none"
                        />
                        <button
                          onClick={() => removeOption(f.id, i)}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-accent-700 cursor-pointer"
                          aria-label="删除选项"
                        >
                          <i className="ri-close-line" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addOption(f.id)}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-add-line" />
                      添加选项
                    </button>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-background-100 space-y-2">
                  <p className="text-xs font-medium text-foreground-500">提醒与重复</p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="time"
                      value={f.reminder_time ?? ""}
                      onChange={(e) => updateField(f.id, { reminder_time: e.target.value || undefined })}
                      className="px-2 py-1.5 rounded-md border border-background-200 bg-background-50 text-xs text-foreground-700 focus:outline-none"
                      placeholder="提醒时间"
                    />
                    <select
                      value={f.repeat_type ?? "none"}
                      onChange={(e) => updateField(f.id, { repeat_type: e.target.value as "none" | "daily" | "weekly" | "monthly" })}
                      className="px-2 py-1.5 rounded-md border border-background-200 bg-background-50 text-xs text-foreground-700 focus:outline-none"
                    >
                      <option value="none">不重复</option>
                      <option value="daily">每天</option>
                      <option value="weekly">每周</option>
                      <option value="monthly">每月</option>
                    </select>
                    {f.repeat_type === "weekly" && (
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const days = f.repeat_days ?? [];
                              const newDays = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
                              updateField(f.id, { repeat_days: newDays });
                            }}
                            className={`w-7 h-7 rounded-full text-xs font-medium cursor-pointer ${(f.repeat_days ?? []).includes(day) ? "bg-primary-500 text-background-50" : "bg-background-100 text-foreground-500"}`}
                          >
                            {["日", "一", "二", "三", "四", "五", "六"][day]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}