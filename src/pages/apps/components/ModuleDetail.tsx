import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import { CustomEntry, CustomField, CustomModule, CustomValue, moduleColorMap, moodEmojiMap, isMoodField } from "@/pages/apps/appsUtils";
import EntryModal from "@/pages/apps/components/EntryModal";
import ModuleModal from "@/pages/apps/components/ModuleModal";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86400000);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const time = `${hh}:${mm}`;
  if (diffDays === 0) return `今天 ${time}`;
  if (diffDays === 1) return `昨天 ${time}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${time}`;
}

function displayValue(field: CustomField, value: CustomValue) {
  if (field.type === "relation") {
    if (typeof value === "object") return value.label || "已关联记录";
    return String(value).split("|").slice(1).join("|") || "已关联记录";
  }
  const strValue = String(value);
  if (isMoodField(field.label) && moodEmojiMap[strValue]) {
    return `${moodEmojiMap[strValue]} ${strValue}`;
  }
  return strValue;
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function ModuleDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [module, setModule] = useState<CustomModule | null>(null);
  const [entries, setEntries] = useState<CustomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entryOpen, setEntryOpen] = useState(searchParams.get("new") === "1");
  const [editingEntry, setEditingEntry] = useState<CustomEntry | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "table" | "calendar" | "chart">("list");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">("line");
  const [chartRange, setChartRange] = useState<"week" | "month" | "all">("month");
  const [chartField, setChartField] = useState<string>("");
  const [chartCategory, setChartCategory] = useState<string>("");
  const [chartGroupBy, setChartGroupBy] = useState<"day" | "month" | "year">("day");
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [moduleRes, entriesRes] = await Promise.all([
        supabase.from("custom_modules").select("*").eq("id", id).eq("user_id", user!.id).maybeSingle(),
        supabase.from("custom_entries").select("*").eq("module_id", id).eq("user_id", user!.id).order("created_at", { ascending: false }).range(0, 499),
      ]);
      if (moduleRes.error) throw moduleRes.error;
      if (entriesRes.error) throw entriesRes.error;
      if (!moduleRes.data) {
        setError("模块不存在或已被删除");
        setLoading(false);
        return;
      }
      setModule(moduleRes.data as CustomModule);
      setEntries((entriesRes.data ?? []) as CustomEntry[]);
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && module) {
      setEntryOpen(true);
      navigate(".", { replace: true });
    }
  }, [module, searchParams, navigate]);

  const streakData = useMemo(() => {
    if (entries.length === 0) return { current: 0, best: 0, todayHasRecord: false };
    const activeFieldsForStreak = module?.fields.filter((f) => !f.archived) ?? [];
    const dateFieldForStreak = activeFieldsForStreak.find((f) => f.type === "date");
    const getStreakDate = (entry: CustomEntry) => {
      const value = dateFieldForStreak ? entry.data[dateFieldForStreak.id] : undefined;
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : entry.created_at.slice(0, 10);
    };

    const activeDates = new Set(entries.map((e) => getStreakDate(e)));
    const sortedDates = Array.from(activeDates).sort().reverse();

    let best = 0;
    let run = 0;
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        run = 1;
      } else {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
        if (diffDays === 1) {
          run++;
        } else {
          run = 1;
        }
      }
      best = Math.max(best, run);
    }

    const today = new Date().toISOString().slice(0, 10);
    let current = 0;
    if (activeDates.has(today)) {
      current = 1;
      const check = new Date(today);
      while (true) {
        check.setDate(check.getDate() - 1);
        const dateStr = check.toISOString().slice(0, 10);
        if (activeDates.has(dateStr)) {
          current++;
        } else {
          break;
        }
      }
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      if (activeDates.has(yesterdayStr)) {
        current = 0;
      }
    }

    return { current, best, todayHasRecord: activeDates.has(today) };
  }, [entries, module]);

  const deleteModule = async () => {
    if (!module) return;
    if (!window.confirm(`确定删除「${module.name}」及其全部记录吗？`)) return;
    // 先删除记录，再删除模块
    const { error: e1 } = await supabase.from("custom_entries").delete().eq("module_id", module.id).eq("user_id", user!.id);
    if (e1) {
      setError(getErrorMessage(e1, "删除失败，请稍后重试"));
      return;
    }
    const { error: e2 } = await supabase.from("custom_modules").delete().eq("id", module.id).eq("user_id", user!.id);
    if (e2) {
      setError(getErrorMessage(e2, "删除失败，请稍后重试"));
      return;
    }
    navigate("/apps", { replace: true });
  };

  const deleteEntry = async (entryId: string) => {
    if (!window.confirm("确定删除这条记录吗？")) return;
    const { error: err } = await supabase.from("custom_entries").delete().eq("id", entryId).eq("user_id", user!.id);
    if (err) {
      setError(getErrorMessage(err, "删除失败，请稍后重试"));
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    setSelectedIds((prev) => prev.filter((id) => id !== entryId));
  };

  const toggleSelected = (entryId: string) => {
    setSelectedIds((prev) => prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId]);
  };

  const togglePageSelection = () => {
    const pageIds = pageEntries.map((entry) => entry.id);
    const allSelected = pageIds.length > 0 && pageIds.every((entryId) => selectedIds.includes(entryId));
    setSelectedIds((prev) => allSelected
      ? prev.filter((entryId) => !pageIds.includes(entryId))
      : [...new Set([...prev, ...pageIds])]);
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0 || !window.confirm(`确定删除选中的 ${selectedIds.length} 条记录吗？`)) return;
    const { error: deleteError } = await supabase
      .from("custom_entries")
      .delete()
      .in("id", selectedIds)
      .eq("module_id", module!.id)
      .eq("user_id", user!.id);
    if (deleteError) {
      setError(getErrorMessage(deleteError, "批量删除失败，请稍后重试"));
      return;
    }
    setEntries((prev) => prev.filter((entry) => !selectedIds.includes(entry.id)));
    setSelectedIds([]);
    setPage((current) => Math.min(current, Math.max(1, Math.ceil((visibleEntries.length - selectedIds.length) / pageSize))));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !module) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-foreground-600">{error}</p>
        <Link
          to="/apps"
          className="mt-4 px-4 py-2 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          返回应用中心
        </Link>
      </div>
    );
  }

  if (!module) return null;

  const c = moduleColorMap[module.color] ?? moduleColorMap.primary;
  const activeFields = module.fields.filter((field) => !field.archived);
  const displayFields = activeFields.filter((field) => field.type !== "formula");
  const dateField = activeFields.find((field) => field.type === "date");
  const getEntryDate = (entry: CustomEntry) => {
    const value = dateField ? entry.data[dateField.id] : undefined;
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : entry.created_at.slice(0, 10);
  };
  const visibleEntries = entries.filter((entry) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || activeFields.some((field) => displayValue(field, entry.data[field.id] ?? "").toLowerCase().includes(query));
    const entryDate = getEntryDate(entry);
    const matchesDate = (!dateFrom || entryDate >= dateFrom) && (!dateTo || entryDate <= dateTo);
    return matchesSearch && matchesDate;
  }).sort((a, b) => {
    const aValue = sortField === "created_at" ? a.created_at : String(a.data[sortField] ?? "");
    const bValue = sortField === "created_at" ? b.created_at : String(b.data[sortField] ?? "");
    return sortDirection === "asc" ? aValue.localeCompare(bValue, "zh-CN", { numeric: true }) : bValue.localeCompare(aValue, "zh-CN", { numeric: true });
  });
  const totalPages = Math.max(1, Math.ceil(visibleEntries.length / pageSize));
  const pageEntries = visibleEntries.slice((page - 1) * pageSize, page * pageSize);
  const numberStats = activeFields
    .filter((field) => field.type === "number" || field.type === "formula")
    .map((field) => {
    const sourceFieldId = field.type === "formula" ? field.formula?.sourceFieldId : field.id;
    const values = visibleEntries
      .map((entry) => sourceFieldId ? entry.data[sourceFieldId] : undefined)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const total = values.reduce((sum, value) => sum + value, 0);
    const average = values.length > 0 ? total / values.length : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    const count = values.length;
    let formulaValue: number;
    let formulaLabel: string;
    if (field.type === "formula") {
      switch (field.formula?.operation) {
        case "average": formulaValue = average; formulaLabel = "平均值"; break;
        case "count": formulaValue = count; formulaLabel = "计数"; break;
        case "min": formulaValue = min; formulaLabel = "最小值"; break;
        case "max": formulaValue = max; formulaLabel = "最大值"; break;
        default: formulaValue = total; formulaLabel = "合计"; break;
      }
    } else {
      formulaValue = total;
      formulaLabel = "合计";
    }
    return { field, total, average, min, max, value: formulaValue, count, formulaLabel };
  });

  const exportCsv = () => {
    const header = [...displayFields.map((field) => field.label), "记录时间"];
    const rows = visibleEntries.map((entry) => [
      ...displayFields.map((field) => displayValue(field, entry.data[field.id] ?? "")),
      formatDate(entry.created_at),
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => csvEscape(String(value))).join(",")).join("\r\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${module.name}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const payload = { module: { ...module, fields: activeFields }, entries: visibleEntries };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${module.name}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    const tableEl = document.getElementById("module-data-table");
    if (!tableEl) return;

    try {
      const canvas = await html2canvas(tableEl, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.setFontSize(16);
      pdf.text(`${module.name} - 数据报表`, 10, 15);
      pdf.setFontSize(10);
      pdf.text(`导出时间: ${new Date().toLocaleString()}`, 10, 22);
      pdf.addImage(imgData, "PNG", 10, 30, imgWidth, imgHeight);
      pdf.save(`${module.name}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF导出失败:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-foreground-500">
        <Link to="/apps" className="flex items-center gap-1 hover:text-primary-600 transition-colors cursor-pointer">
          <i className="ri-arrow-left-s-line" />
          应用中心
        </Link>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-accent-100/70 text-accent-800 px-4 py-3 text-sm">
          <span>{error}</span>
          <button onClick={load} className="font-medium underline cursor-pointer whitespace-nowrap">
            重试
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`w-12 h-12 flex items-center justify-center rounded-xl ${c.bg} ${c.text} shrink-0`}>
            <i className={`${module.icon} text-2xl`} />
          </span>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground-900">{module.name}</h1>
            {module.description && (
              <p className="mt-0.5 text-sm text-foreground-500">{module.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-background-200 text-sm text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-edit-line" />
            编辑
          </button>
          <button
            onClick={deleteModule}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-background-200 text-sm text-foreground-600 hover:bg-accent-100 hover:text-accent-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-delete-bin-line" />
            删除模块
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-foreground-500">共 {entries.length} 条记录</p>
          {entries.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <i className={`${streakData.current > 0 ? "ri-fire-fill text-accent-500" : "ri-fire-line text-foreground-300"}`} />
              <span className="font-medium text-foreground-700">连续 {streakData.current} 天</span>
              {streakData.best > 0 && (
                <span className="text-foreground-400">· 最佳 {streakData.best} 天</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => { setEditingEntry(null); setEntryOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" />
          添加记录
        </button>
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); setSelectedIds([]); }}
              placeholder="搜索记录内容"
              className="w-full pl-9 pr-4 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400"
            />
          </div>
          <div className="flex rounded-md border border-background-200 bg-background-50 p-1">
            <button
              onClick={() => setView("list")}
              className={`flex-1 px-3 py-1.5 rounded text-sm cursor-pointer ${view === "list" ? "bg-primary-100 text-primary-700" : "text-foreground-500"}`}
              aria-label="列表视图"
            >
              <i className="ri-list-check" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`flex-1 px-3 py-1.5 rounded text-sm cursor-pointer ${view === "table" ? "bg-primary-100 text-primary-700" : "text-foreground-500"}`}
              aria-label="表格视图"
            >
              <i className="ri-table-line" />
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`flex-1 px-3 py-1.5 rounded text-sm cursor-pointer ${view === "calendar" ? "bg-primary-100 text-primary-700" : "text-foreground-500"}`}
              aria-label="日历视图"
            ><i className="ri-calendar-line" /></button>
            <button
              onClick={() => setView("chart")}
              className={`flex-1 px-3 py-1.5 rounded text-sm cursor-pointer ${view === "chart" ? "bg-primary-100 text-primary-700" : "text-foreground-500"}`}
              aria-label="图表视图"
            ><i className="ri-bar-chart-line" /></button>
          </div>
          <button onClick={exportCsv} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md border border-background-200 text-sm text-foreground-600 hover:bg-background-100 cursor-pointer whitespace-nowrap" title="导出 CSV">
            <i className="ri-download-2-line" />导出
          </button>
          <button onClick={exportJson} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md border border-background-200 text-sm text-foreground-600 hover:bg-background-100 cursor-pointer whitespace-nowrap" title="导出 JSON">
            <i className="ri-braces-line" />JSON
          </button>
          <button onClick={exportPdf} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md border border-background-200 text-sm text-foreground-600 hover:bg-background-100 cursor-pointer whitespace-nowrap" title="导出 PDF">
            <i className="ri-file-pdf-line" />PDF
          </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="flex items-center gap-2 text-xs text-foreground-500">
              从 <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); setSelectedIds([]); }} className="px-2 py-2 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-700" />
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground-500">
              到 <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); setSelectedIds([]); }} className="px-2 py-2 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-700" />
            </label>
            <select value={sortField} onChange={(e) => { setSortField(e.target.value); setPage(1); setSelectedIds([]); }} className="px-3 py-2 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-600 cursor-pointer">
              <option value="created_at">按记录时间</option>
              {displayFields.map((field) => <option key={field.id} value={field.id}>按{field.label}</option>)}
            </select>
            <button onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")} className="px-3 py-2 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-600 cursor-pointer" title="切换排序方向">
              <i className={sortDirection === "asc" ? "ri-sort-asc" : "ri-sort-desc"} />
            </button>
          </div>
        </div>
      )}

      {numberStats.length > 0 && visibleEntries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {numberStats.map(({ field, value, average, min, max, count, formulaLabel }) => {
            let subInfo: string;
            if (field.type === "formula") {
              switch (field.formula?.operation) {
                case "count": subInfo = `共 ${count} 条有效记录`; break;
                case "min": subInfo = `最小值 ${min.toFixed(1)}${field.unit ? ` ${field.unit}` : ""}`; break;
                case "max": subInfo = `最大值 ${max.toFixed(1)}${field.unit ? ` ${field.unit}` : ""}`; break;
                case "average": subInfo = "按来源字段平均"; break;
                default: subInfo = `平均 ${average.toFixed(1)}${field.unit ? ` ${field.unit}` : ""}`; break;
              }
            } else {
              subInfo = `平均 ${average.toFixed(1)}${field.unit ? ` ${field.unit}` : ""} · ${count} 条有效记录`;
            }
            return (
            <div key={field.id} className="rounded-lg bg-background-50 border border-background-200 p-4">
              <p className="text-xs text-foreground-500">{field.label} · {formulaLabel}</p>
              <p className="mt-1 text-xl font-heading font-bold text-foreground-900">
                {field.type === "formula" && field.formula?.operation === "count"
                  ? String(value)
                  : value.toLocaleString(undefined, { maximumFractionDigits: 2 })}{field.unit && field.formula?.operation !== "count" ? ` ${field.unit}` : ""}
              </p>
              <p className="mt-1 text-xs text-foreground-400">{subInfo}</p>
            </div>
            );
          })}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-primary-50 border border-primary-100 px-4 py-3 text-sm">
          <span className="text-primary-800">已选择 {selectedIds.length} 条记录</span>
          <button onClick={deleteSelected} className="flex items-center gap-1.5 text-accent-700 hover:text-accent-800 cursor-pointer">
            <i className="ri-delete-bin-line" />批量删除
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-background-300">
          <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-secondary-100 text-secondary-700 mb-3">
            <i className={`${module.icon} text-2xl`} />
          </div>
          <p className="text-sm font-medium text-foreground-700">还没有记录</p>
          <p className="mt-1 text-sm text-foreground-500">点击「添加记录」开始记录第一条吧</p>
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="py-12 text-center text-sm text-foreground-500">没有匹配的记录</div>
      ) : view === "calendar" ? (
        <CalendarView
          entries={visibleEntries}
          fields={displayFields}
          onEdit={(entry) => { setEditingEntry(entry); setEntryOpen(true); }}
        />
      ) : view === "chart" ? (
        <ChartView
          entries={visibleEntries}
          fields={displayFields}
          chartType={chartType}
          setChartType={setChartType}
          chartRange={chartRange}
          setChartRange={setChartRange}
          chartField={chartField}
          setChartField={setChartField}
          chartCategory={chartCategory}
          setChartCategory={setChartCategory}
          chartGroupBy={chartGroupBy}
          setChartGroupBy={setChartGroupBy}
        />
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-lg border border-background-200 bg-background-50">
          <table id="module-data-table" className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-background-200 bg-background-100 text-xs text-foreground-500">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" checked={pageEntries.length > 0 && pageEntries.every((entry) => selectedIds.includes(entry.id))} onChange={togglePageSelection} className="h-4 w-4 accent-primary-500" aria-label="选择当前页记录" />
                </th>
                {displayFields.map((field) => <th key={field.id} className="px-4 py-3 font-medium">{field.label}</th>)}
                <th className="px-4 py-3 font-medium">记录时间</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pageEntries.map((entry) => (
                <tr key={entry.id} className="group border-b border-background-100 last:border-0 hover:bg-background-100/60">
                  <td className="px-3 py-3"><input type="checkbox" checked={selectedIds.includes(entry.id)} onChange={() => toggleSelected(entry.id)} className="h-4 w-4 accent-primary-500" aria-label="选择记录" /></td>
                  {displayFields.map((field) => {
                    const value = entry.data[field.id];
                    return <td key={field.id} className="max-w-[220px] px-4 py-3 text-foreground-700 truncate">{value === undefined || value === "" ? "-" : `${displayValue(field, value)}${field.unit ? ` ${field.unit}` : ""}`}</td>;
                  })}
                  <td className="px-4 py-3 text-xs text-foreground-400 whitespace-nowrap">{formatDate(entry.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => { setEditingEntry(entry); setEntryOpen(true); }} className="w-7 h-7 text-foreground-400 hover:text-primary-600 cursor-pointer" aria-label="编辑记录"><i className="ri-edit-line" /></button>
                      <button onClick={() => deleteEntry(entry.id)} className="w-7 h-7 text-foreground-400 hover:text-accent-700 cursor-pointer" aria-label="删除记录"><i className="ri-delete-bin-line" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="space-y-2">
          {pageEntries.map((entry) => (
            <li key={entry.id} className="group flex items-start gap-3 rounded-lg bg-background-50 border border-background-200 p-4">
              <input type="checkbox" checked={selectedIds.includes(entry.id)} onChange={() => toggleSelected(entry.id)} className="mt-1 h-4 w-4 shrink-0 accent-primary-500" aria-label="选择记录" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                  {displayFields.map((f) => {
                    const val = entry.data[f.id];
                    if (val === undefined || val === null || val === "") return null;
                    return (
                      <div key={f.id} className="min-w-0">
                        <span className="text-xs text-foreground-400">{f.label}</span>
                        <span className="ml-1.5 text-sm font-medium text-foreground-900 break-all">
                          {displayValue(f, val)}{f.unit ? ` ${f.unit}` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-foreground-400">{formatDate(entry.created_at)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditingEntry(entry); setEntryOpen(true); }}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 hover:text-primary-600 cursor-pointer"
                  aria-label="编辑记录"
                >
                  <i className="ri-edit-line" />
                </button>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-accent-100 hover:text-accent-700 cursor-pointer"
                  aria-label="删除记录"
                >
                  <i className="ri-delete-bin-line" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(view === "list" || view === "table") && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-foreground-500">
          <span>第 {page} / {totalPages} 页，共 {visibleEntries.length} 条</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="px-3 py-1.5 rounded-md border border-background-200 disabled:opacity-40 cursor-pointer disabled:cursor-default">上一页</button>
            <button disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="px-3 py-1.5 rounded-md border border-background-200 disabled:opacity-40 cursor-pointer disabled:cursor-default">下一页</button>
          </div>
        </div>
      )}

      {entryOpen && (
        <EntryModal
          key={editingEntry?.id ?? "new"}
          module={module}
          entry={editingEntry}
          onClose={() => setEntryOpen(false)}
          onSaved={() => {
            setEntryOpen(false);
            load();
          }}
        />
      )}

      {editOpen && (
        <ModuleModal
          editing={module}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

interface ChartViewProps {
  entries: CustomEntry[];
  fields: CustomField[];
  chartType: "line" | "bar" | "pie";
  setChartType: (type: "line" | "bar" | "pie") => void;
  chartRange: "week" | "month" | "all";
  setChartRange: (range: "week" | "month" | "all") => void;
  chartField: string;
  setChartField: (fieldId: string) => void;
  chartCategory: string;
  setChartCategory: (category: string) => void;
  chartGroupBy: "day" | "month" | "year";
  setChartGroupBy: (groupBy: "day" | "month" | "year") => void;
}

function ChartView({ entries, fields, chartType, setChartType, chartRange, setChartRange, chartField, setChartField, chartCategory, setChartCategory, chartGroupBy, setChartGroupBy }: ChartViewProps) {
  const numberFields = fields.filter((f) => f.type === "number");
  const selectFields = fields.filter((f) => f.type === "select");

  const filteredEntries = useMemo(() => {
    if (chartRange === "all") return entries;
    const now = new Date();
    const start = new Date(now);
    if (chartRange === "week") start.setDate(now.getDate() - 7);
    else if (chartRange === "month") start.setMonth(now.getMonth() - 1);
    return entries.filter((e) => new Date(e.created_at) >= start);
  }, [entries, chartRange]);

  const chartData = useMemo(() => {
    if (!chartField) return [];
    const field = fields.find((f) => f.id === chartField);
    if (!field) return [];

    if (chartType === "pie") {
      const selectedField = fields.find((f) => f.id === chartField);
      if (selectedField?.type === "number" && chartCategory) {
        const amounts: Record<string, number> = {};
        filteredEntries.forEach((entry) => {
          const category = String(entry.data[chartCategory] ?? "未分类");
          const val = Number(entry.data[chartField]) || 0;
          amounts[category] = (amounts[category] ?? 0) + val;
        });
        return Object.entries(amounts)
          .sort(([, a], [, b]) => b - a)
          .map(([name, value]) => ({ name, value }));
      }
      if (selectedField?.type === "number") {
        const total = filteredEntries.reduce((sum, entry) => sum + (Number(entry.data[chartField]) || 0), 0);
        return [{ name: "总计", value: total }];
      }
      const counts: Record<string, number> = {};
      filteredEntries.forEach((entry) => {
        const val = String(entry.data[chartField] ?? "未填写");
        counts[val] = (counts[val] ?? 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }

    const grouped: Record<string, number> = {};
    filteredEntries.forEach((entry) => {
      const date = new Date(entry.created_at);
      let key: string;
      if (chartGroupBy === "year") {
        key = `${date.getFullYear()}年`;
      } else if (chartGroupBy === "month") {
        key = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      } else {
        key = `${date.getMonth() + 1}/${date.getDate()}`;
      }
      const val = Number(entry.data[chartField]) || 0;
      grouped[key] = (grouped[key] ?? 0) + val;
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => {
        if (chartGroupBy === "year") {
          const ya = parseInt(a);
          const yb = parseInt(b);
          return ya - yb;
        }
        if (chartGroupBy === "month") {
          const [ya, ma] = a.match(/(\d+)年(\d+)月/)!.slice(1).map(Number);
          const [yb, mb] = b.match(/(\d+)年(\d+)月/)!.slice(1).map(Number);
          return ya - yb || ma - mb;
        }
        const [ma, da] = a.split("/").map(Number);
        const [mb, db] = b.split("/").map(Number);
        return new Date(2024, ma - 1, da).getTime() - new Date(2024, mb - 1, db).getTime();
      })
      .map(([date, value]) => ({ date, value }));
  }, [filteredEntries, chartField, chartCategory, chartType, chartGroupBy, fields]);

  if (numberFields.length === 0 && selectFields.length === 0) {
    return <div className="py-12 text-center text-sm text-foreground-500">当前模块没有可绘制的数字或选项字段</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-background-200 bg-background-50 p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-500">字段：</span>
          <select
            value={chartField}
            onChange={(e) => setChartField(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-background-200 bg-background-50 text-sm"
          >
            <option value="">选择字段</option>
            {numberFields.map((f) => (
              <option key={f.id} value={f.id}>{f.label} (数字)</option>
            ))}
            {selectFields.map((f) => (
              <option key={f.id} value={f.id}>{f.label} (选项)</option>
            ))}
          </select>
        </div>

        {chartType === "pie" && numberFields.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-500">分组：</span>
            <select
              value={chartCategory}
              onChange={(e) => setChartCategory(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-background-200 bg-background-50 text-sm"
            >
              <option value="">不分组</option>
              {selectFields.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1 rounded-md bg-background-100 p-0.5">
          {(["line", "bar", "pie"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-3 py-1 rounded text-sm ${chartType === type ? "bg-background-50 shadow-sm" : "text-foreground-500"}`}
            >
              {type === "line" && "📈 折线"}
              {type === "bar" && "📊 柱状"}
              {type === "pie" && "🥧 饼图"}
            </button>
          ))}
        </div>

        {chartType !== "pie" && (
          <div className="flex items-center gap-1 rounded-md bg-background-100 p-0.5">
            {(["day", "month", "year"] as const).map((groupBy) => (
              <button
                key={groupBy}
                onClick={() => setChartGroupBy(groupBy)}
                className={`px-3 py-1 rounded text-sm ${chartGroupBy === groupBy ? "bg-background-50 shadow-sm" : "text-foreground-500"}`}
              >
                {groupBy === "day" && "按天"}
                {groupBy === "month" && "按月"}
                {groupBy === "year" && "按年"}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 rounded-md bg-background-100 p-0.5">
          {(["week", "month", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setChartRange(range)}
              className={`px-3 py-1 rounded text-sm ${chartRange === range ? "bg-background-50 shadow-sm" : "text-foreground-500"}`}
            >
              {range === "week" && "近7天"}
              {range === "month" && "近30天"}
              {range === "all" && "全部"}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="py-12 text-center text-sm text-foreground-500">暂无数据</div>
      ) : chartType === "pie" ? (
        <div className="flex justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <ResponsiveContainer width="100%" height={300}>
            {chartType === "line" ? (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              </AreaChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {numberFields.map((field) => {
          const values = filteredEntries.map((e) => Number(e.data[field.id]) || 0);
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = values.length > 0 ? sum / values.length : 0;
          return (
            <div key={field.id} className="rounded-lg bg-background-50 border border-background-200 p-4">
              <p className="text-xs text-foreground-500">{field.label}</p>
              <p className="mt-1 text-xl font-bold text-foreground-900">{sum.toLocaleString(undefined, { maximumFractionDigits: 1 })}{field.unit ? ` ${field.unit}` : ""}</p>
              <p className="text-xs text-foreground-400">平均 {avg.toFixed(1)}{field.unit ? ` ${field.unit}` : ""}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CalendarViewProps {
  entries: CustomEntry[];
  fields: CustomField[];
  onEdit: (entry: CustomEntry) => void;
}

function CalendarView({ entries, fields, onEdit }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

  const entriesByDate: Record<string, CustomEntry[]> = {};
  entries.forEach((entry) => {
    const date = new Date(entry.created_at);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    if (!entriesByDate[key]) entriesByDate[key] = [];
    entriesByDate[key].push(entry);
  });

  const formatDisplayValue = (entry: CustomEntry) => {
    const values = fields.slice(0, 2).map((f) => {
      const val = entry.data[f.id];
      if (val === undefined || val === null || val === "") return null;
      return `${f.label}: ${String(val)}${f.unit ? ` ${f.unit}` : ""}`;
    }).filter(Boolean);
    return values.join(" · ") || "空记录";
  };

  const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push({
      date: new Date(current),
      isCurrentMonth: current.getMonth() === month,
      dateStr: `${current.getFullYear()}-${current.getMonth() + 1}-${current.getDate()}`,
    });
    current.setDate(current.getDate() + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="px-3 py-2 rounded-md hover:bg-background-100 cursor-pointer"
        >
          <i className="ri-arrow-left-s-line" />
        </button>
        <h3 className="text-lg font-semibold">{year}年{month + 1}月</h3>
        <button
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          className="px-3 py-2 rounded-md hover:bg-background-100 cursor-pointer"
        >
          <i className="ri-arrow-right-s-line" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg border border-background-200 overflow-hidden">
        {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
          <div key={day} className="bg-background-100 p-2 text-center text-xs font-medium text-foreground-500">
            {day}
          </div>
        ))}
        {days.map(({ date, isCurrentMonth, dateStr }, idx) => {
          const dayEntries = entriesByDate[dateStr] || [];
          const isToday = date.toDateString() === new Date().toDateString();
          return (
            <div
              key={idx}
              className={`min-h-[100px] bg-background-50 p-1 ${!isCurrentMonth ? "opacity-40" : ""}`}
            >
              <div className={`text-xs font-medium mb-1 ${isToday ? "text-primary-600" : "text-foreground-500"}`}>
                {date.getDate()}
              </div>
              <div className="space-y-1">
                {dayEntries.slice(0, 3).map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => onEdit(entry)}
                    className="text-xs bg-primary-100 text-primary-700 rounded px-1 py-0.5 truncate cursor-pointer hover:bg-primary-200"
                  >
                    {formatDisplayValue(entry)}
                  </div>
                ))}
                {dayEntries.length > 3 && (
                  <div className="text-xs text-foreground-400">+{dayEntries.length - 3} 更多</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}