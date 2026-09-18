import { useState } from "react";
import type { Heading } from "@/pages/drive/markdown";

interface TocProps {
  headings: Heading[];
}

export default function Toc({ headings }: TocProps) {
  const [open, setOpen] = useState(false);

  if (headings.length === 0) return null;

  return (
    <>
      {/* 桌面端：左侧粘性目录侧边栏 */}
      <aside className="hidden lg:block w-60 shrink-0">
        <nav className="sticky top-16 rounded-lg border border-background-200 bg-background-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-background-200 flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center text-primary-600">
              <i className="ri-list-unordered text-base" />
            </span>
            <span className="text-sm font-semibold text-foreground-800">目录</span>
          </div>
          <ul className="max-h-[70vh] overflow-auto py-2">
            {headings.map((h) => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  className="block py-1.5 pr-4 text-sm text-foreground-600 hover:text-primary-600 hover:bg-background-100 transition-colors truncate"
                  style={{ paddingLeft: `${12 + (h.level - 1) * 14}px` }}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* 移动端：折叠目录按钮 */}
      <div className="lg:hidden w-full">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-2 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className={open ? "ri-arrow-up-s-line text-base" : "ri-arrow-down-s-line text-base"} />
          </span>
          目录
          <span className="text-xs text-foreground-400">{headings.length} 个章节</span>
        </button>
        {open && (
          <ul className="mt-2 rounded-lg border border-background-200 bg-background-50 py-2 max-h-64 overflow-auto">
            {headings.map((h) => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  onClick={() => setOpen(false)}
                  className="block py-1.5 pr-4 text-sm text-foreground-600 hover:text-primary-600 hover:bg-background-100 transition-colors truncate"
                  style={{ paddingLeft: `${12 + (h.level - 1) * 14}px` }}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}