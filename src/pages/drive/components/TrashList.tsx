import EmptyState from "@/components/base/EmptyState";
import {
  getFileTypeInfo,
  formatSize,
  formatDate,
  formatRemainingDays,
  getRemainingDays,
} from "@/pages/drive/driveUtils";
import type { DriveApi } from "@/pages/drive/useDrive";

export function TrashList({ drive }: { drive: DriveApi }) {
  return (
    <div className="rounded-lg border border-background-200">
      {drive.trashLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : drive.trashCount === 0 ? (
        <div className="py-6">
          <EmptyState
            icon="ri-delete-bin-6-line"
            accent="bg-secondary-100 text-secondary-700"
            title="回收站是空的"
            description="删除的文件会出现在这里，方便你随时恢复"
          />
        </div>
      ) : (
        <div className="divide-y divide-background-200">
          {drive.topTrashFolders.map((folder) => (
            <div key={folder.id} className="flex items-center gap-3 px-4 py-3 hover:bg-background-100 transition-colors">
              <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 shrink-0">
                <i className="ri-folder-3-line text-xl" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground-900 truncate">{folder.name}</p>
                <p className="text-xs text-foreground-400 mt-0.5">文件夹 · 删除于 {formatDate(folder.deleted_at ?? "")}</p>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    getRemainingDays(folder.deleted_at) <= 3
                      ? "bg-accent-100 text-accent-700"
                      : "bg-background-100 text-foreground-500"
                  }`}
                >
                  {formatRemainingDays(folder.deleted_at)}
                </span>
                <button
                  onClick={() => drive.restoreItem({ type: "folder", item: folder })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-primary-600 hover:bg-primary-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-refresh-line" />
                  恢复
                </button>
                <button
                  onClick={() => drive.permanentDelete({ type: "folder", item: folder })}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-accent-100 hover:text-accent-700 transition-colors cursor-pointer"
                  aria-label="彻底删除"
                >
                  <i className="ri-delete-bin-line" />
                </button>
              </div>
            </div>
          ))}

          {drive.topTrashFiles.map((file) => {
            const info = getFileTypeInfo(file.mime_type, file.name);
            return (
              <div key={file.id} className="flex items-center gap-3 px-4 py-3 hover:bg-background-100 transition-colors">
                <span className={`w-10 h-10 flex items-center justify-center rounded-lg ${info.color} shrink-0`}>
                  <i className={`${info.icon} text-xl`} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground-900 truncate">{file.name}</p>
                  <p className="text-xs text-foreground-400 mt-0.5">
                    {formatSize(file.size)} · 删除于 {formatDate(file.deleted_at ?? "")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      getRemainingDays(file.deleted_at) <= 3
                        ? "bg-accent-100 text-accent-700"
                        : "bg-background-100 text-foreground-500"
                    }`}
                  >
                    {formatRemainingDays(file.deleted_at)}
                  </span>
                  <button
                    onClick={() => drive.restoreItem({ type: "file", item: file })}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-primary-600 hover:bg-primary-100 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-refresh-line" />
                    恢复
                  </button>
                  <button
                    onClick={() => drive.permanentDelete({ type: "file", item: file })}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-accent-100 hover:text-accent-700 transition-colors cursor-pointer"
                    aria-label="彻底删除"
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}