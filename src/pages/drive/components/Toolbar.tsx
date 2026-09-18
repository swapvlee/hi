import { sortOptions } from "@/pages/drive/types";
import type { DriveApi } from "@/pages/drive/useDrive";

export function Toolbar({ drive }: { drive: DriveApi }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      {/* 面包屑 */}
      <nav className="flex items-center gap-1 flex-wrap text-sm">
        <button
          onClick={() => drive.setStack([])}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            drive.stack.length === 0
              ? "font-medium text-foreground-900 bg-background-100"
              : "text-foreground-500 hover:bg-background-100"
          }`}
        >
          <i className="ri-hard-drive-2-line" />
          全部文件
        </button>
        {drive.stack.map((item, idx) => (
          <span key={item.id} className="flex items-center gap-1">
            <i className="ri-arrow-right-s-line text-foreground-300" />
            <button
              onClick={() => drive.goToIndex(idx)}
              className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                idx === drive.stack.length - 1
                  ? "font-medium text-foreground-900 bg-background-100"
                  : "text-foreground-500 hover:bg-background-100"
              }`}
            >
              {item.name}
            </button>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2 flex-wrap">
        {/* 视图切换 */}
        <div className="flex items-center rounded-md border border-background-200 bg-background-50 p-0.5">
          <button
            onClick={() => drive.setView("grid")}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
              drive.view === "grid" ? "bg-background-100 text-foreground-900" : "text-foreground-400"
            }`}
            aria-label="网格视图"
          >
            <i className="ri-layout-grid-line" />
          </button>
          <button
            onClick={() => drive.setView("list")}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
              drive.view === "list" ? "bg-background-100 text-foreground-900" : "text-foreground-400"
            }`}
            aria-label="列表视图"
          >
            <i className="ri-list-check-2" />
          </button>
        </div>

        {/* 排序 */}
        <div className="relative">
          <button
            onClick={() => drive.setSortMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-md border border-background-200 text-sm text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-sort-desc" />
            {sortOptions.find((o) => o.key === drive.sortBy)?.label}
            <i className={drive.sortDir === "asc" ? "ri-arrow-up-s-line text-foreground-400" : "ri-arrow-down-s-line text-foreground-400"} />
          </button>
          {drive.sortMenuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => drive.setSortMenuOpen(false)} />
              <div className="absolute z-30 right-0 mt-1 w-36 rounded-lg bg-background-50 border border-background-200 py-1">
                {sortOptions.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => {
                      if (drive.sortBy === o.key) drive.setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      else drive.setSortBy(o.key);
                      drive.setSortMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer"
                  >
                    <span>{o.label}</span>
                    {drive.sortBy === o.key && (
                      <i className={drive.sortDir === "asc" ? "ri-arrow-up-line text-primary-600" : "ri-arrow-down-line text-primary-600"} />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => drive.setShowTrash(true)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-md border border-background-200 text-sm text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-delete-bin-6-line" />
          回收站
        </button>
        <button
          onClick={() => drive.setNewFolderOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-md border border-background-200 text-sm text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-folder-add-line" />
          新建文件夹
        </button>
        <button
          onClick={() => drive.fileInputRef.current?.click()}
          disabled={drive.uploading}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
        >
          {drive.uploading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-background-50 border-t-transparent rounded-full animate-spin" />
              上传中...
            </>
          ) : (
            <>
              <i className="ri-upload-2-line" />
              上传文件
            </>
          )}
        </button>
        <input
          ref={drive.fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) drive.handleUpload(e.target.files);
          }}
        />
      </div>
    </div>
  );
}

export function TrashToolbar({ drive }: { drive: DriveApi }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        onClick={() => drive.setShowTrash(false)}
        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-md border border-background-200 text-sm text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
      >
        <i className="ri-arrow-left-line" />
        返回网盘
      </button>
      <button
        onClick={drive.emptyTrash}
        disabled={drive.trashCount === 0}
        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-md border border-accent-300 text-accent-700 text-sm font-medium hover:bg-accent-100 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
      >
        <i className="ri-delete-bin-6-line" />
        清空回收站
      </button>
    </div>
  );
}

export function SearchToolbar({ drive }: { drive: DriveApi }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground-500">
        搜索结果
        {drive.searching
          ? "…"
          : `（${(drive.searchResults?.folders.length ?? 0) + (drive.searchResults?.files.length ?? 0)} 项）`}
      </span>
    </div>
  );
}