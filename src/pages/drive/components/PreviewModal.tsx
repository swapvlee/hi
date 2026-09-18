import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getPreviewType } from "@/pages/drive/driveUtils";
import { highlightCode } from "@/pages/drive/syntaxHighlight";
import { renderMarkdown } from "@/pages/drive/markdown";

interface PreviewFile {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size: number;
}

interface PreviewModalProps {
  file: PreviewFile;
  files: PreviewFile[];
  onNavigate: (file: PreviewFile) => void;
  onClose: () => void;
}

// 超过该大小的文本文件直接提示下载，避免在线读取卡顿
const TEXT_PREVIEW_LIMIT = 2 * 1024 * 1024;

export default function PreviewModal({ file, files, onNavigate, onClose }: PreviewModalProps) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markdownMode, setMarkdownMode] = useState<"preview" | "source">("preview");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const type = getPreviewType(file.mime_type, file.name);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isMedia = type === "video" || type === "audio";
  const isTextual = type === "text" || type === "markdown";

  const index = files.findIndex((f) => f.id === file.id);
  const prevFile = index > 0 ? files[index - 1] : null;
  const nextFile = index >= 0 && index < files.length - 1 ? files[index + 1] : null;

  // 全屏 / 非全屏下的内容区高度
  const bodyH = isFullscreen ? "h-full" : "max-h-[75vh]";
  const mediaH = isFullscreen ? "max-h-full" : "max-h-[75vh]";
  const pdfH = isFullscreen ? "h-full" : "h-[75vh]";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setText("");
    setUrl("");
    setMarkdownMode("preview");

    supabase.storage
      .from("private")
      .createSignedUrl(file.storage_path, 3600)
      .then(async ({ data }) => {
        if (!active) return;
        if (!data?.signedUrl) {
          setError("预览失败，请稍后重试");
          return;
        }
        setUrl(data.signedUrl);

        // 文本/代码/Markdown 需要拉取内容后展示
        if (isTextual) {
          if (file.size > TEXT_PREVIEW_LIMIT) {
            setError("文件较大，请下载后查看");
            return;
          }
          try {
            const res = await fetch(data.signedUrl);
            if (!res.ok) throw new Error("fetch failed");
            const content = await res.text();
            if (active) setText(content);
          } catch {
            if (active) setError("文本内容读取失败，请下载后查看");
          }
        }
      })
      .catch(() => {
        if (active) setError("预览失败，请稍后重试");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [file.storage_path, file.size, isTextual]);

  // 键盘操作：左右切换、Esc 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && prevFile) onNavigate(prevFile);
      else if (e.key === "ArrowRight" && nextFile) onNavigate(nextFile);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevFile, nextFile, onNavigate, onClose]);

  const download = async () => {
    const { data } = await supabase.storage
      .from("private")
      .createSignedUrl(file.storage_path, 3600, { download: file.name });
    if (!data?.signedUrl) return;
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const openInNewTab = () => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  // 带行号的代码/文本渲染（语法高亮）
  const renderCodeBody = (code: string, lang: string) => {
    const lineCount = code.split("\n").length;
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => String(i + 1)).join("\n");
    return (
      <div className={`w-full ${bodyH} overflow-auto rounded-lg bg-background-50`}>
        <div className="flex min-w-max">
          <pre className="sticky left-0 z-10 select-none bg-background-50 border-r border-background-200 px-3 py-4 text-right text-sm leading-relaxed text-foreground-400 font-mono">
            {lineNumbers}
          </pre>
          <pre
            className="flex-1 px-4 py-4 text-sm leading-relaxed text-foreground-800 font-mono"
            dangerouslySetInnerHTML={{ __html: highlightCode(code, lang) }}
          />
        </div>
      </div>
    );
  };

  const renderBody = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-background-50/30 border-t-background-50 rounded-full animate-spin" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-lg bg-background-50 py-16 px-6 text-center">
          <p className="text-sm text-foreground-500">{error}</p>
          <button
            onClick={download}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-download-2-line" />
            下载文件
          </button>
        </div>
      );
    }

    switch (type) {
      case "image":
        return (
          <img
            src={url}
            alt={file.name}
            className={`w-full ${mediaH} object-contain rounded-lg bg-background-950/40`}
          />
        );
      case "pdf":
        return (
          <iframe
            src={url}
            title={file.name}
            className={`w-full ${pdfH} rounded-lg bg-background-50`}
          />
        );
      case "video":
        return (
          <video
            src={url}
            controls
            className={`w-full ${mediaH} rounded-lg bg-background-950/40`}
          />
        );
      case "audio":
        return (
          <div className="rounded-lg bg-background-50 p-8">
            <div className="flex items-center justify-center mb-6">
              <span className="w-20 h-20 flex items-center justify-center rounded-full bg-primary-100 text-primary-600">
                <i className="ri-music-2-line text-4xl" />
              </span>
            </div>
            <audio src={url} controls className="w-full" />
          </div>
        );
      case "markdown":
        if (markdownMode === "source") {
          return renderCodeBody(text, "md");
        }
        return (
          <div className={`w-full ${bodyH} overflow-auto rounded-lg bg-background-50 p-6`}>
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
            />
          </div>
        );
      case "text":
        return renderCodeBody(text, ext);
      default:
        return (
          <div className="rounded-lg bg-background-50 py-16 px-6 text-center">
            <p className="text-sm text-foreground-500">该类型暂不支持在线预览</p>
            <button
              onClick={download}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-download-2-line" />
              下载文件
            </button>
          </div>
        );
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-foreground-950/70 px-4 ${
        isFullscreen ? "py-4" : ""
      }`}
      onClick={onClose}
    >
      <div
        className={`${isFullscreen ? "w-full h-full flex flex-col" : "w-full max-w-4xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={() => prevFile && onNavigate(prevFile)}
              disabled={!prevFile}
              className="w-8 h-8 flex items-center justify-center rounded-md text-background-50/80 hover:bg-background-50/10 disabled:opacity-30 disabled:cursor-default transition-colors cursor-pointer shrink-0"
              aria-label="上一个文件"
              title="上一个文件"
            >
              <i className="ri-arrow-left-s-line text-xl" />
            </button>
            <button
              onClick={() => nextFile && onNavigate(nextFile)}
              disabled={!nextFile}
              className="w-8 h-8 flex items-center justify-center rounded-md text-background-50/80 hover:bg-background-50/10 disabled:opacity-30 disabled:cursor-default transition-colors cursor-pointer shrink-0"
              aria-label="下一个文件"
              title="下一个文件"
            >
              <i className="ri-arrow-right-s-line text-xl" />
            </button>
            <p className="text-sm text-background-50 truncate pl-2" title={file.name}>
              {file.name}
            </p>
            {files.length > 1 && (
              <span className="shrink-0 text-xs text-background-50/50 whitespace-nowrap pl-2">
                {index + 1} / {files.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {type === "markdown" && (
              <div className="flex items-center rounded-md bg-background-50/10 p-0.5 mr-1">
                <button
                  onClick={() => setMarkdownMode("preview")}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    markdownMode === "preview"
                      ? "bg-background-50 text-foreground-950"
                      : "text-background-50/70 hover:text-background-50"
                  }`}
                >
                  预览
                </button>
                <button
                  onClick={() => setMarkdownMode("source")}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    markdownMode === "source"
                      ? "bg-background-50 text-foreground-950"
                      : "text-background-50/70 hover:text-background-50"
                  }`}
                >
                  源码
                </button>
              </div>
            )}
            {isMedia && (
              <button
                onClick={openInNewTab}
                className="w-9 h-9 flex items-center justify-center rounded-md text-background-50/80 hover:bg-background-50/10 transition-colors cursor-pointer"
                aria-label="在新标签打开"
                title="在新标签打开"
              >
                <i className="ri-external-link-line text-xl" />
              </button>
            )}
            <button
              onClick={() => setIsFullscreen((v) => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-md text-background-50/80 hover:bg-background-50/10 transition-colors cursor-pointer"
              aria-label={isFullscreen ? "退出全屏" : "全屏"}
              title={isFullscreen ? "退出全屏" : "全屏"}
            >
              <i className={`${isFullscreen ? "ri-fullscreen-exit-line" : "ri-fullscreen-line"} text-xl`} />
            </button>
            <button
              onClick={download}
              className="w-9 h-9 flex items-center justify-center rounded-md text-background-50/80 hover:bg-background-50/10 transition-colors cursor-pointer"
              aria-label="下载"
              title="下载"
            >
              <i className="ri-download-2-line text-xl" />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-md text-background-50/80 hover:bg-background-50/10 transition-colors cursor-pointer"
              aria-label="关闭预览"
              title="关闭"
            >
              <i className="ri-close-line text-xl" />
            </button>
          </div>
        </div>
        <div className={isFullscreen ? "flex-1 min-h-0" : ""}>{renderBody()}</div>
      </div>
    </div>
  );
}