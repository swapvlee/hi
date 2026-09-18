import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import NoteEditor from "@/pages/notes/components/NoteEditor";
import EmptyState from "@/components/base/EmptyState";

import type { Note } from "@/pages/notes/types";

function stripHtml(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase
        .from("notes")
        .select("*")
        .order("updated_at", { ascending: false });
      if (err) throw err;
      setNotes((data ?? []) as Note[]);
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    const { error: err } = await supabase.from("notes").delete().eq("id", id);
    if (err) {
      setError(getErrorMessage(err, "删除失败，请稍后重试"));
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setEditorOpen(true);
  };

  const handleSaved = () => {
    setEditorOpen(false);
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground-900">日记笔记</h1>
          <p className="mt-1 text-sm text-foreground-500">记录心情与想法，留住每一个当下</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line" />
          写一篇
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
      ) : notes.length === 0 ? (
        <EmptyState
          icon="ri-sticky-note-line"
          accent="bg-secondary-100 text-secondary-700"
          title="还没有笔记"
          description="记录心情与想法，留住每一个当下"
          actionLabel="写第一篇"
          onAction={openNew}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {notes.map((note) => {
            const snippet = stripHtml(note.content ?? "").trim();
            return (
              <article
                key={note.id}
                className="group relative rounded-lg bg-background-50 border border-background-200 p-4 hover:border-background-300 transition-colors cursor-pointer"
                onClick={() => openEdit(note)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {note.mood && (
                      <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-background-100 text-xl shrink-0">
                        {note.mood}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-foreground-900 truncate">
                        {note.title || "无标题"}
                      </h3>
                      <p className="text-xs text-foreground-400 mt-0.5">{formatDate(note.updated_at)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(note.id);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-accent-100 hover:text-accent-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    aria-label="删除"
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
                </div>

                {snippet && (
                  <p className="mt-3 text-sm text-foreground-600 line-clamp-3 leading-relaxed">{snippet}</p>
                )}

                {note.tags && note.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {note.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-700 text-xs"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {editorOpen && (
        <NoteEditor
          editing={editing}
          onClose={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}