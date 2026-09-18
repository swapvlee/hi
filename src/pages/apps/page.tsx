import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { CustomEntry, CustomModule, moduleColorMap } from "@/pages/apps/appsUtils";
import ModuleModal from "@/pages/apps/components/ModuleModal";
import { getErrorMessage } from "@/lib/errors";
import { useFieldReminders, requestNotificationPermission } from "@/hooks/useFieldReminders";

export default function Apps() {
  const { user } = useAuth();
  const [modules, setModules] = useState<CustomModule[]>([]);
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomModule | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"created" | "name" | "count">("created");
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [modulesRes, entriesRes] = await Promise.all([
        supabase.from("custom_modules").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("custom_entries").select("module_id").eq("user_id", user.id),
      ]);
      if (modulesRes.error) throw modulesRes.error;
      if (entriesRes.error) throw entriesRes.error;

      const list = (modulesRes.data ?? []) as CustomModule[];
      const counts: Record<string, number> = {};
      for (const e of (entriesRes.data ?? []) as CustomEntry[]) {
        counts[e.module_id] = (counts[e.module_id] ?? 0) + 1;
      }
      setModules(list);
      setEntryCounts(counts);
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useFieldReminders(modules);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (m: CustomModule) => {
    setEditing(m);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditing(null);
    load();
  };

  const deleteModule = async (m: CustomModule) => {
    if (!window.confirm(`确定删除「${m.name}」及其全部记录吗？`)) return;
    const { error: e1 } = await supabase.from("custom_entries").delete().eq("module_id", m.id).eq("user_id", user!.id);
    if (e1) {
      setError(getErrorMessage(e1, "删除失败，请稍后重试"));
      return;
    }
    const { error: e2 } = await supabase.from("custom_modules").delete().eq("id", m.id).eq("user_id", user!.id);
    if (e2) {
      setError(getErrorMessage(e2, "删除失败，请稍后重试"));
      return;
    }
    load();
  };

  const duplicateModule = async (module: CustomModule) => {
    const { error: duplicateError } = await supabase.from("custom_modules").insert({
      user_id: user!.id,
      name: `${module.name} 副本`,
      icon: module.icon,
      color: module.color,
      description: module.description,
      fields: module.fields.map((field) => ({ ...field, id: crypto.randomUUID() })),
    });
    if (duplicateError) setError(getErrorMessage(duplicateError, "复制失败，请稍后重试"));
    else load();
  };

  const importApplication = async (file: File) => {
    if (!user) return;
    setImporting(true);
    setError("");
    try {
      const parsed = JSON.parse(await file.text()) as {
        module?: Partial<CustomModule>;
        entries?: Array<{ data?: Record<string, unknown> }>;
      };
      const sourceModule = parsed.module;
      if (!sourceModule || typeof sourceModule.name !== "string" || !Array.isArray(sourceModule.fields)) {
        throw new Error("JSON 文件不是有效的自定义应用备份");
      }

      const allowedTypes = new Set(["text", "textarea", "number", "date", "select", "boolean", "formula", "relation"]);
      const fieldIdMap = new Map<string, string>();
      const sourceFields = sourceModule.fields.filter((field) => field && typeof field.label === "string" && allowedTypes.has(field.type ?? ""));
      sourceFields.forEach((field) => fieldIdMap.set(field.id ?? crypto.randomUUID(), crypto.randomUUID()));
      const fields = sourceFields.map((field) => ({
        ...field,
        id: fieldIdMap.get(field.id ?? "") ?? crypto.randomUUID(),
        label: field.label!.trim(),
        options: Array.isArray(field.options) ? field.options.filter((option): option is string => typeof option === "string") : [],
        formula: field.formula ? { ...field.formula, sourceFieldId: fieldIdMap.get(field.formula.sourceFieldId) ?? field.formula.sourceFieldId } : undefined,
      }));
      if (fields.length === 0) throw new Error("备份中没有可用字段");

      const { data: createdModule, error: moduleError } = await supabase.from("custom_modules").insert({
        user_id: user.id,
        name: `${sourceModule.name} 导入副本`,
        icon: sourceModule.icon ?? "ri-star-line",
        color: sourceModule.color ?? "primary",
        description: sourceModule.description ?? null,
        fields,
      }).select("id").single();
      if (moduleError || !createdModule) throw moduleError ?? new Error("创建导入应用失败");

      const records = (parsed.entries ?? []).filter((entry) => entry && entry.data && typeof entry.data === "object").map((entry) => ({
        user_id: user.id,
        module_id: createdModule.id,
        data: Object.fromEntries(Object.entries(entry.data!).flatMap(([oldId, value]) => {
          const newId = fieldIdMap.get(oldId);
          return newId ? [[newId, value]] : [];
        })),
      }));
      if (records.length > 0) {
        const { error: entriesError } = await supabase.from("custom_entries").insert(records);
        if (entriesError) {
          await supabase.from("custom_modules").delete().eq("id", createdModule.id).eq("user_id", user.id);
          throw entriesError;
        }
      }
      await load();
    } catch (e) {
      setError(getErrorMessage(e, "导入失败，请选择有效的 JSON 应用备份"));
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const exportModule = async (module: CustomModule, includeData: boolean = false) => {
    const exportData: { module: Partial<CustomModule>; entries: Array<{ data: Record<string, unknown> }> } = {
      module: {
        name: module.name,
        icon: module.icon,
        color: module.color,
        description: module.description,
        fields: module.fields,
      },
      entries: [],
    };

    if (includeData) {
      const { data: entriesData } = await supabase
        .from("custom_entries")
        .select("data")
        .eq("module_id", module.id)
        .eq("user_id", user!.id);
      if (entriesData) {
        exportData.entries = entriesData as Array<{ data: Record<string, unknown> }>;
      }
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${module.name}_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleModules = modules
    .filter((module) => {
      const query = search.trim().toLowerCase();
      return !query || `${module.name} ${module.description ?? ""}`.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "zh-CN");
      if (sort === "count") return (entryCounts[b.id] ?? 0) - (entryCounts[a.id] ?? 0);
      return a.created_at.localeCompare(b.created_at);
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground-900">应用中心</h1>
          <p className="mt-1 text-sm text-foreground-500">打造属于你自己的专属功能模块</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" />
          新建模块
        </button>
        <button
          onClick={() => importInputRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-md border border-background-200 text-foreground-600 text-sm hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          <i className="ri-upload-2-line" />{importing ? "导入中..." : "导入 JSON"}
        </button>
        <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) importApplication(file); }} />
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
      ) : modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-background-300">
          <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-secondary-100 text-secondary-700 mb-3">
            <i className="ri-apps-2-line text-2xl" />
          </div>
          <p className="text-sm font-medium text-foreground-700">还没有自定义模块</p>
          <p className="mt-1 text-sm text-foreground-500 max-w-xs">
            想记录饮水、体重、阅读进度、开销？点击「新建模块」创建一个吧
          </p>
          <button
            onClick={openAdd}
            className="mt-5 px-5 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            创建第一个模块
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索应用名称或描述"
                className="w-full pl-9 pr-4 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400"
              />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="px-3 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-600 cursor-pointer">
              <option value="created">按创建时间</option>
              <option value="name">按名称</option>
              <option value="count">按记录数量</option>
            </select>
          </div>
          {visibleModules.length === 0 ? (
            <div className="py-12 text-center text-sm text-foreground-500">没有匹配的应用</div>
          ) : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleModules.map((m) => {
            const c = moduleColorMap[m.color] ?? moduleColorMap.primary;
            const count = entryCounts[m.id] ?? 0;
            return (
              <div
                key={m.id}
                className="group relative rounded-lg bg-background-50 border border-background-200 p-4 hover:border-background-300 transition-colors"
              >
                <Link to={`/apps/${m.id}`} className="flex items-start gap-3 cursor-pointer">
                  <span className={`w-11 h-11 flex items-center justify-center rounded-xl ${c.bg} ${c.text} shrink-0`}>
                    <i className={`${m.icon} text-xl`} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground-900">{m.name}</h3>
                    {m.description ? (
                      <p className="mt-0.5 text-xs text-foreground-500 line-clamp-2">{m.description}</p>
                    ) : (
                      <p className="mt-0.5 text-xs text-foreground-400">{count} 条记录</p>
                    )}
                    {m.fields.filter((field) => !field.archived).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.fields.filter((field) => !field.archived).slice(0, 3).map((f) => (
                          <span key={f.id} className="px-2 py-0.5 rounded-full bg-background-100 text-foreground-500 text-xs">
                            {f.label}
                          </span>
                        ))}
                        {m.fields.filter((field) => !field.archived).length > 3 && (
                          <span className="px-2 py-0.5 rounded-full bg-background-100 text-foreground-400 text-xs">
                            +{m.fields.filter((field) => !field.archived).length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>

                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(m)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-background-100 text-foreground-500 hover:bg-background-200 cursor-pointer"
                    aria-label="编辑"
                  >
                    <i className="ri-edit-line" />
                  </button>
                  <button
                    onClick={() => duplicateModule(m)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-background-100 text-foreground-500 hover:bg-background-200 cursor-pointer"
                    aria-label="复制"
                  >
                    <i className="ri-file-copy-line" />
                  </button>
                  <button
                    onClick={() => exportModule(m, false)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-background-100 text-foreground-500 hover:bg-background-200 cursor-pointer"
                    aria-label="导出"
                  >
                    <i className="ri-download-line" />
                  </button>
                  <button
                    onClick={() => deleteModule(m)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-background-100 text-foreground-500 hover:bg-accent-100 hover:text-accent-700 cursor-pointer"
                    aria-label="删除"
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>}
        </>
      )}

      {/* 引导文案 */}
      <div className="rounded-lg bg-primary-50 border border-primary-100 p-5">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 shrink-0">
            <i className="ri-lightbulb-line text-lg" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground-900">灵感示例</p>
            <p className="mt-1 text-sm text-foreground-600 leading-relaxed">
              饮水记录（数字·杯）、体重记录（数字·公斤）、阅读进度（数字·页 + 文本·书名）、
              心情日志（选项 + 文本），一切由你自定义。
            </p>
          </div>
        </div>
      </div>

      {modalOpen && (
        <ModuleModal
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