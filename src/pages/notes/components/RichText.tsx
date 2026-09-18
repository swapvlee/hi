import { useEffect, useRef } from "react";

interface RichTextProps {
  initialValue: string;
  onChange: (html: string) => void;
}

export default function RichText({ initialValue, onChange }: RichTextProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = initialValue || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd: string, val?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    onChange(ref.current?.innerHTML ?? "");
  };

  const tools = [
    { cmd: "bold", icon: "ri-bold", label: "加粗" },
    { cmd: "italic", icon: "ri-italic", label: "斜体" },
    { cmd: "underline", icon: "ri-underline", label: "下划线" },
    { cmd: "strikeThrough", icon: "ri-strikethrough", label: "删除线" },
  ];

  const blocks = [
    { cmd: "formatBlock", val: "h2", icon: "ri-heading", label: "标题" },
    { cmd: "formatBlock", val: "blockquote", icon: "ri-double-quotes-l", label: "引用" },
    { cmd: "insertUnorderedList", icon: "ri-list-unordered", label: "无序列表" },
    { cmd: "insertOrderedList", icon: "ri-list-ordered", label: "有序列表" },
  ];

  return (
    <div className="rounded-md border border-background-200 overflow-hidden focus-within:border-primary-400">
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-background-200 bg-background-50">
        {tools.map((t) => (
          <button
            key={t.cmd}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(t.cmd)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
            aria-label={t.label}
          >
            <i className={t.icon} />
          </button>
        ))}
        <span className="w-px h-5 bg-background-200 mx-1" />
        {blocks.map((t) => (
          <button
            key={t.icon}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(t.cmd, t.val)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
            aria-label={t.label}
          >
            <i className={t.icon} />
          </button>
        ))}
        <span className="w-px h-5 bg-background-200 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("removeFormat")}
          className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
          aria-label="清除格式"
        >
          <i className="ri-format-clear" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        className="rich-editor min-h-[200px] max-h-[360px] overflow-y-auto px-4 py-3 text-sm text-foreground-900 focus:outline-none"
        data-placeholder="写点什么..."
      />
    </div>
  );
}