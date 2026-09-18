// 轻量 Markdown 渲染器：支持标题、列表、加粗、斜体、删除线、链接、
// 行内代码、代码块、引用、分隔线。输出已做 HTML 转义的安全 HTML。

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 仅放行安全的链接协议，避免 javascript: 等注入
function safeUrl(url: string): string | null {
  const u = url.trim();
  if (/^(https?:\/\/|mailto:)/i.test(u)) {
    return u.replace(/"/g, "%22");
  }
  return null;
}

// 去掉行内 Markdown 标记，得到纯文本（用于目录标题显示）
function stripInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
    .trim();
}

// 渲染行内元素
function renderInline(text: string): string {
  let s = escapeHtml(text);

  // 行内代码（先处理，避免其中的符号被后续规则干扰）
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 加粗
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // 斜体
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/_([^_]+)_/g, "<em>$1</em>");

  // 删除线
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // 链接 [文字](地址)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    const safe = safeUrl(url);
    if (!safe) return `<a>${label}</a>`;
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  return s;
}

const isBlank = (l: string) => l.trim() === "";
const isHeading = (l: string) => /^#{1,6}\s+/.test(l);
const isUL = (l: string) => /^\s*[-*+]\s+/.test(l);
const isOL = (l: string) => /^\s*\d+\.\s+/.test(l);
const isQuote = (l: string) => /^\s*>\s?/.test(l);
const isHR = (l: string) => /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l);
const isCodeFence = (l: string) => /^\s*```/.test(l);

export interface Heading {
  id: string;
  level: number;
  text: string;
}

// 提取文档中的所有标题，用于生成目录大纲（跳过代码块内的 # 行）
export function extractHeadings(md: string): Heading[] {
  const headings: Heading[] = [];
  let inCode = false;
  for (const line of md.split("\n")) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      headings.push({
        id: `heading-${headings.length}`,
        level: m[1].length,
        text: stripInline(m[2]),
      });
    }
  }
  return headings;
}

// 渲染完整的 Markdown 文档为 HTML
export function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;
  let headingIndex = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 代码块
    if (isCodeFence(line)) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !isCodeFence(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // 跳过结束围栏
      const code = escapeHtml(codeLines.join("\n"));
      out.push(`<pre class="md-code"><code>${code}</code></pre>`);
      continue;
    }

    if (isBlank(line)) {
      i++;
      continue;
    }

    // 分隔线
    if (isHR(line)) {
      out.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    // 标题
    if (isHeading(line)) {
      const m = line.match(/^(#{1,6})\s+(.*)$/);
      if (m) {
        const level = m[1].length;
        out.push(
          `<h${level} id="heading-${headingIndex}" class="md-h${level}">${renderInline(m[2])}</h${level}>`
        );
        headingIndex++;
      }
      i++;
      continue;
    }

    // 无序列表
    if (isUL(line)) {
      out.push('<ul class="md-ul">');
      while (i < lines.length && isUL(lines[i])) {
        out.push(`<li>${renderInline(lines[i].replace(/^\s*[-*+]\s+/, ""))}</li>`);
        i++;
      }
      out.push("</ul>");
      continue;
    }

    // 有序列表
    if (isOL(line)) {
      out.push('<ol class="md-ol">');
      while (i < lines.length && isOL(lines[i])) {
        out.push(`<li>${renderInline(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push("</ol>");
      continue;
    }

    // 引用
    if (isQuote(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && isQuote(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push(
        `<blockquote class="md-quote"><p>${quoteLines.map(renderInline).join("<br/>")}</p></blockquote>`
      );
      continue;
    }

    // 段落（连续的普通行合并为一个段落）
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !isHeading(lines[i]) &&
      !isUL(lines[i]) &&
      !isOL(lines[i]) &&
      !isQuote(lines[i]) &&
      !isHR(lines[i]) &&
      !isCodeFence(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    out.push(`<p>${renderInline(paraLines.join(" "))}</p>`);
  }

  return out.join("\n");
}