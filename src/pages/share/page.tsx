import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getPreviewType, formatSize } from "@/pages/drive/driveUtils";
import { renderMarkdown, extractHeadings } from "@/pages/drive/markdown";
import { highlightCode } from "@/pages/drive/syntaxHighlight";
import Toc from "@/pages/share/components/Toc";

interface ShareMeta {
  name: string;
  mime_type: string | null;
  size: number;
  expires_at: string;
}

const FUNCTION_BASE = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/get-shared-file`;

type LoadState = "loading" | "ready" | "notfound" | "error";

export default function SharePage() {
  const { token = "" } = useParams();

  const [state, setState] = useState<LoadState>("loading");
  const [meta, setMeta] = useState<ShareMeta | null>(null);
  const [text, setText] = useState("");
  const [objectUrl, setObjectUrl] = useState("");
  const [markdownMode, setMarkdownMode] = useState<"preview" | "source">("preview");

  const type = meta ? getPreviewType(meta.mime_type, meta.name) : "none";
  const isTextual = type === "text" || type === "markdown";

  const headings = useMemo(
    () => (type === "markdown" ? extractHeadings(text) : []),
    [type, text]
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      setState("loading");
      setText("");
      setObjectUrl("");
      setMarkdownMode("preview");

      if (!token) {
        if (active) setState("notfound");
        return;
      }

      const { data: share, error } = await supabase
        .from("drive_shares")
        .select("name, mime_type, size, expires_at")
        .eq("token", token)
        .maybeSingle();

      if (error || !share) {
        if (active) setState("notfound");
        return;
      }

      if (new Date(share.expires_at).getTime() < Date.now()) {
        if (active) setState("notfound");
        return;
      }

      if (active) setMeta(share as ShareMeta);

      const fileType = getPreviewType(share.mime_type, share.name);
      const isText = fileType === "text" || fileType === "markdown";

      // 文本类文件：拉取内容后由前端按 UTF-8 解码，确保中文不乱码
      if (isText) {
        try {
          const res = await fetch(`${FUNCTION_BASE}?token=${encodeURIComponent(token)}`, {
            headers: { apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY },
          });
          if (!res.ok) throw new Error("fetch failed");
          const content = await res.text();
          if (active) {
            setText(content);
            setState("ready");
          }
        } catch {
          if (active) setState("error");
        }
        return;
      }

      // 图片 / 音视频 / PDF 等二进制：转为对象 URL 后展示
      try {
        const res = await fetch(`${FUNCTION_BASE}?token=${encodeURIComponent(token)}`, {
          headers: { apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY },
        });
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        if (active) {
          setObjectUrl(URL.createObjectURL(blob));
          setState("ready");
        }
      } catch {
        if (active) setState("error");
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [token]);

  // 卸载时释放对象 URL
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  // 与网盘卡片一致的下载方式：直接跳转到带 attachment 头的下载地址，
  // 由后端 Content-Disposition 强制浏览器下载（带正确的 UTF-8 文件名），而不是打开文件
  const download = () => {
    if (!meta) return;
    const a = document.createElement("a");
    a.href = `${FUNCTION_BASE}?token=${encodeURIComponent(token)}&download=1`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // 源码视图：带行号的原始内容 + 语法高亮（与网盘预览弹窗一致）
  const renderSource = (code: string, lang: string) => {
    const lineCount = code.split("\n").length;
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => String(i + 1)).join("\n");
    return (
      <div className="max-w-3xl mx-auto rounded-lg border border-background-200 bg-background-50 overflow-hidden">
        <div className="flex overflow-auto max-h-[75vh]">
          <pre className="sticky left-0 select-none bg-background-50 border-r border-background-200 px-3 py-4 text-right text-sm leading-relaxed text-foreground-400 font-mono">
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

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-50">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (state === "notfound") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-50 px-4">
        <div className="w-full max-w-md rounded-lg border border-background-200 bg-background-50 p-8 text-center">
          <span className="w-16 h-16 flex items-center justify-center rounded-full bg-background-100 text-foreground-400 mx-auto">
            <i className="ri-file-unknow-line text-3xl" />
          </span>
          <h1 className="mt-5 font-heading font-bold text-lg text-foreground-900">
            分享链接无效或已过期
          </h1>
          <p className="mt-2 text-sm text-foreground-500">
            该链接可能已被删除或超过有效期，请联系分享者重新生成。
          </p>
        </div>
      </div>
    );
  }

  if (state === "error" || !meta) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-50 px-4">
        <div className="w-full max-w-md rounded-lg border border-background-200 bg-background-50 p-8 text-center">
          <span className="w-16 h-16 flex items-center justify-center rounded-full bg-accent-100 text-accent-700 mx-auto">
            <i className="ri-error-warning-line text-3xl" />
          </span>
          <h1 className="mt-5 font-heading font-bold text-lg text-foreground-900">文件加载失败</h1>
          <p className="mt-2 text-sm text-foreground-500">请稍后重试，或联系分享者确认文件是否仍存在。</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50">
      {/* 顶栏 */}
      <header className="sticky top-0 z-10 bg-background-50/90 backdrop-blur border-b border-background-200">
        <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 shrink-0">
              <i className="ri-share-forward-line text-lg" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground-900 truncate" title={meta.name}>
                {meta.name}
              </p>
              <p className="text-xs text-foreground-400">
                {formatSize(meta.size)} · 分享文件
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {type === "markdown" && (
              <div className="flex items-center rounded-md border border-background-200 bg-background-100 p-0.5">
                <button
                  onClick={() => setMarkdownMode("preview")}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    markdownMode === "preview"
                      ? "bg-background-50 text-foreground-950"
                      : "text-foreground-500 hover:text-foreground-800"
                  }`}
                >
                  预览
                </button>
                <button
                  onClick={() => setMarkdownMode("source")}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    markdownMode === "source"
                      ? "bg-background-50 text-foreground-950"
                      : "text-foreground-500 hover:text-foreground-800"
                  }`}
                >
                  源码
                </button>
              </div>
            )}
            <button
              onClick={download}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <i className="ri-download-2-line" />
              下载
            </button>
          </div>
        </div>
      </header>

      {/* 内容区 */}
      <main className="px-4 md:px-6 py-6">
        {isTextual ? (
          type === "markdown" ? (
            markdownMode === "source" ? (
              renderSource(text, "md")
            ) : headings.length > 0 ? (
              <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-start gap-4 lg:gap-6">
                <Toc headings={headings} />
                <div className="flex-1 min-w-0 w-full">
                  <div className="rounded-lg border border-background-200 bg-background-50 p-6 md:p-8">
                    <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto rounded-lg border border-background-200 bg-background-50 p-6 md:p-8">
                <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
              </div>
            )
          ) : (
            <div className="max-w-3xl mx-auto rounded-lg border border-background-200 bg-background-50 overflow-hidden">
              <pre className="p-6 text-sm leading-relaxed text-foreground-800 font-mono overflow-auto whitespace-pre-wrap break-words">
                {text}
              </pre>
            </div>
          )
        ) : type === "image" ? (
          <div className="max-w-3xl mx-auto rounded-lg border border-background-200 bg-background-50 p-3">
            <img src={objectUrl} alt={meta.name} className="w-full rounded-md object-contain" />
          </div>
        ) : type === "pdf" ? (
          <div className="max-w-3xl mx-auto rounded-lg border border-background-200 bg-background-50 overflow-hidden">
            <iframe src={objectUrl} title={meta.name} className="w-full h-[75vh] rounded-md" />
          </div>
        ) : type === "video" ? (
          <div className="max-w-3xl mx-auto rounded-lg border border-background-200 bg-background-50 p-3">
            <video src={objectUrl} controls className="w-full rounded-md" />
          </div>
        ) : type === "audio" ? (
          <div className="max-w-3xl mx-auto rounded-lg border border-background-200 bg-background-50 p-8 text-center">
            <span className="w-20 h-20 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 mx-auto">
              <i className="ri-music-2-line text-4xl" />
            </span>
            <p className="mt-4 text-sm text-foreground-600">{meta.name}</p>
            <audio src={objectUrl} controls className="w-full mt-4" />
          </div>
        ) : (
          <div className="max-w-md mx-auto rounded-lg border border-background-200 bg-background-50 p-8 text-center">
            <span className="w-16 h-16 flex items-center justify-center rounded-full bg-secondary-100 text-secondary-700 mx-auto">
              <i className="ri-file-line text-3xl" />
            </span>
            <p className="mt-4 text-sm text-foreground-600">该文件类型不支持在线预览</p>
            <button
              onClick={download}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-download-2-line" />
              下载文件
            </button>
          </div>
        )}
      </main>
    </div>
  );
}