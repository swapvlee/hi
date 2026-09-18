export interface FileTypeInfo {
  icon: string;
  color: string;
}

// 根据 MIME 类型和扩展名返回文件图标与强调色
export function getFileTypeInfo(mimeType: string | null, name: string): FileTypeInfo {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const mime = mimeType ?? "";

  if (mime.startsWith("image/")) return { icon: "ri-image-line", color: "bg-accent-100 text-accent-600" };
  if (mime.startsWith("video/")) return { icon: "ri-video-line", color: "bg-secondary-100 text-secondary-700" };
  if (mime.startsWith("audio/")) return { icon: "ri-music-2-line", color: "bg-primary-100 text-primary-600" };
  if (mime === "application/pdf" || ext === "pdf") return { icon: "ri-file-pdf-2-line", color: "bg-accent-100 text-accent-600" };
  if (mime.includes("zip") || ["zip", "rar", "7z", "tar", "gz"].includes(ext))
    return { icon: "ri-file-zip-line", color: "bg-secondary-100 text-secondary-700" };
  if (mime.includes("word") || ["doc", "docx"].includes(ext))
    return { icon: "ri-file-word-2-line", color: "bg-primary-100 text-primary-600" };
  if (mime.includes("sheet") || ["xls", "xlsx", "csv"].includes(ext))
    return { icon: "ri-file-excel-2-line", color: "bg-accent-100 text-accent-600" };
  if (mime.includes("presentation") || ["ppt", "pptx"].includes(ext))
    return { icon: "ri-file-ppt-2-line", color: "bg-secondary-100 text-secondary-700" };
  if (mime.startsWith("text/") || ["txt", "md", "json", "js", "ts", "log"].includes(ext))
    return { icon: "ri-file-text-line", color: "bg-primary-100 text-primary-600" };
  return { icon: "ri-file-line", color: "bg-background-100 text-foreground-500" };
}

export type PreviewType = "image" | "pdf" | "video" | "audio" | "text" | "markdown" | "none";

// 可直接以纯文本形式在线查看的代码/文本扩展名
const TEXT_EXTS = [
  "txt", "md", "markdown", "json", "js", "jsx", "ts", "tsx", "css", "scss", "less",
  "html", "htm", "xml", "yml", "yaml", "csv", "tsv", "log", "ini", "conf", "env",
  "sh", "bash", "py", "java", "c", "cpp", "h", "hpp", "go", "rs", "rb", "php",
  "sql", "vue", "svelte", "swift", "kt", "kts", "gradle", "toml", "editorconfig",
  "gitignore", "dockerfile", "makefile", "properties",
];

// 判断文件可在线预览的类型；无法预览返回 "none"
export function getPreviewType(mimeType: string | null, name: string): PreviewType {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const mime = mimeType ?? "";

  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (ext === "md" || ext === "markdown" || mime === "text/markdown" || mime === "text/x-markdown")
    return "markdown";

  const textMime =
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/javascript" ||
    mime === "application/x-javascript" ||
    mime === "application/typescript" ||
    mime === "application/x-yaml" ||
    mime === "application/x-sh";
  if (textMime || TEXT_EXTS.includes(ext)) return "text";

  return "none";
}

// 文本类文件统一使用带 UTF-8 的 content-type，避免浏览器打开中文乱码
export function getContentType(name: string, mimeType: string | null): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const mime = mimeType ?? "";

  const textExts = [
    "md", "markdown", "txt", "json", "js", "jsx", "ts", "tsx", "css", "scss", "less",
    "html", "htm", "xml", "yml", "yaml", "csv", "tsv", "log", "ini", "conf", "env",
    "sh", "bash", "py", "java", "c", "cpp", "h", "hpp", "go", "rs", "rb", "php",
    "sql", "vue", "svelte", "swift", "kt", "kts", "gradle", "toml", "editorconfig",
    "gitignore", "dockerfile", "makefile", "properties",
  ];
  const isTextual =
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/javascript" ||
    mime === "application/x-javascript" ||
    textExts.includes(ext);

  if (isTextual) return "text/plain; charset=utf-8";
  return mime || "application/octet-stream";
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 回收站保留天数：超过后自动彻底删除
export const TRASH_RETENTION_DAYS = 30;

// 计算某项在回收站中还能保留的天数（已过期返回 0）
export function getRemainingDays(deletedAt: string | null): number {
  if (!deletedAt) return TRASH_RETENTION_DAYS;
  const deleted = new Date(deletedAt).getTime();
  const now = Date.now();
  const remaining = TRASH_RETENTION_DAYS - Math.floor((now - deleted) / 86400000);
  return Math.max(0, remaining);
}

// 回收站剩余保留天数的展示文案
export function formatRemainingDays(deletedAt: string | null): string {
  const days = getRemainingDays(deletedAt);
  if (days <= 0) return "即将自动删除";
  if (days === 1) return "剩余 1 天";
  return `剩余 ${days} 天`;
}

// 容量配额（字节）：免费版 100MB，会员版 10GB
export const FREE_QUOTA = 100 * 1024 * 1024;
export const PRO_QUOTA = 10 * 1024 * 1024 * 1024;