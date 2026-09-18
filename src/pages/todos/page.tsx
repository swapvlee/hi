import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import TodoModal from "@/pages/todos/components/TodoModal";
import TodoItem from "@/pages/todos/components/TodoItem";
import EmptyState from "@/components/base/EmptyState";

export interface Todo {
  id: string;
  title: string;
  notes: string | null;
  priority: number;
  due_date: string | null;
  due_time: string | null;
  completed: boolean;
  tags: string[] | null;
}

type Filter = "all" | "active" | "done";

export default function Todos() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase
        .from("todos")
        .select("*")
        .order("completed", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (err) throw err;
      setTodos((data ?? []) as Todo[]);
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleComplete = async (todo: Todo) => {
    const next = !todo.completed;
    const { error: err } = await supabase
      .from("todos")
      .update({
        completed: next,
        completed_at: next ? new Date().toISOString() : null,
      })
      .eq("id", todo.id);

    if (err) {
      setError(getErrorMessage(err, "操作失败，请稍后重试"));
      return;
    }
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todo.id
          ? { ...t, completed: next, completed_at: next ? new Date().toISOString() : null }
          : t
      )
    );
  };

  const handleDelete = async (id: string) => {
    const { error: err } = await supabase.from("todos").delete().eq("id", id);
    if (err) {
      setError(getErrorMessage(err, "操作失败，请稍后重试"));
      return;
    }
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (todo: Todo) => {
    setEditing(todo);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditing(null);
    load();
  };

  const filtered = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "done") return t.completed;
    return true;
  });

  const counts = {
    all: todos.length,
    active: todos.filter((t) => !t.completed).length,
    done: todos.filter((t) => t.completed).length,
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `全部 ${counts.all}` },
    { key: "active", label: `进行中 ${counts.active}` },
    { key: "done", label: `已完成 ${counts.done}` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground-900">待办清单</h1>
          <p className="mt-1 text-sm text-foreground-500">把今天要做的事一件件划掉</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" />
          添加任务
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

      {/* 筛选切换 */}
      <div className="flex items-center gap-1 p-1 rounded-full bg-background-100 w-fit">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              filter === f.key
                ? "bg-background-50 text-foreground-900"
                : "text-foreground-500 hover:text-foreground-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="ri-checkbox-circle-line"
          accent="bg-primary-100 text-primary-600"
          title={filter === "done" ? "还没有完成的任务" : "还没有任务"}
          description={filter === "done" ? "完成一件任务会很有成就感" : "把今天要做的事记下来，一件件完成"}
          actionLabel={filter === "done" ? "看看进行中的任务" : "添加任务"}
          actionIcon={filter === "done" ? "ri-checkbox-circle-line" : "ri-add-line"}
          onAction={filter === "done" ? () => setFilter("active") : openAdd}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleComplete}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}

      {modalOpen && (
        <TodoModal
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