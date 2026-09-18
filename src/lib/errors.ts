// 统一提取错误信息：兼容标准 Error、字符串、以及后端返回的
// { message, details, hint, code } 之类对象（例如 PostgREST / DOMException）
interface ErrorLike {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
  name?: unknown;
}

// 已知的「瞬时 / 可自愈」错误码 → 更友好的中文提示。
// PostgREST 在重载 schema 缓存等场景会短暂返回这类错误，稍后重试通常即可恢复。
const FRIENDLY_CODES: Record<string, string> = {
  PGRST002: "数据服务正在短暂刷新，请稍后重试",
  PGRST116: "请求超时了，请稍后重试",
};

export function getErrorMessage(err: unknown, fallback = "操作失败，请稍后重试"): string {
  if (err === null || err === undefined) return fallback;

  if (typeof err === "string") {
    return err.trim() || fallback;
  }

  if (typeof err === "object") {
    const e = err as ErrorLike;
    const message = typeof e.message === "string" ? e.message.trim() : "";
    const details = typeof e.details === "string" ? e.details.trim() : "";
    const hint = typeof e.hint === "string" ? e.hint.trim() : "";
    const code = typeof e.code === "string" ? e.code.trim() : "";
    const name = typeof e.name === "string" ? e.name.trim() : "";

    // 已知瞬时错误优先显示友好文案
    if (code && FRIENDLY_CODES[code]) return FRIENDLY_CODES[code];

    const parts = [message, details, hint].filter(Boolean);
    let text = parts.join(" · ");
    if (!text && name) text = name;
    if (code) text = text ? `${text}（${code}）` : `错误代码：${code}`;
    if (text) return text;
  }

  return fallback;
}