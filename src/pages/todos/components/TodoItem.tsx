import { useState } from "react";
import type { Todo } from "@/pages/todos/page";

interface TodoItemProps {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

const priorityConfig = {
  0: { label: "低", cls: "bg-background-100 text-foreground-500" },
  1: { label: "中", cls: "bg-primary-100 text-primary-700" },
  2: { label: "高", cls: "bg-accent-100 text-accent-700" },
};

function formatDue(dueDate: string | null, dueTime: string | null) {
  if (!dueDate) return null;
  const d = new Date(dueDate + "T00:00:00");
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  let label = `${d.getMonth() + 1}月${d.getDate()}日`;
  if (isToday) label = "今天";
  else if (isTomorrow) label = "明天";

  const isOverdue = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return { label: dueTime ? `${label} ${dueTime.slice(0, 5)}` : label, isOverdue };
}

export default function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  const [confirming, setConfirming] = useState(false);
  const prio = priorityConfig[todo.priority as keyof typeof priorityConfig] ?? priorityConfig[0];
  const due = formatDue(todo.due_date, todo.due_time);

  return (
    <li className="group flex items-start gap-3 rounded-lg bg-background-50 border border-background-200 p-4 hover:border-background-300 transition-colors">
      <button
        onClick={() => onToggle(todo)}
        className="mt-0.5 w-6 h-6 shrink-0 flex items-center justify-center cursor-pointer"
        aria-label={todo.completed ? "标记为未完成" : "标记为完成"}
      >
        {todo.completed ? (
          <i className="ri-checkbox-circle-fill text-2xl text-primary-500" />
        ) : (
          <i className="ri-checkbox-blank-circle-line text-2xl text-foreground-300 hover:text-primary-500 transition-colors" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            todo.completed ? "text-foreground-400 line-through" : "text-foreground-900"
          }`}
        >
          {todo.title}
        </p>
        {todo.notes && !todo.completed && (
          <p className="mt-1 text-xs text-foreground-500 line-clamp-2">{todo.notes}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prio.cls}`}>
            {prio.label}优先级
          </span>
          {due && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                due.isOverdue && !todo.completed
                  ? "bg-accent-100 text-accent-700"
                  : "bg-background-100 text-foreground-500"
              }`}
            >
              <i className="ri-time-line mr-1" />
              {due.label}
              {due.isOverdue && !todo.completed ? " · 已逾期" : ""}
            </span>
          )}
          {todo.tags && todo.tags.length > 0 && (
            <span className="text-xs text-foreground-400">
              {todo.tags.map((t) => `#${t}`).join(" ")}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(todo)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 cursor-pointer"
          aria-label="编辑"
        >
          <i className="ri-edit-line" />
        </button>
        {confirming ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onDelete(todo.id);
                setConfirming(false);
              }}
              className="px-2 py-1 rounded-md bg-accent-500 text-background-50 text-xs cursor-pointer whitespace-nowrap"
            >
              删除
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-2 py-1 rounded-md bg-background-100 text-foreground-600 text-xs cursor-pointer whitespace-nowrap"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-accent-100 hover:text-accent-700 cursor-pointer"
            aria-label="删除"
          >
            <i className="ri-delete-bin-line" />
          </button>
        )}
      </div>
    </li>
  );
}