// 轻量语法高亮：对关键字、字符串、注释、数字上色
// 返回已做 HTML 转义的、含 <span> 的 HTML 字符串，可直接用 dangerouslySetInnerHTML 渲染

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Style = "c" | "hash" | "sql" | "html" | "css";

// 扩展名 -> 高亮风格
const STYLE_BY_EXT: Record<string, Style> = {
  js: "c", jsx: "c", ts: "c", tsx: "c", mjs: "c", cjs: "c",
  c: "c", h: "c", cpp: "c", hpp: "c", cc: "c", java: "c", cs: "c",
  go: "c", rs: "c", swift: "c", kt: "c", kts: "c", php: "c",
  py: "hash", sh: "hash", bash: "hash", rb: "hash",
  sql: "sql",
  html: "html", htm: "html", xml: "html",
  css: "css", scss: "css", less: "css",
};

// 类 C 语言关键字（含 JS/TS、C/C++、Java 等，取并集，多余关键字无副作用）
const C_KEYWORDS = [
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "do",
  "switch", "case", "break", "continue", "new", "class", "extends", "super", "this",
  "import", "export", "from", "default", "try", "catch", "finally", "throw", "async",
  "await", "typeof", "instanceof", "in", "of", "null", "undefined", "true", "false",
  "delete", "void", "yield", "static", "get", "set", "interface", "type", "enum",
  "implements", "namespace", "abstract", "readonly", "public", "private", "protected",
  "int", "long", "short", "byte", "float", "double", "char", "boolean", "unsigned",
  "signed", "typedef", "sizeof", "struct", "final", "synchronized", "volatile",
  "transient", "native",
];

const HASH_KEYWORDS = [
  "def", "return", "if", "elif", "else", "for", "while", "break", "continue", "pass",
  "import", "from", "as", "class", "try", "except", "finally", "raise", "with",
  "lambda", "yield", "global", "nonlocal", "assert", "del", "in", "is", "not", "and",
  "or", "None", "True", "False", "self",
];

const SQL_KEYWORDS = [
  "select", "from", "where", "insert", "into", "values", "update", "set", "delete",
  "create", "table", "alter", "drop", "join", "left", "right", "inner", "outer",
  "full", "on", "group", "by", "order", "having", "limit", "offset", "and", "or",
  "not", "null", "as", "count", "sum", "avg", "min", "max", "distinct", "union",
  "all", "case", "when", "then", "else", "end", "between", "like", "in", "exists",
];

const KEYWORDS: Record<Style, string[]> = {
  c: C_KEYWORDS,
  hash: HASH_KEYWORDS,
  sql: SQL_KEYWORDS,
  html: [],
  css: [],
};

function buildRegex(style: Style): RegExp {
  const parts: string[] = [];

  // 注释（块注释 + 行注释，按语言风格）
  if (style === "c" || style === "sql" || style === "css") parts.push("\\/\\*[\\s\\S]*?\\*\\/");
  if (style === "c") parts.push("\\/\\/[^\\n]*");
  if (style === "hash") parts.push("#[^\\n]*");
  if (style === "sql") parts.push("--[^\\n]*");
  if (style === "html") parts.push("<!--[\\s\\S]*?-->");

  // 字符串（单引号 / 双引号 / 反引号）
  parts.push("\"(?:\\\\.|[^\"\\\\\\n])*\"");
  parts.push("'(?:\\\\.|[^'\\\\\\n])*'");
  parts.push("`(?:\\\\.|[^`\\\\])*`");

  // 数字
  parts.push("\\b\\d+(?:\\.\\d+)?\\b");

  // 关键字
  const kws = KEYWORDS[style];
  if (kws.length > 0) parts.push("\\b(?:" + kws.join("|") + ")\\b");

  return new RegExp("(" + parts.join("|") + ")", "g");
}

type TokenType = "comment" | "string" | "number" | "keyword";

function classify(m: string): TokenType {
  if (
    m.startsWith("/*") ||
    m.startsWith("//") ||
    m.startsWith("#") ||
    m.startsWith("--") ||
    m.startsWith("<!--")
  ) {
    return "comment";
  }
  if (m.startsWith('"') || m.startsWith("'") || m.startsWith("`")) return "string";
  const c = m.charCodeAt(0);
  if (c >= 48 && c <= 57) return "number";
  return "keyword";
}

// 返回可直接用 dangerouslySetInnerHTML 渲染的高亮 HTML（已做 HTML 转义，无 XSS 风险）
export function highlightCode(code: string, ext: string): string {
  const escaped = escapeHtml(code);
  const style = STYLE_BY_EXT[ext];
  if (!style) return escaped;

  const re = buildRegex(style);
  return escaped.replace(re, (m) => `<span class="syntax-${classify(m)}">${m}</span>`);
}