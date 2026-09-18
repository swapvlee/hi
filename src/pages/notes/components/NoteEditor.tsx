import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import type { Note } from "@/pages/notes/types";
import RichText from "@/pages/notes/components/RichText";

interface NoteEditorProps {
  editing: Note | null;
  onClose: () => void;
  onSaved: () => void;
}

const moods = [
  { emoji: "😄", label: "开心" },
  { emoji: "😊", label: "不错" },
  { emoji: "😌", label: "平静" },
  { emoji: "😐", label: "一般" },
  { emoji: "😔", label: "低落" },
  { emoji: "😢", label: "难过" },
  { emoji: "😡", label: "生气" },
  { emoji: "🤔", label: "思考" },
];

export default function NoteEditor({ editing, onClose, onSaved }: NoteEditorProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [content, setContent] = useState(editing?.content ?? "");
  const [mood, setMood] = useState<string | null>(editing?.mood ?? null);
  const [tags, setTags] = useState((editing?.tags ?? []).join(" "));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async () => {
    if (!title.trim() && !content.trim()) {
      setErr("写点内容再保存吧");
      return;
    }
    setSaving(true);
    setErr("");

    const payload = {
      title: title.trim(),
      content: content.trim() || null,
      mood,
      tags: tags.trim() ? tags.trim().split(/\s+/).filter(Boolean) : null,
    };

    if (editing) {
      const { error } = await supabase
        .from("notes")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
      if (error) {
        setErr(getErrorMessage(error, "保存失败，请稍后重试"));
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("notes").insert({ ...payload, user_id: user!.id });
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
        className="w-full sm:max-w-xl bg-background-50 rounded-t-2xl sm:rounded-lg px-5 py-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-lg text-foreground-900">
            {editing ? "编辑笔记" : "写一篇笔记"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 cursor-pointer"
            aria-label="关闭"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题（可选）"
          className="w-full px-4 py-3 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />

        {/* 心情 */}
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-500 mb-2">今天的心情</p>
          <div className="flex flex-wrap gap-2">
            {moods.map((m) => (
              <button
                key={m.emoji}
                onClick={() => setMood(mood === m.emoji ? null : m.emoji)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer whitespace-nowrap ${
                  mood === m.emoji
                    ? "bg-primary-100 text-primary-700 ring-2 ring-primary-300"
                    : "bg-background-100 text-foreground-500 hover:bg-background-200"
                }`}
              >
                <span className="text-base">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 富文本内容 */}
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-500 mb-2">内容</p>
          <RichText
            key={editing?.id ?? "new"}
            initialValue={editing?.content ?? ""}
            onChange={setContent}
          />
        </div>

        {/* 标签 */}
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-500 mb-2">标签（空格分隔，可选）</p>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="心情 成长"
            className="w-full px-4 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400"
          />
        </div>

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